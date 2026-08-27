import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const SOURCE_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-data.json')
const MODERN_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-modern-zh.json')
const RENDERER_MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'lib', 'euclid-renderer-manifest.json')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'public', 'content')
const OUTPUT_ROOT = path.join(PUBLIC_ROOT, 'euclid')
const TEMP_ROOT = path.join(PUBLIC_ROOT, '.euclid-build-tmp')

const SCHEMA_VERSION = 1
const CORPUS_ID = 'euclid-elements-heath-1908'
const RAW_MACHINE = 'raw_machine'

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function paragraphs(value) {
  return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)
}

function citationsFrom(...values) {
  const result = new Set()
  for (const value of values) {
    if (!value) continue
    for (const match of value.matchAll(/\/principles\/(euclid-[a-z0-9-]+)/g)) {
      result.add(match[1])
    }
  }
  return [...result]
}

function entryUrn(entry) {
  return `urn:cts:greekLit:tlg1799.tlg001.perseus-eng2:${entry.book}.${entry.sourceGroup}.${entry.sourceNumber}`
}

function blockKind(entry, blockId) {
  if (blockId.endsWith('.statement')) {
    if (entry.kind === 'definition') return 'definition'
    if (entry.kind === 'postulate') return 'postulate'
    if (entry.kind === 'common-notion') return 'common_notion'
    return 'statement'
  }
  if (blockId.endsWith('.conclusion')) return 'conclusion'
  if (blockId.includes('.construction.')) return 'construction'
  if (blockId.includes('.historical.')) return 'historical_note'
  if (blockId.endsWith('.source')) return 'source'
  return 'proof_step'
}

function blockTitle(entry, blockId) {
  const kind = blockKind(entry, blockId)
  const ordinal = blockId.split('.').at(-1)
  if (kind === 'definition') return '定义陈述'
  if (kind === 'postulate') return '公设陈述'
  if (kind === 'common_notion') return '公理陈述'
  if (kind === 'statement') return '命题陈述'
  if (kind === 'conclusion') return '结论'
  if (kind === 'construction') return `作图与构造 ${ordinal}`
  if (kind === 'historical_note') return `徐光启、利玛窦历史中译 ${ordinal}`
  if (kind === 'source') return '来源、译者与开放许可'
  return `证明 ${ordinal}`
}

function sourceSurface(id, role, language, text, status = 'source_transcription') {
  return { id, role, language, status, text }
}

function makeBlock(entry, revisionId, id, order, surfaces) {
  const citations = citationsFrom(...surfaces.map((surface) => surface.text))
  return {
    id,
    contentId: entry.id,
    revisionId,
    order,
    kind: blockKind(entry, id),
    title: blockTitle(entry, id),
    status: RAW_MACHINE,
    contentHash: hash(JSON.stringify(surfaces)),
    citations,
    surfaces,
  }
}

