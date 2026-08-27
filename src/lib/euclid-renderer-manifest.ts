import manifestSource from './euclid-renderer-manifest.json?raw'

export const EUCLID_RENDERER_GEOMETRIES = [
  'triangle',
  'parallel',
  'circle',
  'polygon',
  'area',
  'ratio',
  'number',
  'irrational',
  'solid',
] as const

export type EuclidRendererGeometry = (typeof EUCLID_RENDERER_GEOMETRIES)[number]
export type EuclidRendererScope = 'concept_illustration' | 'proposition_specific'

export interface EuclidRendererDescriptor {
  readonly id: string
  readonly geometry: EuclidRendererGeometry
  readonly scope: EuclidRendererScope
  readonly revision: string
}

interface EuclidRendererManifest {
  readonly schemaVersion: 1
  readonly renderers: readonly EuclidRendererDescriptor[]
}

const GEOMETRIES = new Set<string>(EUCLID_RENDERER_GEOMETRIES)
const SCOPES = new Set<string>(['concept_illustration', 'proposition_specific'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseRendererManifest(source: string): EuclidRendererManifest {
  const value: unknown = JSON.parse(source)
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.renderers)) {
    throw new Error('Euclid renderer manifest has an unsupported shape or schema version')
  }

  const ids = new Set<string>()
  const revisions = new Set<string>()
  const renderers = value.renderers.map((candidate, index): EuclidRendererDescriptor => {
    if (!isRecord(candidate)
      || typeof candidate.id !== 'string' || !candidate.id.trim()
      || typeof candidate.geometry !== 'string' || !GEOMETRIES.has(candidate.geometry)
      || typeof candidate.scope !== 'string' || !SCOPES.has(candidate.scope)
      || typeof candidate.revision !== 'string' || !candidate.revision.trim()) {
      throw new Error(`Euclid renderer manifest entry ${index} is invalid`)
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate Euclid renderer id: ${candidate.id}`)
    if (revisions.has(candidate.revision)) throw new Error(`Duplicate Euclid renderer revision: ${candidate.revision}`)
    ids.add(candidate.id)
    revisions.add(candidate.revision)
    return Object.freeze({
      id: candidate.id,
      geometry: candidate.geometry as EuclidRendererGeometry,
      scope: candidate.scope as EuclidRendererScope,
      revision: candidate.revision,
    })
  })

  return Object.freeze({ schemaVersion: 1, renderers: Object.freeze(renderers) })
}

export const EUCLID_RENDERER_MANIFEST = parseRendererManifest(manifestSource)

const RENDERERS_BY_ID = new Map(
  EUCLID_RENDERER_MANIFEST.renderers.map((renderer) => [renderer.id, renderer] as const),
)

export function getEuclidRendererDescriptor(rendererId: string | null | undefined): EuclidRendererDescriptor | null {
  if (!rendererId) return null
  return RENDERERS_BY_ID.get(rendererId) ?? null
}

export function isCurrentEuclidRendererRevision(
  rendererId: string | null | undefined,
  rendererRevision: string | null | undefined,
): boolean {
  const renderer = getEuclidRendererDescriptor(rendererId)
  return Boolean(renderer && rendererRevision === renderer.revision)
}
