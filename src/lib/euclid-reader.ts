export type EuclidCitationProvenance = 'explicit_source_reference' | 'editorial_inference'
export type EuclidCitationEvidence = EuclidCitationProvenance | 'mixed' | 'unknown'

interface SurfaceLike {
  readonly role: string
  readonly text: string
}

interface BlockLike {
  readonly surfaces: readonly SurfaceLike[]
}

interface EdgeLike {
  readonly targetContentId: string
  readonly sourceBlockIds: readonly string[]
  readonly provenance: { readonly kind: EuclidCitationProvenance }
}

export interface HistoricalReaderSurface {
  readonly role: 'historical_machine_interpretation' | 'historical_source'
  readonly text: string
  readonly label: string
  readonly readingRole: 'historical-modern' | 'historical-original'
}

const HISTORICAL_SURFACE_PRESENTATION: readonly Omit<HistoricalReaderSurface, 'text'>[] = [
  {
    role: 'historical_machine_interpretation',
    label: '历史中译的现代汉语解读 · 机器辅助',
    readingRole: 'historical-modern',
  },
  {
    role: 'historical_source',
    label: '历史中译原文 · 徐光启、利玛窦',
    readingRole: 'historical-original',
  },
]

/** Keep the explanatory modern Chinese immediately above its historical source. */
export function historicalReaderSurfaces(block: BlockLike, primaryText = ''): HistoricalReaderSurface[] {
  return HISTORICAL_SURFACE_PRESENTATION.flatMap((presentation) => {
    const text = block.surfaces.find((surface) => surface.role === presentation.role)?.text.trim() ?? ''
    if (!text || text === primaryText) return []
    return [{ ...presentation, text }]
  })
}

export function citationEvidenceLabel(evidence: EuclidCitationEvidence): string {
  if (evidence === 'explicit_source_reference') return '原文明确引用'
  if (evidence === 'editorial_inference') return '编辑推断 · 非原文引用'
  if (evidence === 'mixed') return '原文明确引用 + 编辑推断'
  return '引用来源待核对'
}

export function blockCitationEvidence(
  edges: readonly EdgeLike[],
  blockId: string,
  targetContentId: string,
): EuclidCitationEvidence {
  const provenance = new Set(
    edges
      .filter((edge) => edge.targetContentId === targetContentId && edge.sourceBlockIds.includes(blockId))
      .map((edge) => edge.provenance.kind),
  )
  if (provenance.has('explicit_source_reference') && provenance.has('editorial_inference')) return 'mixed'
  if (provenance.has('explicit_source_reference')) return 'explicit_source_reference'
  if (provenance.has('editorial_inference')) return 'editorial_inference'
  return 'unknown'
}

export function groupUnlocatedCitationEdges<T extends EdgeLike>(edges: readonly T[]): {
  explicit: T[]
  editorial: T[]
} {
  const unlocated = edges.filter((edge) => edge.sourceBlockIds.length === 0)
  return {
    explicit: unlocated.filter((edge) => edge.provenance.kind === 'explicit_source_reference'),
    editorial: unlocated.filter((edge) => edge.provenance.kind === 'editorial_inference'),
  }
}