function makeSemanticBlocks(entry, modernEntry, revisionId, corpusSource) {
  const blocks = []
  const statementSurfaces = []

  if (entry.sourceMissing) {
    statementSurfaces.push(sourceSurface(
      'heath-source-gap',
      'source_gap_notice',
      'en',
      entry.statement,
      'source_gap',
    ))
  } else {
    statementSurfaces.push(sourceSurface('heath-en', 'source', 'en', entry.statement))
  }
  statementSurfaces.push(sourceSurface(
    'machine-zh',
    'machine_translation',
    'zh-CN',
    modernEntry.statement,
    RAW_MACHINE,
  ))
  if (entry.historicalChineseStatement) {
    statementSurfaces.push(sourceSurface(
      'historical-zh',
      'historical_source',
      'zh-Hans',
      entry.historicalChineseStatement,
    ))
  }
  if (modernEntry.historicalModernStatement) {
    statementSurfaces.push(sourceSurface(
      'historical-modern-zh',
      'historical_machine_interpretation',
      'zh-CN',
      modernEntry.historicalModernStatement,
      RAW_MACHINE,
    ))
  }
  blocks.push(makeBlock(entry, revisionId, `${entry.id}.statement`, 0, statementSurfaces))

  const originalProof = paragraphs(entry.proof)
  const proofEntries = Object.entries(modernEntry.proofByBlockId ?? {})
  invariant(
    originalProof.length === proofEntries.length,
    `${entry.id}: original proof has ${originalProof.length} paragraphs but proofByBlockId has ${proofEntries.length}`,
  )
  invariant(
    originalProof.length === modernEntry.proofParagraphs.length,
    `${entry.id}: proofParagraphs do not align with the English source`,
  )

  proofEntries.forEach(([blockId, translated], index) => {
    invariant(blockId.startsWith(`${entry.id}.`), `${entry.id}: foreign block id ${blockId}`)
    invariant(translated === modernEntry.proofParagraphs[index], `${entry.id}: proof array and block mapping disagree at ${blockId}`)
    blocks.push(makeBlock(entry, revisionId, blockId, blocks.length, [
      sourceSurface('heath-en', 'source', 'en', originalProof[index]),
      sourceSurface('machine-zh', 'machine_translation', 'zh-CN', translated, RAW_MACHINE),
    ]))
  })

  const historicalOriginal = paragraphs(entry.historicalChineseProof ?? '')
  const historicalEntries = Object.entries(modernEntry.historicalByBlockId ?? {})
  invariant(
    historicalOriginal.length === historicalEntries.length,
    `${entry.id}: historical source has ${historicalOriginal.length} paragraphs but historicalByBlockId has ${historicalEntries.length}`,
  )
  invariant(
    historicalOriginal.length === modernEntry.historicalModernParagraphs.length,
    `${entry.id}: historical modern paragraphs do not align with the source`,
  )

  historicalEntries.forEach(([blockId, translated], index) => {
    invariant(blockId.startsWith(`${entry.id}.historical.`), `${entry.id}: invalid historical block id ${blockId}`)
    invariant(
      translated === modernEntry.historicalModernParagraphs[index],
      `${entry.id}: historical array and block mapping disagree at ${blockId}`,
    )
    blocks.push(makeBlock(entry, revisionId, blockId, blocks.length, [
      sourceSurface('historical-zh', 'historical_source', 'zh-Hans', historicalOriginal[index]),
      sourceSurface('historical-modern-zh', 'historical_machine_interpretation', 'zh-CN', translated, RAW_MACHINE),
    ]))
  })

  const sourceLines = [
    `Perseus / Heath source: ${entry.sourceUrl}`,
    `Corpus URN: ${entryUrn(entry)}`,
    `Corpus SHA-256: ${corpusSource.sha256}`,
    `License: ${corpusSource.license} (${corpusSource.licenseUrl})`,
  ]
  if (entry.historicalChineseSourceUrl) {
    sourceLines.push(`Historical Chinese source: ${entry.historicalChineseSourceUrl}`)
  }
  blocks.push(makeBlock(entry, revisionId, `${entry.id}.source`, blocks.length, [
    sourceSurface('provenance', 'provenance_note', 'en', sourceLines.join('\n'), 'generated_metadata'),
  ]))

  const ids = new Set(blocks.map((block) => block.id))
  invariant(ids.size === blocks.length, `${entry.id}: duplicate semantic block id`)
  return blocks
}

