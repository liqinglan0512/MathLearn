import euclidCorpusJson from './euclid-data.json?raw'
import type { Article } from './types'

export type EuclidEntryKind = 'proposition' | 'definition' | 'postulate' | 'common-notion'

export type EuclidGeometryFamily =
  | 'triangle'
  | 'parallel'
  | 'circle'
  | 'polygon'
  | 'area'
  | 'ratio'
  | 'number'
  | 'irrational'
  | 'solid'

export interface EuclidDependency {
  id: string
  label: string
  book: number
  proposition: number
  kind: EuclidEntryKind
}

export interface EuclidEntry {
  id: string
  book: number
  proposition: number
  kind: EuclidEntryKind
  title: string
  englishTitle: string
  statement: string
  proof: string
  dependencies: EuclidDependency[]
  geometry: EuclidGeometryFamily
  sourceUrl: string
  sourceGroup: string
  sourceNumber: number
  hasSourceFigure: boolean
  sourceMissing?: boolean
  historicalChineseStatement?: string
  historicalChineseProof?: string
  historicalChineseSourceUrl?: string
}

export interface EuclidBook {
  book: number
  roman: string
  title: string
  propositions: number
  definitions: number
  foundations: number
  entries: number
}

export interface EuclidSource {
  title: string
  author: string
  translator: string
  publisher: string
  year: number
  url: string
  license: string
  licenseUrl: string
  urn: string
  sha256: string
  historicalChinese: {
    title: string
    translators: string[]
    url: string
    license: string
    matchedBooks: number[]
    excludedReason: string
  }
}

export type EuclidBlockKind =
  | 'statement'
  | 'construction'
  | 'proof'
  | 'conclusion'
  | 'definition'
  | 'postulate'
  | 'common-notion'
  | 'historical'
  | 'source'

export interface EuclidBlock {
  id: string
  kind: EuclidBlockKind
  title: string
  content: string
  version: string
  citations: string[]
}

export interface EuclidAlternativeProof {
  id: string
  title: string
  content: string
  citations: string[]
}

export interface EuclidCommonError {
  id: string
  title: string
  explanation: string
}

export interface EuclidEnrichment {
  alternativeProofs: EuclidAlternativeProof[]
  commonErrors: EuclidCommonError[]
  modernExplanation: {
    title: string
    content: string
  }
}

interface EuclidCorpus {
  source: EuclidSource
  books: EuclidBook[]
  entries: EuclidEntry[]
}

const corpus = JSON.parse(euclidCorpusJson) as EuclidCorpus
const entriesById = new Map(corpus.entries.map((entry) => [entry.id, entry]))
const dependentIdsById = new Map<string, string[]>()

for (const entry of corpus.entries) {
  for (const dependency of entry.dependencies) {
    const dependents = dependentIdsById.get(dependency.id) ?? []
    dependents.push(entry.id)
    dependentIdsById.set(dependency.id, dependents)
  }
}

export const EUCLID_SOURCE: EuclidSource = corpus.source
export const EUCLID_BOOKS: EuclidBook[] = corpus.books
export const EUCLID_ENTRIES: EuclidEntry[] = corpus.entries
export const EUCLID_PROPOSITIONS: EuclidEntry[] = corpus.entries.filter(
  (entry) => entry.kind === 'proposition',
)

export function getEuclidProposition(id: string | undefined): EuclidEntry | undefined {
  return id ? entriesById.get(id) : undefined
}

export function getEuclidEntry(id: string | undefined): EuclidEntry | undefined {
  return getEuclidProposition(id)
}

export function getEuclidDependencies(id: string | undefined): EuclidEntry[] {
  const entry = getEuclidProposition(id)
  if (!entry) return []

  return entry.dependencies
    .map((dependency) => entriesById.get(dependency.id))
    .filter((dependency): dependency is EuclidEntry => dependency !== undefined)
}

