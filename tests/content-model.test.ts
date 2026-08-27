import { describe, expect, it } from 'vitest'
import {
  ContentModelError,
  attachRevision,
  createAnnotationIssue,
  createContentItem,
  createNextRevision,
  createRevision,
  reorderSemanticBlocks,
  validateEdges,
  type Edge,
  type SemanticBlock,
} from '../src/lib/content-model'

const blocks: readonly SemanticBlock[] = [
  { id: 'I.5.statement', kind: 'statement', order: 0, content: '命题陈述' },
  { id: 'I.5.proof.1', kind: 'proof_step', order: 1, content: '第一步证明' },
]

function revision() {
  return createRevision({
    id: 'revision-I.5-v1',
    contentId: 'euclid-I.5',
    version: 1,
    createdAt: 1,
    createdBy: 'editor-1',
    origin: 'machine',
    euclidStatus: 'raw_machine',
    changeSummary: '导入机器草稿',
    blocks,
  })
}

describe('immutable revision and stable semantic blocks', () => {
  it('freezes revision content and creates an append-only next revision', () => {
    const first = revision()
    const second = createNextRevision(first, {
      id: 'revision-I.5-v2',
      createdAt: 2,
      createdBy: 'editor-1',
      origin: 'human',
      euclidStatus: 'editor_draft',
      changeSummary: '澄清第一步',
      blocks: [{ ...blocks[0] }, { ...blocks[1], content: '澄清后的第一步证明' }],
    })

    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.blocks)).toBe(true)
    expect(second.version).toBe(2)
    expect(second.previousRevisionId).toBe(first.id)
    expect(first.blocks[1].content).toBe('第一步证明')
    expect(second.blocks[1].id).toBe(first.blocks[1].id)
  })

  it('keeps permanent IDs when presentation order changes', () => {
    const reordered = reorderSemanticBlocks(blocks, ['I.5.proof.1', 'I.5.statement'])
    expect(reordered.map((block) => [block.id, block.order])).toEqual([
      ['I.5.proof.1', 0],
      ['I.5.statement', 1],
    ])
    expect(blocks[0].order).toBe(0)
  })

  it('rejects duplicate block IDs and machine-created reviewed content', () => {
    expect(() => createRevision({
      id: 'bad', contentId: 'euclid-I.5', version: 1, createdAt: 1, createdBy: 'machine',
      origin: 'machine', euclidStatus: 'editor_draft', changeSummary: 'bad',
      blocks: [blocks[0], { ...blocks[1], id: blocks[0].id }],
    })).toThrow(ContentModelError)
  })

  it('attaches revisions without mutating the content item', () => {
    const content = createContentItem({
      id: 'euclid-I.5', kind: 'proposition', title: '命题 I.5', createdAt: 1, createdBy: 'editor-1',
      visibility: { kind: 'private' }, visualizationTrust: 'concept_illustration',
    })
    const next = attachRevision(content, revision())
    expect(content.revisionIds).toEqual([])
    expect(next.revisionIds).toEqual(['revision-I.5-v1'])
    expect(next.currentRevisionId).toBe('revision-I.5-v1')
  })
})

describe('anchors, visibility and dependency validation', () => {
  it('requires restricted visibility to have an explicit whitelist', () => {
    expect(() => createContentItem({
      id: 'private-proof', kind: 'proof', title: '内部证明', createdAt: 1, createdBy: 'editor-1',
      visibility: { kind: 'restricted', allowedUserIds: [] }, visualizationTrust: 'none',
    })).toThrow(ContentModelError)
  })

  it('binds an issue to revision, stable block, version and textual context', () => {
    const issue = createAnnotationIssue({
      id: 'issue-1', type: 'possible_error', status: 'open', body: '这里似乎多用了一个条件。',
      createdAt: 2, createdBy: 'reader-1',
      anchor: {
        contentId: 'euclid-I.5', revisionId: 'revision-I.5-v1', blockId: 'I.5.proof.1',
        blockVersion: 'v1-hash', start: 2, end: 6, quote: '第一步证', prefix: '命题', suffix: '明',
      },
    })
    expect(issue.anchor.blockId).toBe('I.5.proof.1')
    expect(Object.isFrozen(issue.anchor)).toBe(true)
  })

  it('detects dangling, self and duplicate dependency edges', () => {
    const base: Edge = {
      id: 'edge-1',
      source: { contentId: 'I.5' },
      target: { contentId: 'I.4' },
      type: 'depends_on',
      provenance: { kind: 'explicit_source_reference', citation: 'Book I · Proposition 4' },
      createdAt: 1,
      createdBy: 'editor-1',
    }
    const issues = validateEdges(new Set(['I.5', 'I.4']), [
      base,
      { ...base, id: 'edge-2' },
      { ...base, id: 'edge-3', target: { contentId: 'I.5' } },
      { ...base, id: 'edge-4', target: { contentId: 'missing' } },
      { ...base, target: { contentId: 'I.4', blockId: 'another-block' }, type: 'cites' },
    ])
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'DUPLICATE_EDGE', 'SELF_REFERENCE', 'DANGLING_EDGE',
    ]))
  })
})
