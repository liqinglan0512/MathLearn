import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  EuclidRepository,
  EuclidRepositoryError,
  parseEuclidEntryId,
  type EuclidFetcher,
} from '../src/lib/euclid-repository'

const CONTENT_BASE_URL = 'https://mathforge.test/content/euclid/'
const CONTENT_ROOT = new URL('../public/content/euclid/', import.meta.url)

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : String(input)
}

function createFileFetcher(requests: string[]): EuclidFetcher {
  return async (input) => {
    const url = requestUrl(input)
    requests.push(url)
    const pathname = new URL(url).pathname
    const prefix = '/content/euclid/'
    if (!pathname.startsWith(prefix)) return new Response(null, { status: 404 })

    try {
      const body = await readFile(new URL(pathname.slice(prefix.length), CONTENT_ROOT), 'utf8')
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  }
}

function expectRepositoryError(error: unknown, code: EuclidRepositoryError['code']): boolean {
  expect(error).toBeInstanceOf(EuclidRepositoryError)
  expect((error as EuclidRepositoryError).code).toBe(code)
  return true
}

describe('EuclidRepository path confinement and lazy loading', () => {
  it('accepts canonical IDs and rejects traversal, malformed and out-of-range IDs before fetching', () => {
    expect(parseEuclidEntryId('euclid-1-47')).toMatchObject({ book: 1, kind: 'proposition', number: 47 })
    expect(parseEuclidEntryId('euclid-6-def-5')).toMatchObject({ book: 6, kind: 'definition', number: 5 })

    for (const invalid of [
      '../catalog.json',
      'euclid-01-47',
      'euclid-14-1',
      'euclid-1-0',
      'euclid-1-47.json',
      'euclid-1-47?draft=1',
      'euclid-1/../../catalog',
    ]) {
      expect(() => parseEuclidEntryId(invalid)).toThrow(EuclidRepositoryError)
    }

    const repository = new EuclidRepository(CONTENT_BASE_URL, async () => {
      throw new Error('fetch should not run')
    })
    expect(() => repository.loadBookIndex(0)).toThrow(EuclidRepositoryError)
    expect(() => repository.loadBookIndex(14)).toThrow(EuclidRepositoryError)
    expect(() => repository.loadEntry('../catalog.json')).toThrow(EuclidRepositoryError)
  })

  it('loads only the requested catalog, book index and entry resources', async () => {
    const requests: string[] = []
    const repository = new EuclidRepository(CONTENT_BASE_URL, createFileFetcher(requests))

    const catalog = await repository.loadCatalog()
    expect(requests).toEqual([`${CONTENT_BASE_URL}catalog.json`])
    expect(catalog.counts.entries).toBe(607)

    const book = await repository.loadBookIndex(1)
    expect(requests).toEqual([
      `${CONTENT_BASE_URL}catalog.json`,
      `${CONTENT_BASE_URL}books/01.index.json`,
    ])
    expect(book.entries).toHaveLength(81)
    expect(JSON.stringify(book)).not.toContain('Heath source')

    const entry = await repository.loadEntry('euclid-1-47')
    expect(requests).toEqual([
      `${CONTENT_BASE_URL}catalog.json`,
      `${CONTENT_BASE_URL}books/01.index.json`,
      `${CONTENT_BASE_URL}entries/euclid-1-47.json`,
    ])
    expect(entry.status).toBe('raw_machine')
    expect(entry.outgoingEdges).toHaveLength(5)
    expect(entry.visualization.level).toBe('proposition_specific')
  })

  it('memoizes successful requests and evicts failed requests for retry', async () => {
    const requests: string[] = []
    const fileFetcher = createFileFetcher(requests)
    let failOnce = true
    const fetcher: EuclidFetcher = async (input, init) => {
      if (failOnce) {
        failOnce = false
        return new Response(null, { status: 503 })
      }
      return fileFetcher(input, init)
    }
    const repository = new EuclidRepository(CONTENT_BASE_URL, fetcher)

    await expect(repository.loadCatalog()).rejects.toSatisfy(
      (error: unknown) => expectRepositoryError(error, 'http_error'),
    )
    const first = await repository.loadCatalog()
    const second = await repository.loadCatalog()
    expect(first).toBe(second)
    expect(requests).toEqual([`${CONTENT_BASE_URL}catalog.json`])
  })
})

describe('EuclidRepository runtime trust checks', () => {
  it('preserves disclosed source anomalies rather than normalizing them away', async () => {
    const repository = new EuclidRepository(CONTENT_BASE_URL, createFileFetcher([]))

    const missingSource = await repository.loadEntry('euclid-6-def-5')
    expect(missingSource.status).toBe('raw_machine')
    expect(missingSource.contentItem.sourceMissing).toBe(true)
    expect(missingSource.visualization.level).toBe('none')
    expect(missingSource.sourceIssues.map((issue) => issue.code)).toContain('upstream_source_missing')

    const selfReference = await repository.loadEntry('euclid-10-28')
    expect(selfReference.outgoingEdges.some((edge) => edge.targetContentId === 'euclid-10-28')).toBe(true)
    expect(selfReference.sourceIssues.map((issue) => issue.code)).toContain('self_reference_or_intra_entry_lemma')
    expect(selfReference.visualization.level).toBe('concept_illustration')
  })

  it('rejects invalid editorial status and mismatched requested-entry metadata', async () => {
    const raw = JSON.parse(await readFile(new URL('entries/euclid-1-47.json', CONTENT_ROOT), 'utf8')) as Record<string, unknown>
    const invalidStatusFetcher: EuclidFetcher = async () => new Response(
      JSON.stringify({ ...raw, status: 'complete' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
    const invalidStatusRepository = new EuclidRepository(CONTENT_BASE_URL, invalidStatusFetcher)
    await expect(invalidStatusRepository.loadEntry('euclid-1-47')).rejects.toSatisfy(
      (error: unknown) => expectRepositoryError(error, 'invalid_payload'),
    )

    const mismatchedFetcher: EuclidFetcher = async () => new Response(
      JSON.stringify(raw),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
    const mismatchedRepository = new EuclidRepository(CONTENT_BASE_URL, mismatchedFetcher)
    await expect(mismatchedRepository.loadEntry('euclid-1-46')).rejects.toSatisfy(
      (error: unknown) => expectRepositoryError(error, 'invalid_payload'),
    )
  })
})