export function getEuclidDependents(id: string | undefined): EuclidEntry[] {
  if (!id) return []

  return (dependentIdsById.get(id) ?? [])
    .map((dependentId) => entriesById.get(dependentId))
    .filter((dependent): dependent is EuclidEntry => dependent !== undefined)
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function parseChineseNumber(source: string): number | undefined {
  const value = source.replaceAll('廿', '二十').replaceAll('卄', '二十').replaceAll('卅', '三十')
  if (value.includes('百')) {
    const [hundreds, remaining] = value.split('百')
    return (CHINESE_DIGITS[hundreds] ?? 1) * 100 + (remaining ? (parseChineseNumber(remaining) ?? 0) : 0)
  }
  if (value.includes('十')) {
    const [tens, remaining] = value.split('十')
    return (CHINESE_DIGITS[tens] ?? 1) * 10 + (remaining ? (CHINESE_DIGITS[remaining] ?? 0) : 0)
  }
  return CHINESE_DIGITS[value]
}

function linkHistoricalReferences(text: string, currentBook: number): string {
  return text.replace(
    /〈(?:(本篇|本卷)|([一二三四五六七八九十]+)卷)([一二三四五六七八九十百廿卄卅]+)〉/g,
    (original: string, current: string | undefined, otherBook: string | undefined, proposition: string) => {
      const book = current ? currentBook : parseChineseNumber(otherBook ?? '')
      const number = parseChineseNumber(proposition)
      if (!book || !number) return original
      const id = `euclid-${book}-${number}`
      return entriesById.has(id) ? `[${original}](/principles/${id})` : original
    },
  )
}

function chineseKind(kind: EuclidEntryKind) {
  if (kind === 'definition') return '定义'
  if (kind === 'postulate') return '公设'
  if (kind === 'common-notion') return '公理'
  return '命题'
}

function citationLabel(entry: EuclidEntry) {
  const roman = EUCLID_BOOKS[entry.book - 1]?.roman ?? String(entry.book)
  return entry.kind === 'proposition'
    ? `${roman}.${entry.proposition}`
    : `${roman} · ${chineseKind(entry.kind)} ${entry.proposition}`
}

function stableContentVersion(content: string): string {
  // FNV-1a over UTF-16 code units is deterministic across server restarts and
  // does not depend on browser cryptography or per-session random state.
  let hash = 0x811c9dc5
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function blockCitations(content: string): string[] {
  const found = new Set<string>()
  for (const match of content.matchAll(/\/principles\/(euclid-[a-z0-9-]+)/g)) {
    const citedId = match[1]
    if (entriesById.has(citedId)) found.add(citedId)
  }
  return [...found]
}

function createBlock(id: string, kind: EuclidBlockKind, title: string, content: string): EuclidBlock {
  return {
    id,
    kind,
    title,
    content,
    version: stableContentVersion(`${kind}\n${content}`),
    citations: blockCitations(content),
  }
}

function isConstructionParagraph(content: string): boolean {
  return /^(?:(?:for\s+)?let\b|with\s+centre\b|with\s+center\b|on\s+(?:the|a|an)\s+given\b|from\s+(?:the|a|an)\s+given\b|describe\b|construct\b|produce\b|draw\b)/i.test(
    content,
  )
}

function isConclusionParagraph(content: string): boolean {
  return /\bQ\.?\s*E\.?\s*[DF]\.?|what it was required to (?:do|prove|show)|therefore\s+etc\.?/i.test(
    content,
  )
}

const blocksById = new Map<string, EuclidBlock[]>()

export function getEuclidBlocks(id: string | undefined): EuclidBlock[] {
  const entry = getEuclidProposition(id)
  if (!entry) return []

  const cached = blocksById.get(entry.id)
  if (cached) return cached

  const statementKind: EuclidBlockKind = entry.kind === 'proposition' ? 'statement' : entry.kind
  const statementText = entry.sourceMissing
    ? '> 官方 Perseus TEI 保留了本条编号，但其正文只有一个空段落；现有来源不足以恢复原文，因此不编造内容。'
    : [
        `**${entry.title}。**`,
        ...(entry.historicalChineseStatement ? [`历史中译：${entry.historicalChineseStatement}`] : []),
        `> Heath 原文：${entry.statement}`,
      ].join('\n\n')
  const blocks: EuclidBlock[] = [
    createBlock(`${entry.id}.statement`, statementKind, `${chineseKind(entry.kind)}陈述`, statementText),
  ]

  const paragraphs = entry.proof.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  let constructionIndex = 0
  let proofIndex = 0

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    const finalParagraph = index === paragraphs.length - 1

    if (finalParagraph && isConclusionParagraph(paragraph)) {
      blocks.push(createBlock(`${entry.id}.conclusion`, 'conclusion', '结论', paragraph))
      continue
    }

    if (isConstructionParagraph(paragraph)) {
      constructionIndex += 1
      blocks.push(
        createBlock(
          `${entry.id}.construction.${constructionIndex}`,
          'construction',
          `作图与构造 ${constructionIndex}`,
          paragraph,
        ),
      )
      continue
    }

    proofIndex += 1
    blocks.push(createBlock(`${entry.id}.proof.${proofIndex}`, 'proof', `证明 ${proofIndex}`, paragraph))
  }

  if (entry.historicalChineseProof) {
    const historicalParagraphs = entry.historicalChineseProof
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)

    for (let index = 0; index < historicalParagraphs.length; index += 1) {
      const content = linkHistoricalReferences(historicalParagraphs[index], entry.book)
      blocks.push(
        createBlock(
          `${entry.id}.historical.${index + 1}`,
          'historical',
          `徐光启、利玛窦历史中译 ${index + 1}`,
          content,
        ),
      )
    }
  }

  const provenance = [
    `- [本条 Perseus 原文](${entry.sourceUrl})`,
    `- [完整 TEI/XML 与译者署名](${EUCLID_SOURCE.url})`,
    `- ${EUCLID_SOURCE.translator} 英译，${EUCLID_SOURCE.year} 年；授权：[${EUCLID_SOURCE.license}](${EUCLID_SOURCE.licenseUrl})。`,
  ]
  if (entry.historicalChineseSourceUrl) {
    provenance.push(`- [可核验的徐光启、利玛窦历史中译](${entry.historicalChineseSourceUrl})`)
  } else if (entry.kind === 'proposition') {
    provenance.push('- 没有可逐题核验的公开中文古译时，保留真实英文证明，不冒充已完成中文全译。')
  }
  blocks.push(createBlock(`${entry.id}.source`, 'source', '来源、译者与开放许可', provenance.join('\n')))

  blocksById.set(entry.id, blocks)
  return blocks
}

