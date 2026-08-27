import { describe, expect, it } from 'vitest'
import {
  blockCitationEvidence,
  citationEvidenceLabel,
  groupUnlocatedCitationEdges,
  historicalReaderSurfaces,
} from '../src/lib/euclid-reader'

describe('Euclid historical translation reading order', () => {
  const block = {
    surfaces: [
      { role: 'machine_translation', text: '现代中文主译' },
      { role: 'source', text: 'Heath English' },
      { role: 'historical_source', text: '歷史中譯原文' },
      { role: 'historical_machine_interpretation', text: '历史中译的现代汉语解读' },
    ],
  }

  it('places the modern interpretation above the historical original regardless of source order', () => {
    expect(historicalReaderSurfaces(block, '现代中文主译').map((surface) => surface.role)).toEqual([
      'historical_machine_interpretation',
      'historical_source',
    ])
  })

  it('does not duplicate a historical interpretation already used as primary text', () => {
    expect(historicalReaderSurfaces(block, '历史中译的现代汉语解读').map((surface) => surface.role)).toEqual([
      'historical_source',
    ])
  })
})

describe('Euclid citation provenance in the reader', () => {
  const edges = [
    {
      targetContentId: 'euclid-1-1',
      sourceBlockIds: ['euclid-1-2.proof.1'],
      provenance: { kind: 'editorial_inference' as const },
    },
    {
      targetContentId: 'euclid-1-3',
      sourceBlockIds: [],
      provenance: { kind: 'explicit_source_reference' as const },
    },
    {
      targetContentId: 'euclid-1-4',
      sourceBlockIds: [],
      provenance: { kind: 'editorial_inference' as const },
    },
  ]

  it('never labels a block-level editorial inference as an explicit source reference', () => {
    const evidence = blockCitationEvidence(edges, 'euclid-1-2.proof.1', 'euclid-1-1')
    expect(evidence).toBe('editorial_inference')
    expect(citationEvidenceLabel(evidence)).toBe('编辑推断 · 非原文引用')
    expect(citationEvidenceLabel(evidence)).not.toContain('原文明确引用')
  })

  it('partitions unlocated explicit references and editorial inferences', () => {
    const grouped = groupUnlocatedCitationEdges(edges)
    expect(grouped.explicit.map((edge) => edge.targetContentId)).toEqual(['euclid-1-3'])
    expect(grouped.editorial.map((edge) => edge.targetContentId)).toEqual(['euclid-1-4'])
  })
})
