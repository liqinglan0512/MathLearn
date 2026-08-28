import { readFile, readdir, stat } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { FEATURES } from '../src/config/features'

const CONTENT_ROOT = new URL('../public/content/euclid/', import.meta.url)

describe('Euclid archive preservation policy', () => {
  it('keeps the public switch off without removing the recoverable archive', async () => {
    expect(FEATURES.euclidPublic).toBe(false)

    const [entryNames, bookNames, catalogText] = await Promise.all([
      readdir(new URL('entries/', CONTENT_ROOT)),
      readdir(new URL('books/', CONTENT_ROOT)),
      readFile(new URL('catalog.json', CONTENT_ROOT), 'utf8'),
    ])
    const entries = entryNames.filter((name) => name.endsWith('.json'))
    const books = bookNames.filter((name) => name.endsWith('.index.json'))
    const catalog = JSON.parse(catalogText) as {
      counts: { entries: number; semanticBlocks: number }
      books: unknown[]
    }

    expect(entries).toHaveLength(607)
    expect(books).toHaveLength(13)
    expect(1 + entries.length + books.length).toBe(621)
    expect(catalog.counts.entries).toBe(607)
    expect(catalog.counts.semanticBlocks).toBe(7152)
    expect(catalog.books).toHaveLength(13)
  })

  it('retains both canonical source corpora for a future explicit restoration', async () => {
    const [source, modern] = await Promise.all([
      stat(new URL('../src/lib/euclid-data.json', import.meta.url)),
      stat(new URL('../src/lib/euclid-modern-zh.json', import.meta.url)),
    ])
    expect(source.isFile()).toBe(true)
    expect(modern.isFile()).toBe(true)
    expect(source.size).toBeGreaterThan(1_000_000)
    expect(modern.size).toBeGreaterThan(1_000_000)
  })

  it('does not couple a future Euclid restoration to local discussion features', async () => {
    const detail = await readFile(new URL('../src/pages/EuclidArticleDetail.tsx', import.meta.url), 'utf8')
    expect(detail).toMatch(/localDiscussionEnabled\s*=\s*FEATURES\.localDiscussionPrototype/)
    expect(detail).toMatch(/localDiscussionEnabled\s*\?\s*\(\s*<PassageAnnotations/)
    expect(detail).toMatch(/localDiscussionEnabled\s*&&\s*\(\s*<section[\s\S]*?<CommentThread/)
  })
})