export function getEuclidProofBlocks(id: string | undefined): EuclidBlock[] {
  return getEuclidBlocks(id)
}

const PYTHAGORAS_ENRICHMENT: EuclidEnrichment = {
  alternativeProofs: [
    {
      id: 'euclid-1-47.alternative.area-dissection',
      title: '面积拼图证明：四个全等直角三角形',
      content: [
        '设直角三角形两条直角边长为 $a,b$，斜边长为 $c$。把四个全等的直角三角形按顺序放入边长为 $a+b$ 的大正方形。',
        '中间留下的四边形四条边都长 $c$。由[三角形内角和定理](/principles/euclid-1-32)，每个直角三角形的两个锐角之和为直角，因此中间四边形的每个角也是直角；它确实是边长为 $c$ 的正方形，而不能只凭图形看起来像正方形。',
        '由[同底同高的面积关系](/principles/euclid-1-41)，每个三角形面积为 $ab/2$。于是大正方形的面积满足',
        '$$(a+b)^2=4\\cdot\\frac{ab}{2}+c^2.$$',
        '利用[完全平方公式的几何形式](/principles/euclid-2-4)，整理得到',
        '$$\\boxed{a^2+b^2=c^2}.$$',
        '这条证明依赖面积可加、拼图没有缝隙或重叠，以及中间四边形的直角判定；这些条件必须明确。',
      ].join('\n\n'),
      citations: ['euclid-1-32', 'euclid-1-41', 'euclid-2-4'],
    },
  ],
  commonErrors: [
    {
      id: 'euclid-1-47.error.figure',
      title: '把图上看起来是正方形当成证明',
      explanation: '必须另外证明中间四边形四条边都等于斜边，而且四个角都为直角；视觉印象不能代替角度推理。',
    },
    {
      id: 'euclid-1-47.error.circular-distance',
      title: '直接使用平面距离公式形成循环论证',
      explanation: '若距离公式本身依赖勾股定理，用它证明勾股定理就是循环论证；采用坐标或内积时必须明确哪些结构是额外公理。',
    },
    {
      id: 'euclid-1-47.error.right-angle',
      title: '漏掉直角前提',
      explanation: '任意三角形通常满足余弦定理；只有夹角是直角时，交叉项才消失并得到勾股关系。',
    },
    {
      id: 'euclid-1-47.error.area',
      title: '没有说明拼图恰好覆盖且不重叠',
      explanation: '面积拆分等式要求四个三角形和中央正方形的内部互不重叠，并共同覆盖外部正方形。',
    },
  ],
  modernExplanation: {
    title: '现代重述：内积中的正交分解',
    content: [
      '在已经给定内积结构的向量空间中，若 $\\langle u,v\\rangle=0$，则',
      '$$\\lVert u+v\\rVert^2=\\langle u+v,u+v\\rangle=\\lVert u\\rVert^2+2\\langle u,v\\rangle+\\lVert v\\rVert^2=\\lVert u\\rVert^2+\\lVert v\\rVert^2.$$',
      '这解释了勾股关系为何推广到任意内积空间。它是采用现代内积公理后的结构性重述；如果用欧氏距离公式建立内积，则不能反过来宣称已经独立证明了欧几里得的原命题。',
    ].join('\n\n'),
  },
}

