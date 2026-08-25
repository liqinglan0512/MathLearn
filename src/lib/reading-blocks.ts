import { getPassageBlockVersion } from './annotations'
import { getEuclidBlocks, getEuclidEnrichment, type EuclidEntry } from './euclid'

export interface ReadingSemanticBlock {
  id: string
  kind: string
  title: string
  content: string
  version: string
  citations: string[]
  originalContent?: string
  modernContent?: string
}

function derivedBlock(id: string, kind: string, title: string, content: string, citations: string[] = []): ReadingSemanticBlock {
  return { id, kind, title, content, citations, version: getPassageBlockVersion(`${kind}\n${content}`) }
}

function extractCitationIds(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(/\/principles\/(euclid-[a-z0-9-]+)/g), (match) => match[1]))]
}

function expandHistoricalInterpretations(blocks: readonly ReadingSemanticBlock[]): ReadingSemanticBlock[] {
  const expanded: ReadingSemanticBlock[] = []

  for (const block of blocks) {
    expanded.push(block)
    if (block.kind !== 'historical' || !block.modernContent?.trim()) continue

    const ordinal = block.id.split('.').at(-1) ?? ''
    const citations = [...new Set([...block.citations, ...extractCitationIds(block.modernContent)])]
    expanded.push(derivedBlock(
      `${block.id}.modern`,
      'historical-modern',
      `现代汉语解读 ${ordinal}`,
      block.modernContent,
      citations,
    ))
  }

  return expanded
}

export function getArticleReadingBlocks(articleId: string, content: string): ReadingSemanticBlock[] {
  const originalBlocks = getEuclidBlocks(articleId)
  if (originalBlocks.length === 0) {
    return [derivedBlock(`${articleId}.body`, 'body', '正文', content)]
  }

  const enrichment = getEuclidEnrichment(articleId)
  if (!enrichment) return expandHistoricalInterpretations(originalBlocks)

  const core = originalBlocks.filter((block) => block.kind !== 'historical' && block.kind !== 'source')
  const supplemental: ReadingSemanticBlock[] = [
    derivedBlock(
      `${articleId}.modern`,
      'modern',
      enrichment.modernExplanation.title,
      enrichment.modernExplanation.content,
    ),
    ...enrichment.alternativeProofs.map((proof) => derivedBlock(
      proof.id,
      'alternative',
      proof.title,
      proof.content,
      proof.citations,
    )),
    ...enrichment.commonErrors.map((error) => derivedBlock(
      error.id,
      'common-error',
      error.title,
      error.explanation,
    )),
  ]
  const historicalAndSource = originalBlocks.filter((block) => block.kind === 'historical' || block.kind === 'source')
  return expandHistoricalInterpretations([...core, ...supplemental, ...historicalAndSource])
}

function entryKindLabel(entry: EuclidEntry) {
  if (entry.kind === 'definition') return '定义'
  if (entry.kind === 'postulate') return '公设'
  if (entry.kind === 'common-notion') return '公理'
  return '命题'
}

export function describeEuclidEntry(entry: EuclidEntry) {
  return `第 ${entry.book} 卷 · ${entryKindLabel(entry)} ${entry.proposition}`
}

export function getEuclidEntryKindLabel(entry: EuclidEntry) {
  return entryKindLabel(entry)
}