function visualizationFor(entry, rendererById) {
  if (entry.kind !== 'proposition') {
    return {
      level: 'none',
      rendererId: null,
      rationale: 'Definitions, postulates and common notions have no automatically asserted proposition construction.',
    }
  }
  const propositionRenderer = rendererById.get(entry.id)
  if (propositionRenderer?.scope === 'proposition_specific') {
    invariant(propositionRenderer.geometry === entry.geometry, `${entry.id}: proposition renderer geometry mismatch`)
    return {
      level: 'proposition_specific',
      rendererId: entry.id,
      rationale: 'The current renderer has proposition-specific code, but no human verification record exists.',
    }
  }
  const rendererId = `concept-${entry.geometry}`
  const conceptRenderer = rendererById.get(rendererId)
  invariant(conceptRenderer?.scope === 'concept_illustration', `${entry.id}: missing concept renderer ${rendererId}`)
  invariant(conceptRenderer.geometry === entry.geometry, `${entry.id}: concept renderer geometry mismatch`)
  return {
    level: 'concept_illustration',
    rendererId,
    rationale: 'The current renderer is selected by a broad geometry family and must not be presented as this proposition’s exact construction.',
  }
}

function makeOutgoingEdges(entry, blocks) {
  const sourceUrn = entryUrn(entry)
  return entry.dependencies.map((dependency) => {
    const sourceBlockIds = blocks
      .filter((block) => block.citations.includes(dependency.id))
      .map((block) => block.id)
    const edgeId = `edge:${entry.id}:${dependency.id}:explicit`
    return {
      id: edgeId,
      sourceContentId: entry.id,
      sourceBlockIds,
      targetContentId: dependency.id,
      type: 'depends_on',
      provenance: {
        kind: 'explicit_source_reference',
        basis: 'perseus_tei_ref',
        sourceUrn,
        sourceUrl: entry.sourceUrl,
        sourceLabel: dependency.label,
      },
    }
  })
}

function entrySummary(entry, modernEntry) {
  const text = modernEntry.statement.trim()
  return text.length > 180 ? `${text.slice(0, 179)}…` : text
}

function dependencySummary(edge, entryById) {
  const target = entryById.get(edge.targetContentId)
  invariant(target, `${edge.id}: missing target ${edge.targetContentId}`)
  return {
    edgeId: edge.id,
    id: target.id,
    book: target.book,
    number: target.proposition,
    kind: target.kind,
    title: target.title,
    provenance: edge.provenance.kind,
  }
}

function dependentSummary(edge, entryById) {
  const source = entryById.get(edge.sourceContentId)
  invariant(source, `${edge.id}: missing source ${edge.sourceContentId}`)
  return {
    edgeId: edge.id,
    id: source.id,
    book: source.book,
    number: source.proposition,
    kind: source.kind,
    title: source.title,
    provenance: edge.provenance.kind,
  }
}

async function writeJson(relativePath, value) {
  const destination = path.join(TEMP_ROOT, relativePath)
  invariant(destination.startsWith(`${TEMP_ROOT}${path.sep}`), `Unsafe output path: ${relativePath}`)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, `${JSON.stringify(value)}\n`, 'utf8')
}

async function replaceGeneratedOutput() {
  const resolvedOutput = path.resolve(OUTPUT_ROOT)
  const resolvedPublic = path.resolve(PUBLIC_ROOT)
  invariant(resolvedOutput.startsWith(`${resolvedPublic}${path.sep}`), 'Refusing to replace output outside public/content')
  await rm(resolvedOutput, { recursive: true, force: true })
  // Recursive directory rename is intermittently rejected on Windows when an
  // antivirus/indexer briefly opens the generated tree. Copying the verified
  // temporary tree into the fixed output directory is deterministic and keeps
  // every destructive operation confined to public/content/euclid.
  await mkdir(resolvedOutput, { recursive: true })
  await cp(TEMP_ROOT, resolvedOutput, { recursive: true, force: true })
  await rm(TEMP_ROOT, { recursive: true, force: true })
}

async function directoryBytes(directory) {
  let total = 0
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name)
    if (item.isDirectory()) total += await directoryBytes(target)
    else if (item.isFile()) total += (await readFile(target)).byteLength
  }
  return total
}

