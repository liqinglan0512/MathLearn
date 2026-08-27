import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  hasCompleteVisualizationAttestation,
  resolveEuclidRendererGeometry,
  resolveEuclidTriangleVariant,
  resolveEuclidVisualizationPresentation,
} from '../src/components/geometry/EuclidDiagram'
import {
  EuclidEntryPayloadSchema,
  EuclidVisualizationSchema,
  type EuclidVisualizationAttestation,
} from '../src/lib/euclid-repository'
import { getEuclidRendererDescriptor } from '../src/lib/euclid-renderer-manifest'

const HASH = 'a'.repeat(64)
const I47_RENDERER = getEuclidRendererDescriptor('euclid-1-47')
if (!I47_RENDERER) throw new Error('Test requires the current I.47 renderer manifest entry')
const COMPLETE_ATTESTATION: EuclidVisualizationAttestation = {
  reviewId: 'visual-review-I.47-v1',
  reviewerId: 'leo',
  reviewedAt: 1_787_798_400_000,
  rendererRevision: I47_RENDERER.revision,
  contentHash: HASH,
}

describe('Euclid visualization renderer contracts', () => {
  it('routes only manifest-backed renderers and keeps I.48 on the generic triangle concept', async () => {
    expect(resolveEuclidRendererGeometry('euclid-1-1')).toBe('triangle')
    expect(resolveEuclidRendererGeometry('euclid-1-47')).toBe('triangle')
    expect(resolveEuclidRendererGeometry('euclid-1-48')).toBeNull()
    expect(resolveEuclidRendererGeometry('concept-triangle')).toBe('triangle')
    expect(resolveEuclidRendererGeometry('euclid-9-20')).toBe('number')
    expect(resolveEuclidRendererGeometry('concept-area')).toBe('area')
    expect(resolveEuclidRendererGeometry('unknown-renderer')).toBeNull()
    expect(resolveEuclidTriangleVariant('euclid-1-47')).toBe('pythagorean-squares')
    expect(resolveEuclidTriangleVariant('concept-triangle')).toBe('generic')
    expect(resolveEuclidTriangleVariant('euclid-1-48')).toBe('generic')

    const path = new URL('../public/content/euclid/entries/euclid-1-48.json', import.meta.url)
    const payload = JSON.parse(await readFile(path, 'utf8')) as {
      visualization: { level: string; rendererId: string }
    }
    expect(payload.visualization).toMatchObject({
      level: 'concept_illustration',
      rendererId: 'concept-triangle',
    })
  })

  it('never presents a naked verified enum as human-reviewed', () => {
    const missing = resolveEuclidVisualizationPresentation('verified', 'euclid-1-47')
    expect(missing.effectiveTrustLevel).toBe('proposition_specific')
    expect(missing.label).toBe('命题交互图')
    expect(missing.note).toContain('缺少完整人工核验凭据')
    expect(missing.label).not.toContain('已核验')

    const malformed = { ...COMPLETE_ATTESTATION, contentHash: 'not-a-hash' }
    expect(hasCompleteVisualizationAttestation('euclid-1-47', malformed)).toBe(false)
    expect(resolveEuclidVisualizationPresentation('verified', 'euclid-1-47', malformed).effectiveTrustLevel)
      .toBe('proposition_specific')
  })

  it('uses the verified label only with a complete attestation for the current renderer revision', () => {
    expect(hasCompleteVisualizationAttestation('euclid-1-47', COMPLETE_ATTESTATION)).toBe(true)
    const presentation = resolveEuclidVisualizationPresentation('verified', 'euclid-1-47', COMPLETE_ATTESTATION)
    expect(presentation.effectiveTrustLevel).toBe('verified')
    expect(presentation.label).toBe('已核验命题交互构造')
    expect(presentation.note).toContain(COMPLETE_ATTESTATION.rendererRevision)
  })

  it('downgrades stale revisions and unknown renderers instead of claiming verification', () => {
    const stale = { ...COMPLETE_ATTESTATION, rendererRevision: 'euclid-1-47@renderer-v0' }
    expect(hasCompleteVisualizationAttestation('euclid-1-47', stale)).toBe(false)
    expect(resolveEuclidVisualizationPresentation('verified', 'euclid-1-47', stale).effectiveTrustLevel)
      .toBe('proposition_specific')
    expect(hasCompleteVisualizationAttestation('unknown-renderer', COMPLETE_ATTESTATION)).toBe(false)
    expect(resolveEuclidVisualizationPresentation('verified', 'unknown-renderer', COMPLETE_ATTESTATION).label)
      .not.toContain('已核验')
  })
})

describe('Euclid visualization payload attestation', () => {
  it('rejects verified visualization metadata without a complete attestation', () => {
    const result = EuclidVisualizationSchema.safeParse({
      level: 'verified',
      rendererId: 'euclid-1-47',
      rationale: 'reviewed',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown renderer ids and stale renderer revisions', () => {
    expect(EuclidVisualizationSchema.safeParse({
      level: 'concept_illustration',
      rendererId: 'unknown-renderer',
      rationale: 'unknown',
    }).success).toBe(false)

    expect(EuclidVisualizationSchema.safeParse({
      level: 'verified',
      rendererId: 'euclid-1-47',
      rationale: 'stale renderer review',
      attestation: { ...COMPLETE_ATTESTATION, rendererRevision: 'euclid-1-47@renderer-v0' },
    }).success).toBe(false)
  })

  it('binds a verified attestation to the current content revision hash', async () => {
    const path = new URL('../public/content/euclid/entries/euclid-1-47.json', import.meta.url)
    const payload = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown> & {
      revision: { contentHash: string }
    }
    const attestation = {
      ...COMPLETE_ATTESTATION,
      contentHash: payload.revision.contentHash,
    }
    const verified = {
      ...payload,
      visualization: {
        level: 'verified',
        rendererId: 'euclid-1-47',
        rationale: 'Human-reviewed renderer revision.',
        attestation,
      },
    }

    expect(EuclidEntryPayloadSchema.safeParse(verified).success).toBe(true)
    expect(EuclidEntryPayloadSchema.safeParse({
      ...verified,
      visualization: {
        ...verified.visualization,
        attestation: { ...attestation, contentHash: HASH },
      },
    }).success).toBe(false)
  })
})
