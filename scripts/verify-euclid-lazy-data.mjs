import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const SOURCE_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-data.json')
const MODERN_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-modern-zh.json')
const RENDERER_MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-renderer-manifest.json')
const OUTPUT_ROOT = path.join(REPO_ROOT, 'public', 'content', 'euclid')
const ENTRY_ROOT = path.join(OUTPUT_ROOT, 'entries')
const BOOK_ROOT = path.join(OUTPUT_ROOT, 'books')
const ENTRY_ID = /^euclid-(?:[1-9]|1[0-3])-(?:(?:def|post|cn)-)?[1-9]\d*$/

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function paragraphs(value) {
  return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function surface(block, role) {
  return block.surfaces.find((item) => item.role === role)
}

function stable(value) {
  return JSON.stringify(value)
}

async function totalBytes(files) {
  let raw = 0
  let gzip = 0
  let largest = { file: '', bytes: 0 }
  for (const file of files) {
    const data = await readFile(file)
    raw += data.byteLength
    gzip += gzipSync(data, { level: 9 }).byteLength
    if (data.byteLength > largest.bytes) largest = { file: path.basename(file), bytes: data.byteLength }
  }
  return { raw, gzip, largest }
}

async function main() {
  const [sourceText, modernText, rendererManifestText, catalog] = await Promise.all([
    readFile(SOURCE_PATH, 'utf8'),
    readFile(MODERN_PATH, 'utf8'),
    readFile(RENDERER_MANIFEST_PATH, 'utf8'),
    json(path.join(OUTPUT_ROOT, 'catalog.json')),
  ])
  const corpus = JSON.parse(sourceText)
  const modern = JSON.parse(modernText)
  const rendererManifest = JSON.parse(rendererManifestText)
  invariant(rendererManifest.schemaVersion === 1 && Array.isArray(rendererManifest.renderers), 'Renderer manifest schema is invalid')
  const rendererById = new Map(rendererManifest.renderers.map((renderer) => [renderer.id, renderer]))
  invariant(rendererById.size === rendererManifest.renderers.length, 'Renderer manifest contains duplicate ids')
  invariant(new Set(rendererManifest.renderers.map((renderer) => renderer.revision)).size === rendererManifest.renderers.length,
    'Renderer manifest contains duplicate revisions')
  const specific = new Set(rendererManifest.renderers
    .filter((renderer) => renderer.scope === 'proposition_specific')
    .map((renderer) => renderer.id))
  invariant(catalog.schemaVersion === 1, 'Catalog schema version must be 1')
  invariant(catalog.status === 'raw_machine', 'Catalog must be raw_machine')
  invariant(catalog.translationPipeline.editorialStatus === 'raw_machine', 'Pipeline editorial status must be raw_machine')
  invariant(/not mathematical review/i.test(catalog.translationPipeline.statusMeaning), 'Pipeline status disclaimer is missing')
  invariant(catalog.source.sha256 === corpus.source.sha256, 'Catalog source hash does not match canonical corpus metadata')
  invariant(catalog.books.length === 13, 'Catalog must contain 13 books')

  const entryFiles = (await readdir(ENTRY_ROOT))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(ENTRY_ROOT, name))
  const bookFiles = (await readdir(BOOK_ROOT))
    .filter((name) => name.endsWith('.index.json'))
    .sort()
    .map((name) => path.join(BOOK_ROOT, name))
  invariant(entryFiles.length === 607, `Expected 607 entry files, found ${entryFiles.length}`)
  invariant(bookFiles.length === 13, `Expected 13 book indexes, found ${bookFiles.length}`)

  const sourceById = new Map(corpus.entries.map((entry) => [entry.id, entry]))
  const generatedById = new Map()
  const outgoingById = new Map()
  const incomingByTarget = new Map()
  const levels = { none: 0, concept_illustration: 0, proposition_specific: 0, verified: 0 }
  let blockCount = 0
  let edgeCount = 0
  let sourceIssueCount = 0

  for (const file of entryFiles) {
    const payload = await json(file)
    const id = payload.contentItem?.id
    invariant(typeof id === 'string' && ENTRY_ID.test(id), `${file}: invalid content id`)
    invariant(path.basename(file) === `${id}.json`, `${id}: filename mismatch`)
    invariant(!generatedById.has(id), `${id}: duplicate generated payload`)
    const source = sourceById.get(id)
    const translated = modern.entries[id]
    invariant(source && translated, `${id}: source or modern entry missing`)
    invariant(payload.status === 'raw_machine', `${id}: entry status is not raw_machine`)
    invariant(payload.contentItem.status === 'raw_machine', `${id}: item status is not raw_machine`)
    invariant(payload.revision.status === 'raw_machine', `${id}: revision status is not raw_machine`)
    invariant(payload.blocks.every((block) => block.status === 'raw_machine'), `${id}: a semantic block is not raw_machine`)
    invariant(payload.revision.contentId === id, `${id}: revision content mismatch`)
    invariant(payload.revision.blockIds.length === payload.blocks.length, `${id}: block id list length mismatch`)
    invariant(payload.blocks.every((block, index) => block.id === payload.revision.blockIds[index] && block.order === index), `${id}: unstable block sequence`)
    invariant(new Set(payload.blocks.map((block) => block.id)).size === payload.blocks.length, `${id}: duplicate block id`)

    const statement = payload.blocks[0]
    invariant(statement.id === `${id}.statement`, `${id}: first block is not the stable statement block`)
    invariant(surface(statement, 'machine_translation')?.text === translated.statement, `${id}: machine statement changed during splitting`)
    if (source.sourceMissing) {
      invariant(surface(statement, 'source_gap_notice')?.text === source.statement, `${id}: upstream source gap notice was not preserved`)
    } else {
      invariant(surface(statement, 'source')?.text === source.statement, `${id}: English statement changed during splitting`)
    }
    if (source.historicalChineseStatement) {
      invariant(surface(statement, 'historical_source')?.text === source.historicalChineseStatement, `${id}: historical statement changed`)
      invariant(surface(statement, 'historical_machine_interpretation')?.text === translated.historicalModernStatement, `${id}: historical statement interpretation changed`)
    }

    const originalProof = paragraphs(source.proof)
    const translatedProof = Object.entries(translated.proofByBlockId ?? {})
    invariant(originalProof.length === translatedProof.length, `${id}: proof block count changed`)
    translatedProof.forEach(([blockId, text], index) => {
      const block = payload.blocks.find((candidate) => candidate.id === blockId)
      invariant(block, `${id}: missing proof block ${blockId}`)
      invariant(surface(block, 'source')?.text === originalProof[index], `${blockId}: English paragraph changed`)
      invariant(surface(block, 'machine_translation')?.text === text, `${blockId}: machine paragraph changed`)
    })

    const historicalSource = paragraphs(source.historicalChineseProof ?? '')
    const historicalModern = Object.entries(translated.historicalByBlockId ?? {})
    invariant(historicalSource.length === historicalModern.length, `${id}: historical block count changed`)
    historicalModern.forEach(([blockId, text], index) => {
      const block = payload.blocks.find((candidate) => candidate.id === blockId)
      invariant(block, `${id}: missing historical block ${blockId}`)
      invariant(surface(block, 'historical_source')?.text === historicalSource[index], `${blockId}: historical source changed`)
      invariant(surface(block, 'historical_machine_interpretation')?.text === text, `${blockId}: historical interpretation changed`)
    })

    invariant(payload.blocks.at(-1)?.id === `${id}.source`, `${id}: stable source block missing`)
    invariant(payload.dependencies.length === payload.outgoingEdges.length, `${id}: dependency summary mismatch`)
    invariant(payload.dependents.length === payload.incomingEdges.length, `${id}: dependent summary mismatch`)
    invariant(payload.outgoingEdges.every((edge) => edge.provenance.kind === 'explicit_source_reference'), `${id}: non-explicit edge entered generated corpus`)
    invariant(payload.outgoingEdges.every((edge) => sourceById.has(edge.targetContentId)), `${id}: dangling outgoing edge`)
    invariant(payload.incomingEdges.every((edge) => edge.targetContentId === id), `${id}: wrong incoming edge target`)
    invariant(payload.visualization.level in levels, `${id}: invalid visualization level`)
    levels[payload.visualization.level] += 1
    if (source.kind !== 'proposition') {
      invariant(payload.visualization.level === 'none' && payload.visualization.rendererId === null,
        `${id}: foundation entry must have visualization level none and no renderer`)
    } else {
      const renderer = rendererById.get(payload.visualization.rendererId)
      invariant(renderer, `${id}: visualization references an unknown renderer`)
      invariant(renderer.geometry === source.geometry, `${id}: renderer geometry does not match source classification`)
      if (specific.has(id)) {
        invariant(payload.visualization.level === 'proposition_specific' && renderer.scope === 'proposition_specific',
          `${id}: expected proposition_specific visualization`)
      } else {
        invariant(payload.visualization.level === 'concept_illustration' && renderer.scope === 'concept_illustration',
          `${id}: generic proposition visualization is overstated`)
      }
      if (payload.visualization.attestation) {
        invariant(payload.visualization.attestation.rendererRevision === renderer.revision,
          `${id}: visualization attestation is stale for the current renderer manifest`)
      }
    }

    blockCount += payload.blocks.length
    edgeCount += payload.outgoingEdges.length
    sourceIssueCount += payload.sourceIssues.length
    generatedById.set(id, payload)
    outgoingById.set(id, payload.outgoingEdges)
    for (const edge of payload.outgoingEdges) {
      const incoming = incomingByTarget.get(edge.targetContentId) ?? []
      incoming.push(edge)
      incomingByTarget.set(edge.targetContentId, incoming)
    }
  }

  invariant(generatedById.size === sourceById.size, 'Generated entry set differs from source corpus')
  for (const [id, payload] of generatedById) {
    invariant(
      stable([...payload.incomingEdges].sort((left, right) => left.id.localeCompare(right.id)))
        === stable([...(incomingByTarget.get(id) ?? [])].sort((left, right) => left.id.localeCompare(right.id))),
      `${id}: reverse dependency set is not the exact inverse of outgoing edges`,
    )
  }

  const selfPayload = generatedById.get('euclid-10-28')
  const selfEdge = selfPayload.outgoingEdges.find((edge) => edge.targetContentId === 'euclid-10-28')
  invariant(selfEdge, 'Euclid X.28 self-reference was silently removed')
  invariant(
    selfPayload.sourceIssues.some((issue) => issue.code === 'self_reference_or_intra_entry_lemma' && issue.edgeId === selfEdge.id),
    'Euclid X.28 self-reference source_issue is missing',
  )
  const missingPayload = generatedById.get('euclid-6-def-5')
  invariant(missingPayload.contentItem.sourceMissing, 'Euclid VI.Def.5 source gap flag is missing')
  invariant(missingPayload.sourceIssues.some((issue) => issue.code === 'upstream_source_missing'), 'Euclid VI.Def.5 source issue is missing')
  const conversePayload = generatedById.get('euclid-1-48')
  invariant(conversePayload.visualization.level === 'concept_illustration'
    && conversePayload.visualization.rendererId === 'concept-triangle',
  'Euclid I.48 must not claim a proposition-specific renderer that presupposes its right-angle conclusion')

  const indexedIds = new Set()
  for (let book = 1; book <= 13; book += 1) {
    const index = await json(path.join(BOOK_ROOT, `${String(book).padStart(2, '0')}.index.json`))
    invariant(index.status === 'raw_machine', `Book ${book}: status is not raw_machine`)
    invariant(index.book.book === book, `Book ${book}: metadata mismatch`)
    invariant(index.entries.length === index.book.entries, `Book ${book}: entry count mismatch`)
    for (const item of index.entries) {
      invariant(item.book === book, `${item.id}: listed in wrong book`)
      invariant(item.status === 'raw_machine', `${item.id}: index status is not raw_machine`)
      invariant(!('blocks' in item) && !('proof' in item) && !('statement' in item), `${item.id}: book index leaked full text`)
      invariant(item.entryPath === `entries/${item.id}.json`, `${item.id}: unsafe or inconsistent entry path`)
      invariant(!indexedIds.has(item.id), `${item.id}: duplicated across book indexes`)
      indexedIds.add(item.id)
    }
  }
  invariant(indexedIds.size === 607, 'Book indexes do not cover exactly 607 entries')

  invariant(blockCount === catalog.counts.semanticBlocks, 'Catalog semantic block count is stale')
  invariant(edgeCount === catalog.counts.explicitEdges, 'Catalog edge count is stale')
  invariant(sourceIssueCount === catalog.counts.sourceIssues, 'Catalog source issue count is stale')
  invariant(levels.none === 142, `Expected 142 foundation entries with no visualization, found ${levels.none}`)
  invariant(levels.proposition_specific === 3, `Expected 3 proposition-specific renderers, found ${levels.proposition_specific}`)
  invariant(levels.concept_illustration === 462, `Expected 462 concept illustrations, found ${levels.concept_illustration}`)
  invariant(levels.verified === 0, 'Generated machine corpus must not contain verified visualizations')

  const catalogFile = path.join(OUTPUT_ROOT, 'catalog.json')
  const entrySizes = await totalBytes(entryFiles)
  const bookSizes = await totalBytes(bookFiles)
  const catalogSize = await stat(catalogFile)
  const catalogGzip = gzipSync(await readFile(catalogFile), { level: 9 }).byteLength
  const allRaw = catalogSize.size + bookSizes.raw + entrySizes.raw
  const allGzip = catalogGzip + bookSizes.gzip + entrySizes.gzip
  console.log(JSON.stringify({
    status: 'PASS',
    sourceJsonSha256: sha256(sourceText),
    modernJsonSha256: sha256(modernText),
    files: { catalog: 1, bookIndexes: bookFiles.length, entries: entryFiles.length, total: 1 + bookFiles.length + entryFiles.length },
    counts: { entries: generatedById.size, semanticBlocks: blockCount, explicitEdges: edgeCount, sourceIssues: sourceIssueCount },
    visualizationLevels: levels,
    bytes: {
      catalog: { raw: catalogSize.size, gzip: catalogGzip },
      allBookIndexes: { raw: bookSizes.raw, gzip: bookSizes.gzip },
      allEntries: { raw: entrySizes.raw, gzip: entrySizes.gzip, largest: entrySizes.largest },
      allGenerated: { raw: allRaw, gzip: allGzip },
    },
    preserved: { euclid10_28SelfReference: true, euclid6Definition5SourceGap: true },
  }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