async function main() {
  const [sourceText, modernText, rendererManifestText] = await Promise.all([
    readFile(SOURCE_PATH, 'utf8'),
    readFile(MODERN_PATH, 'utf8'),
    readFile(RENDERER_MANIFEST_PATH, 'utf8'),
  ])
  const corpus = JSON.parse(sourceText)
  const modernCorpus = JSON.parse(modernText)
  const rendererManifest = JSON.parse(rendererManifestText)
  invariant(corpus.entries.length === 607, `Expected 607 source entries, found ${corpus.entries.length}`)
  invariant(Object.keys(modernCorpus.entries).length === 607, 'Modern corpus must contain 607 entries')
  invariant(rendererManifest.schemaVersion === 1 && Array.isArray(rendererManifest.renderers), 'Renderer manifest schema is invalid')
  const rendererById = new Map(rendererManifest.renderers.map((renderer) => [renderer.id, renderer]))
  invariant(rendererById.size === rendererManifest.renderers.length, 'Renderer manifest contains duplicate ids')
  invariant(new Set(rendererManifest.renderers.map((renderer) => renderer.revision)).size === rendererManifest.renderers.length,
    'Renderer manifest contains duplicate revisions')

  const entryById = new Map(corpus.entries.map((entry) => [entry.id, entry]))
  invariant(entryById.size === corpus.entries.length, 'Duplicate source entry id')
  await rm(TEMP_ROOT, { recursive: true, force: true })
  await mkdir(TEMP_ROOT, { recursive: true })

  const prepared = new Map()
  const allOutgoingEdges = []
  for (const entry of corpus.entries) {
    const modernEntry = modernCorpus.entries[entry.id]
    invariant(modernEntry, `${entry.id}: missing modern Chinese entry`)
    const revisionHash = hash(JSON.stringify({ entry, modernEntry }))
    const revisionId = `${entry.id}@raw-${revisionHash.slice(0, 16)}`
    const blocks = makeSemanticBlocks(entry, modernEntry, revisionId, corpus.source)
    const outgoingEdges = makeOutgoingEdges(entry, blocks)
    allOutgoingEdges.push(...outgoingEdges)
    prepared.set(entry.id, { entry, modernEntry, revisionId, revisionHash, blocks, outgoingEdges })
  }

  const incomingByTarget = new Map()
  for (const edge of allOutgoingEdges) {
    const incoming = incomingByTarget.get(edge.targetContentId) ?? []
    incoming.push(edge)
    incomingByTarget.set(edge.targetContentId, incoming)
  }

  let sourceIssueCount = 0
  let semanticBlockCount = 0
  for (const item of prepared.values()) {
    const { entry, modernEntry, revisionId, revisionHash, blocks, outgoingEdges } = item
    const incomingEdges = incomingByTarget.get(entry.id) ?? []
    const sourceIssues = []
    if (entry.sourceMissing) {
      sourceIssues.push({
        id: `source-issue:${entry.id}:upstream-empty-paragraph`,
        kind: 'source_issue',
        code: 'upstream_source_missing',
        status: 'open',
        description: 'The upstream Perseus TEI record preserves this identifier but supplies no recoverable source paragraph. No replacement text has been invented.',
      })
    }
    for (const edge of outgoingEdges) {
      if (edge.sourceContentId === edge.targetContentId) {
        sourceIssues.push({
          id: `source-issue:${entry.id}:self-reference:${edge.id}`,
          kind: 'source_issue',
          code: 'self_reference_or_intra_entry_lemma',
          status: 'open',
          edgeId: edge.id,
          description: 'The TEI reference resolves to the containing proposition itself (labelled as an internal lemma). It is preserved for editorial modelling rather than silently deleted.',
        })
      }
      if (edge.sourceBlockIds.length === 0) {
        sourceIssues.push({
          id: `source-issue:${entry.id}:unlocated-reference:${edge.id}`,
          kind: 'source_issue',
          code: 'explicit_reference_without_block_locator',
          status: 'open',
          edgeId: edge.id,
          description: 'The entry-level TEI dependency was preserved, but no current semantic block contains its rendered link.',
        })
      }
    }
    sourceIssueCount += sourceIssues.length
    semanticBlockCount += blocks.length

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      corpusId: CORPUS_ID,
      status: RAW_MACHINE,
      contentItem: {
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        englishTitle: entry.englishTitle,
        book: entry.book,
        number: entry.proposition,
        status: RAW_MACHINE,
        sourceMissing: Boolean(entry.sourceMissing),
        source: {
          urn: entryUrn(entry),
          url: entry.sourceUrl,
          group: entry.sourceGroup,
          sourceNumber: entry.sourceNumber,
          corpusSha256: corpus.source.sha256,
          hasSourceFigure: entry.hasSourceFigure,
          historicalChineseUrl: entry.historicalChineseSourceUrl ?? null,
        },
      },
      revision: {
        id: revisionId,
        contentId: entry.id,
        version: 1,
        status: RAW_MACHINE,
        contentHash: revisionHash,
        createdBy: 'mathforge-corpus-import',
        changeSummary: 'Imported Heath source and machine-assisted Chinese draft. No mathematical or editorial review is implied.',
        blockIds: blocks.map((block) => block.id),
      },
      blocks,
      outgoingEdges,
      incomingEdges,
      dependencies: outgoingEdges.map((edge) => dependencySummary(edge, entryById)),
      dependents: incomingEdges.map((edge) => dependentSummary(edge, entryById)),
      visualization: visualizationFor(entry, rendererById),
      sourceIssues,
    }
    await writeJson(path.join('entries', `${entry.id}.json`), payload)
  }

  const books = []
  for (const book of corpus.books) {
    const entries = corpus.entries
      .filter((entry) => entry.book === book.book)
      .map((entry) => {
        const modernEntry = modernCorpus.entries[entry.id]
        return {
          id: entry.id,
          book: entry.book,
          number: entry.proposition,
          kind: entry.kind,
          title: entry.title,
          summary: entrySummary(entry, modernEntry),
          status: RAW_MACHINE,
          sourceMissing: Boolean(entry.sourceMissing),
          visualizationLevel: visualizationFor(entry, rendererById).level,
          entryPath: `entries/${entry.id}.json`,
        }
      })
    invariant(entries.length === book.entries, `Book ${book.book}: index count mismatch`)
    const index = {
      schemaVersion: SCHEMA_VERSION,
      corpusId: CORPUS_ID,
      status: RAW_MACHINE,
      book,
      entries,
    }
    const indexPath = `books/${String(book.book).padStart(2, '0')}.index.json`
    await writeJson(indexPath, index)
    books.push({ ...book, status: RAW_MACHINE, indexPath })
  }

  const catalog = {
    schemaVersion: SCHEMA_VERSION,
    corpusId: CORPUS_ID,
    status: RAW_MACHINE,
    source: corpus.source,
    translationPipeline: {
      ...modernCorpus.source,
      pipelineStatus: modernCorpus.source.status,
      editorialStatus: RAW_MACHINE,
      statusMeaning: 'Pipeline completion only: all expected machine-draft segments are present. This is not mathematical review or publication approval.',
    },
    counts: {
      books: books.length,
      entries: corpus.entries.length,
      propositions: corpus.entries.filter((entry) => entry.kind === 'proposition').length,
      semanticBlocks: semanticBlockCount,
      explicitEdges: allOutgoingEdges.length,
      sourceIssues: sourceIssueCount,
    },
    books,
  }
  await writeJson('catalog.json', catalog)
  await replaceGeneratedOutput()

  const outputBytes = await directoryBytes(OUTPUT_ROOT)
  console.log(JSON.stringify({
    status: 'generated',
    output: OUTPUT_ROOT,
    outputDirectoryBytes: outputBytes,
    books: books.length,
    entries: corpus.entries.length,
    semanticBlocks: semanticBlockCount,
    explicitEdges: allOutgoingEdges.length,
    sourceIssues: sourceIssueCount,
  }))
}

main().catch(async (error) => {
  await rm(TEMP_ROOT, { recursive: true, force: true })
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