export function getEuclidEnrichment(id: string | undefined): EuclidEnrichment | undefined {
  return id === 'euclid-1-47' ? PYTHAGORAS_ENRICHMENT : undefined
}

function articleContent(entry: EuclidEntry): string {
  const sections = [
    `## ${chineseKind(entry.kind)} ${citationLabel(entry)}：问题是什么`,
    entry.historicalChineseStatement
      ? `**历史中译命题：** ${entry.historicalChineseStatement}`
      : `**中文导读：** ${entry.title}。`,
    entry.sourceMissing
      ? '> **来源缺口：** 官方 Perseus TEI 保留了本条记录，但该条正文只有一个空段落。现有来源不足以恢复原文，因此不编造定义。'
      : `> **Heath 英译原文：** ${entry.statement}`,
  ]

  if (entry.kind !== 'proposition') {
    sections.push(
      '## 它在演绎体系中的位置',
      entry.kind === 'definition'
        ? '这是一条基础定义，用于说明后续证明使用的数学对象，不应把定义误写成已经独立证明的定理。'
        : '这是一条明确陈述的演绎起点。后续命题可以引用它，但它本身不伪装成由更早命题推出的结论。',
    )
  }

  if (entry.historicalChineseProof) {
    sections.push(
      '## 历史中文原文：徐光启、利玛窦译',
      '> 下文为 1607 年历史中译的现代简体展示，保留古译措辞；它与 Heath 版本属于不同传本，因此仅在整卷命题编号核对一致时附录。',
      linkHistoricalReferences(entry.historicalChineseProof, entry.book),
    )
  }

  if (entry.proof) {
    sections.push('## 原始证明：Heath 英译', entry.proof)
  }

  if (entry.dependencies.length > 0) {
    sections.push(
      '## 证明依赖：点击回到前置结论',
      ...entry.dependencies.map((dependency) => {
        const target = entriesById.get(dependency.id)
        const display = target ? `${citationLabel(target)} · ${target.title}` : dependency.label
        return `- [${display}](/principles/${dependency.id})`
      }),
    )
  }

  const sourceLinks = [
    `- [查阅本条 Perseus 原文](${entry.sourceUrl})`,
    `- [查看完整 TEI/XML 数据与译者署名](${EUCLID_SOURCE.url})`,
    `- 授权：[${EUCLID_SOURCE.license}](${EUCLID_SOURCE.licenseUrl})；译者 ${EUCLID_SOURCE.translator}，${EUCLID_SOURCE.year} 年。`,
  ]

  if (entry.historicalChineseSourceUrl) {
    sourceLinks.push(`- [查阅本卷历史中文原文](${entry.historicalChineseSourceUrl})`)
  } else if (entry.kind === 'proposition') {
    sourceLinks.push('- 当前尚无经过逐条核验、可以公开复用的对应中文古译；因此保留真实英文证明，不冒充已完成中文全译。')
  }

  sections.push('## 来源、版本与授权', ...sourceLinks)
  return sections.join('\n\n')
}

let cachedArticles: Article[] | undefined

export function getEuclidArticles(): Article[] {
  if (!cachedArticles) {
    const baseTimestamp = Date.UTC(2025, 0, 1)
    cachedArticles = EUCLID_ENTRIES.map((entry, index) => ({
      id: entry.id,
      title: `${entry.title} · ${citationLabel(entry)}`,
      summary: entry.historicalChineseStatement
        ? entry.historicalChineseStatement
        : `《几何原本》第 ${entry.book} 卷 · ${chineseKind(entry.kind)} ${entry.proposition}：${entry.title}。附 Heath 原文${entry.proof ? '与完整证明' : ''}及可追溯来源。`,
      content: articleContent(entry),
      topic: '解析几何',
      authorId: 'euclid-perseus',
      authorName: '欧几里得 · Heath 英译',
      createdAt: baseTimestamp - index * 60_000,
    }))
  }
  return cachedArticles
}
