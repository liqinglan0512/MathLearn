import { describe, expect, it } from 'vitest'
import {
  EDITORIAL_STORAGE_KEY,
  EditorialStore,
  EditorialStoreCorruptionError,
  createInMemoryEditorialWriteCoordinator,
  type StorageAdapter,
} from '../src/lib/editorial-store'
import type { ReviewDimensionResult, SemanticBlock } from '../src/lib/content-model'
import type { WorkflowActor } from '../src/lib/content-workflow'

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>()
  writes = 0
  beforeGet: ((key: string) => void) | undefined

  getItem(key: string): string | null {
    this.beforeGet?.(key)
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
    this.writes += 1
  }
}

const rawBlocks: readonly SemanticBlock[] = [
  { id: 'I.1.statement', kind: 'statement', order: 0, content: '机器稿命题' },
  { id: 'I.1.construction.1', kind: 'construction', order: 1, content: '机器稿作图' },
  { id: 'I.1.proof.1', kind: 'proof_step', order: 2, content: '机器稿证明' },
]

const sourceBinding = Object.freeze({
  revisionId: 'euclid-1-1-v1',
  contentHash: 'a'.repeat(64),
})

const editor: WorkflowActor = { id: 'editor-1', kind: 'human', roles: ['editor'] }
const reviewer: WorkflowActor = { id: 'reviewer-1', kind: 'human', roles: ['math_reviewer'] }
const publisher: WorkflowActor = { id: 'publisher-1', kind: 'human', roles: ['publisher'] }
const reader: WorkflowActor = { id: 'reader-1', kind: 'human', roles: ['reader'] }
const system: WorkflowActor = { id: 'system-1', kind: 'system', roles: ['admin'] }

function storeFixture() {
  const storage = new MemoryStorage()
  const writeCoordinator = createInMemoryEditorialWriteCoordinator()
  let sequence = 0
  const store = new EditorialStore(storage, {
    now: () => 1_000 + sequence,
    createId: (prefix) => `${prefix}-${++sequence}`,
    writeCoordinator,
  })
  return { storage, store, writeCoordinator }
}

function initialize(
  store: EditorialStore,
  binding: { readonly revisionId: string; readonly contentHash: string } = sourceBinding,
) {
  return store.initializeEuclidEntry({
    contentId: 'euclid-1-1',
    title: '第一卷·命题 1',
    kind: 'proposition',
    blocks: rawBlocks,
    createdAt: 100,
    revisionId: 'euclid-1-1-v1',
    sourceBinding: binding,
    visualizationTrust: 'concept_illustration',
  })
}

function appendDraft(store: EditorialStore) {
  return store.appendEditorDraft('euclid-1-1', {
    revisionId: 'euclid-1-1-v2',
    expectedPreviousRevisionId: 'euclid-1-1-v1',
    createdAt: 200,
    changeSummary: '逐块完成正式中文初稿。',
    blocks: rawBlocks.map((block) => ({ ...block, content: `正式中文：${block.content}` })),
  }, editor)
}

function completeReview(store: EditorialStore, revisionId = 'euclid-1-1-v2') {
  const passed: ReviewDimensionResult = 'passed'
  return store.addReview('euclid-1-1', revisionId, {
    id: 'review-v2',
    reviewedAt: 300,
    mathematicalCorrectness: passed,
    rigor: passed,
    completeness: passed,
    clarity: passed,
    sourceVerification: passed,
    summary: '逐块与英文底本和证明依赖核对。',
  }, reviewer)
}

function needsChangesReview(id: string) {
  return {
    id,
    reviewedAt: 350,
    mathematicalCorrectness: 'needs_changes' as const,
    rigor: 'passed' as const,
    completeness: 'passed' as const,
    clarity: 'passed' as const,
    sourceVerification: 'passed' as const,
    summary: '后续发现数学错误，必须撤销原批准结论。',
  }
}

async function advanceToApproved(store: EditorialStore) {
  await initialize(store)
  await appendDraft(store)
  await completeReview(store)
  await store.transitionEuclid('euclid-1-1', 'euclid-1-1-v2', 'math_reviewed', reviewer, {
    eventId: 'math-review-event', occurredAt: 310, reason: '人工逐项确认数学正确性。',
  })
  await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'pending_review', editor, {
    eventId: 'submit-event', occurredAt: 320, reason: '提交独立审核。',
  })
  await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'approved', editor, {
    eventId: 'approve-event', occurredAt: 330, reason: '完整 Review 已记录。',
  })
}

describe('append-only Euclid editorial history', () => {
  it('initializes a private raw_machine v1 under a schema-versioned key', async () => {
    const { storage, store } = storeFixture()
    const entry = await initialize(store)

    expect(store.key).toBe(EDITORIAL_STORAGE_KEY)
    expect(JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY)!).schemaVersion).toBe(1)
    expect(entry.revisions).toHaveLength(1)
    expect(entry.revisions[0]).toMatchObject({
      id: 'euclid-1-1-v1', version: 1, origin: 'machine', euclidStatus: 'raw_machine', status: 'draft',
    })
    expect(entry.content.visibility.kind).toBe('private')
    expect(entry.content.publishedRevisionId).toBeUndefined()
    expect(entry.sourceBinding).toEqual(sourceBinding)
  })

  it('serializes StrictMode-style duplicate initialization and writes the seed once', async () => {
    const { storage, store, writeCoordinator } = storeFixture()
    const secondStore = new EditorialStore(storage, { writeCoordinator })

    const [first, second] = await Promise.all([initialize(store), initialize(secondStore)])

    expect(first.revisions).toHaveLength(1)
    expect(second.revisions).toHaveLength(1)
    expect(first.revisions[0].id).toBe('euclid-1-1-v1')
    expect(second.revisions[0].id).toBe('euclid-1-1-v1')
    expect(storage.writes).toBe(1)
  })

  it('appends an editor_draft revision without changing v1 or publishing', async () => {
    const { store } = storeFixture()
    await initialize(store)
    const firstBefore = store.getRevisionByVersion('euclid-1-1', 1)!
    const second = await appendDraft(store)
    const history = store.getHistory('euclid-1-1')

    expect(history.map((revision) => revision.version)).toEqual([1, 2])
    expect(second).toMatchObject({
      previousRevisionId: firstBefore.id,
      createdBy: editor.id,
      changeSummary: '逐块完成正式中文初稿。',
      euclidStatus: 'editor_draft',
      status: 'draft',
    })
    expect(second.blocks.map((block) => [block.id, block.order])).toEqual(
      firstBefore.blocks.map((block) => [block.id, block.order]),
    )
    expect(firstBefore.blocks[0].content).toBe('机器稿命题')
    expect(store.get('euclid-1-1')?.content.publishedRevisionId).toBeUndefined()
  })

  it('rejects reader/system saves and semantic block ID replacement', async () => {
    const { store } = storeFixture()
    await initialize(store)
    const draft = {
      expectedPreviousRevisionId: 'euclid-1-1-v1',
      changeSummary: '尝试保存',
      blocks: rawBlocks.map((block) => ({ ...block, content: `中文：${block.content}` })),
    }
    await expect(store.appendEditorDraft('euclid-1-1', draft, reader))
      .rejects.toThrowError(expect.objectContaining({ code: 'ROLE_REQUIRED' }))
    await expect(store.appendEditorDraft('euclid-1-1', draft, system))
      .rejects.toThrowError(expect.objectContaining({ code: 'HUMAN_REQUIRED' }))
    await expect(store.appendEditorDraft('euclid-1-1', {
      ...draft,
      blocks: draft.blocks.map((block, index) => index === 0 ? { ...block, id: 'array-index-0' } : block),
    }, editor)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    expect(store.getHistory('euclid-1-1')).toHaveLength(1)
  })

  it('rejects a stale editor base instead of overwriting a newer revision', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)

    await expect(store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3',
      expectedPreviousRevisionId: 'euclid-1-1-v1',
      createdAt: 210,
      changeSummary: '陈旧标签页尝试覆盖后续编辑。',
      blocks: rawBlocks.map((block) => ({ ...block, content: `陈旧编辑：${block.content}` })),
    }, editor)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    expect(store.getHistory('euclid-1-1').map((revision) => revision.id)).toEqual([
      'euclid-1-1-v1',
      'euclid-1-1-v2',
    ])
  })

  it('serializes the whole transaction so two stores cannot append over the same base', async () => {
    const { storage, store, writeCoordinator } = storeFixture()
    await initialize(store)
    const secondStore = new EditorialStore(storage, {
      writeCoordinator,
      now: () => 220,
      createId: (prefix) => `${prefix}-second-store`,
    })
    const commonInput = {
      expectedPreviousRevisionId: 'euclid-1-1-v1',
      changeSummary: '两个标签页基于同一版本同时保存。',
      blocks: rawBlocks.map((block) => ({ ...block, content: `并发中文：${block.content}` })),
    }

    const results = await Promise.allSettled([
      store.appendEditorDraft('euclid-1-1', { ...commonInput, revisionId: 'euclid-1-1-v2-a' }, editor),
      secondStore.appendEditorDraft('euclid-1-1', { ...commonInput, revisionId: 'euclid-1-1-v2-b' }, editor),
    ])

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected'])
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    expect(rejected?.reason).toMatchObject({ code: 'EDITORIAL_STORE_CONFLICT' })
    expect(store.getHistory('euclid-1-1')).toHaveLength(2)
    expect(store.getHistory('euclid-1-1').filter((revision) => revision.version === 2)).toHaveLength(1)
  })

  it('keeps writes disabled when no atomic coordinator is available', async () => {
    const storage = new MemoryStorage()
    const store = new EditorialStore(storage)

    await expect(initialize(store)).rejects.toThrowError(expect.objectContaining({
      code: 'EDITORIAL_STORE_CONFLICT',
    }))
    expect(storage.values.has(EDITORIAL_STORAGE_KEY)).toBe(false)
  })

  it('detects an uncoordinated storage change before the locked commit', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    let operationReads = 0
    let concurrentBytes = ''
    storage.beforeGet = (key) => {
      operationReads += 1
      if (operationReads === 2) {
        concurrentBytes = `${storage.values.get(key)!} `
        storage.values.set(key, concurrentBytes)
        storage.beforeGet = undefined
      }
    }

    await expect(appendDraft(store)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe(concurrentBytes)
    expect(store.getHistory('euclid-1-1').map((revision) => revision.id)).toEqual(['euclid-1-1-v1'])
  })

  it('fails closed when legacy local history has no source binding', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    const raw = JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY)!)
    delete raw.entries['euclid-1-1'].sourceBinding
    const legacyBytes = JSON.stringify(raw)
    storage.values.set(EDITORIAL_STORAGE_KEY, legacyBytes)
    const writesBefore = storage.writes

    await expect(initialize(store)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe(legacyBytes)
    expect(storage.writes).toBe(writesBefore)
  })

  it('fails closed when the bound source revision or content hash changes', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    const originalBytes = storage.values.get(EDITORIAL_STORAGE_KEY)
    const writesBefore = storage.writes

    await expect(initialize(store, {
      revisionId: 'euclid-1-1-source-v2',
      contentHash: 'b'.repeat(64),
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe(originalBytes)
    expect(storage.writes).toBe(writesBefore)
    expect(store.get('euclid-1-1')?.sourceBinding).toEqual(sourceBinding)
  })
})
describe('human review and publication workflow', () => {
  it('reuses guarded workflow actions through math review and explicit publication', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)
    await completeReview(store)

    await store.transitionEuclid('euclid-1-1', 'euclid-1-1-v2', 'math_reviewed', reviewer, {
      eventId: 'math-review-event', occurredAt: 310, reason: '人工逐项确认数学正确性。',
    })
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'pending_review', editor, {
      eventId: 'submit-event', occurredAt: 320, reason: '提交独立审核。',
    })
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'approved', editor, {
      eventId: 'approve-event', occurredAt: 330, reason: '完整 Review 已记录。',
    })
    const published = await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'published', publisher, {
      eventId: 'publish-event', occurredAt: 340, reason: '人工决定发布该 Revision。',
    })

    expect(published.publicationStatus).toBe('published')
    expect(published.euclidStatus).toBe('published')
    expect(published.events.at(-1)?.action).toBe('confirm_euclid_publication')
    expect(store.get('euclid-1-1')?.content).toMatchObject({
      publishedRevisionId: 'euclid-1-1-v2', visibility: { kind: 'public' },
    })
  })

  it('requires approval withdrawal and a new draft before recording a late negative review', async () => {
    const { storage, store } = storeFixture()
    await advanceToApproved(store)
    const approvedBytes = storage.values.get(EDITORIAL_STORAGE_KEY)
    const writesBefore = storage.writes

    await expect(store.addReview(
      'euclid-1-1',
      'euclid-1-1-v2',
      needsChangesReview('late-negative-approved'),
      reviewer,
    )).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe(approvedBytes)
    expect(storage.writes).toBe(writesBefore)
    expect(store.get('euclid-1-1')?.workflows['euclid-1-1-v2'].publicationStatus).toBe('approved')

    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'revision_requested', reviewer, {
      eventId: 'withdraw-approval-event', occurredAt: 360, reason: '发现新错误，先显式撤回批准。',
    })
    await expect(store.addReview(
      'euclid-1-1',
      'euclid-1-1-v2',
      needsChangesReview('late-negative-after-withdrawal'),
      reviewer,
    )).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    const withdrawnBlocks = store.get('euclid-1-1')!.revisions.at(-1)!.blocks
    await store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3',
      expectedPreviousRevisionId: 'euclid-1-1-v2',
      createdAt: 370,
      changeSummary: '根据后续发现的问题建立新编辑稿。',
      blocks: withdrawnBlocks.map((block) => ({ ...block, content: `${block.content}（待修订）` })),
    }, editor)
    await store.addReview(
      'euclid-1-1',
      'euclid-1-1-v3',
      needsChangesReview('late-negative-on-new-draft'),
      reviewer,
    )

    const snapshot = store.get('euclid-1-1')!
    expect(snapshot.workflows['euclid-1-1-v2'].publicationStatus).toBe('revision_requested')
    expect(snapshot.workflows['euclid-1-1-v2'].euclidStatus).toBe('math_reviewed')
    expect(snapshot.workflows['euclid-1-1-v3'].euclidStatus).toBe('editor_draft')
    expect(snapshot.reviews.at(-1)?.revisionId).toBe('euclid-1-1-v3')
    expect(snapshot.reviews.at(-1)?.mathematicalCorrectness).toBe('needs_changes')
    expect(store.inspect().ok).toBe(true)
  })

  it('remembers an earlier approval after withdrawal and still requires a new Revision', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)
    await completeReview(store)
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'pending_review', editor, {
      eventId: 'submit-before-math-review', occurredAt: 310, reason: '先提交发布审核。',
    })
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'approved', editor, {
      eventId: 'approve-before-math-review', occurredAt: 320, reason: '发布维度审核先通过。',
    })
    await expect(store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3-too-early',
      expectedPreviousRevisionId: 'euclid-1-1-v2',
      createdAt: 325,
      changeSummary: '尚未撤回批准时不应建立新稿。',
      blocks: store.get('euclid-1-1')!.revisions.at(-1)!.blocks,
    }, editor)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'revision_requested', reviewer, {
      eventId: 'withdraw-approval-before-math-review', occurredAt: 330, reason: '发现问题，撤回批准。',
    })
    await expect(store.addReview(
      'euclid-1-1',
      'euclid-1-1-v2',
      needsChangesReview('late-negative-after-approval-history'),
      reviewer,
    )).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    const previousBlocks = store.get('euclid-1-1')!.revisions.at(-1)!.blocks
    await store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3',
      expectedPreviousRevisionId: 'euclid-1-1-v2',
      createdAt: 340,
      changeSummary: '把撤回批准后的问题移入新版本。',
      blocks: previousBlocks.map((block) => ({ ...block, content: `${block.content}（待复核）` })),
    }, editor)
    await store.addReview(
      'euclid-1-1',
      'euclid-1-1-v3',
      needsChangesReview('negative-on-successor-revision'),
      reviewer,
    )

    const snapshot = store.get('euclid-1-1')!
    expect(snapshot.workflows['euclid-1-1-v2']).toMatchObject({
      publicationStatus: 'revision_requested', euclidStatus: 'editor_draft',
    })
    expect(snapshot.reviews.at(-1)?.revisionId).toBe('euclid-1-1-v3')
    expect(store.inspect().ok).toBe(true)
  })

  it('requires archival and a new draft before recording a late negative review on published content', async () => {
    const { storage, store } = storeFixture()
    await advanceToApproved(store)
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'published', publisher, {
      eventId: 'publish-before-late-review', occurredAt: 340, reason: '人工决定发布该 Revision。',
    })
    const publishedBytes = storage.values.get(EDITORIAL_STORAGE_KEY)
    const writesBefore = storage.writes

    await expect(store.addReview(
      'euclid-1-1',
      'euclid-1-1-v2',
      needsChangesReview('late-negative-published'),
      reviewer,
    )).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe(publishedBytes)
    expect(storage.writes).toBe(writesBefore)
    expect(store.get('euclid-1-1')?.content.publishedRevisionId).toBe('euclid-1-1-v2')
    await expect(store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3-too-early',
      expectedPreviousRevisionId: 'euclid-1-1-v2',
      createdAt: 350,
      changeSummary: '尚未归档时不应建立新稿。',
      blocks: store.get('euclid-1-1')!.revisions.at(-1)!.blocks,
    }, editor)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'archived', publisher, {
      eventId: 'archive-before-late-review', occurredAt: 360, reason: '发现新错误，先显式归档。',
    })
    await expect(store.addReview(
      'euclid-1-1',
      'euclid-1-1-v2',
      needsChangesReview('late-negative-after-archive'),
      reviewer,
    )).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    const archivedBlocks = store.get('euclid-1-1')!.revisions.at(-1)!.blocks
    await store.appendEditorDraft('euclid-1-1', {
      revisionId: 'euclid-1-1-v3',
      expectedPreviousRevisionId: 'euclid-1-1-v2',
      createdAt: 370,
      changeSummary: '归档旧发布稿后建立新编辑稿。',
      blocks: archivedBlocks.map((block) => ({ ...block, content: `${block.content}（待修订）` })),
    }, editor)
    await store.addReview(
      'euclid-1-1',
      'euclid-1-1-v3',
      needsChangesReview('late-negative-on-new-version'),
      reviewer,
    )

    const snapshot = store.get('euclid-1-1')!
    expect(snapshot.workflows['euclid-1-1-v2'].publicationStatus).toBe('archived')
    expect(snapshot.workflows['euclid-1-1-v2'].euclidStatus).toBe('published')
    expect(snapshot.workflows['euclid-1-1-v3'].euclidStatus).toBe('editor_draft')
    expect(snapshot.content).toMatchObject({ visibility: { kind: 'private' } })
    expect(snapshot.content.publishedRevisionId).toBeUndefined()
    expect(snapshot.reviews.at(-1)?.revisionId).toBe('euclid-1-1-v3')
    expect(snapshot.reviews.at(-1)?.mathematicalCorrectness).toBe('needs_changes')
    expect(store.inspect().ok).toBe(true)
  })

  it('rejects ordinary users, systems, missing review and skipped states', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)
    await expect(store.transitionEuclid('euclid-1-1', 'euclid-1-1-v2', 'math_reviewed', system, {
      reason: '系统自动确认。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'HUMAN_REQUIRED' }))
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'published', publisher, {
      reason: '跳过审核。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }))
    await expect(store.addReview('euclid-1-1', 'euclid-1-1-v2', {
      mathematicalCorrectness: 'passed', rigor: 'passed', completeness: 'passed', clarity: 'passed',
      sourceVerification: 'passed', summary: '普通用户伪造审核。',
    }, reader)).rejects.toThrowError(expect.objectContaining({ code: 'ROLE_REQUIRED' }))
    expect(store.get('euclid-1-1')?.content.publishedRevisionId).toBeUndefined()
  })

  it('keeps historical revisions read-only for reviews and workflow changes', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)

    await expect(store.addReview('euclid-1-1', 'euclid-1-1-v1', {
      id: 'historical-review',
      reviewedAt: 300,
      mathematicalCorrectness: 'passed',
      rigor: 'passed',
      completeness: 'passed',
      clarity: 'passed',
      sourceVerification: 'passed',
      summary: '不应允许写入历史版本。',
    }, reviewer)).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    await expect(store.transitionEuclid('euclid-1-1', 'euclid-1-1-v1', 'editor_draft', editor, {
      eventId: 'historical-euclid-event', occurredAt: 310, reason: '不应改变历史 Euclid 状态。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v1', 'pending_review', editor, {
      eventId: 'historical-publication-event', occurredAt: 320, reason: '不应改变历史发布状态。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    const snapshot = store.get('euclid-1-1')!
    expect(snapshot.reviews).toHaveLength(0)
    expect(snapshot.workflows['euclid-1-1-v1']).toMatchObject({
      publicationStatus: 'draft', euclidStatus: 'raw_machine', events: [],
    })
  })

  it('cannot upgrade, approve or publish the initial machine revision in place', async () => {
    const { store } = storeFixture()
    await initialize(store)

    await expect(store.transitionEuclid('euclid-1-1', 'euclid-1-1-v1', 'editor_draft', editor, {
      eventId: 'machine-prepare-event', occurredAt: 290, reason: '尝试原地接受机器稿。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    await completeReview(store, 'euclid-1-1-v1')
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v1', 'pending_review', editor, {
      eventId: 'machine-submit-event', occurredAt: 310, reason: '提交机器原稿。',
    })
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v1', 'approved', editor, {
      eventId: 'machine-approve-event', occurredAt: 320, reason: '尝试批准机器原稿。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v1', 'published', publisher, {
      eventId: 'machine-publish-event', occurredAt: 330, reason: '尝试发布机器原稿。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'EDITORIAL_STORE_CONFLICT' }))

    expect(store.get('euclid-1-1')?.content.publishedRevisionId).toBeUndefined()
    expect(store.get('euclid-1-1')?.workflows['euclid-1-1-v1']).toMatchObject({
      publicationStatus: 'pending_review', euclidStatus: 'raw_machine',
    })
  })

  it('lets a later needs_changes review revoke an earlier complete review', async () => {
    const { store } = storeFixture()
    await initialize(store)
    await appendDraft(store)
    await completeReview(store)
    await store.addReview('euclid-1-1', 'euclid-1-1-v2', {
      id: 'review-v2-needs-changes',
      reviewedAt: 305,
      mathematicalCorrectness: 'needs_changes',
      rigor: 'passed',
      completeness: 'passed',
      clarity: 'passed',
      sourceVerification: 'passed',
      summary: '发现数学错误，撤回此前通过结论。',
    }, reviewer)

    await expect(store.transitionEuclid('euclid-1-1', 'euclid-1-1-v2', 'math_reviewed', reviewer, {
      eventId: 'review-revoked-math-event', occurredAt: 310, reason: '不应确认数学审核。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))
    await store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'pending_review', editor, {
      eventId: 'review-revoked-submit-event', occurredAt: 320, reason: '提交审核以验证否决门槛。',
    })
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'approved', editor, {
      eventId: 'review-revoked-approve-event', occurredAt: 330, reason: '不应批准已撤回的 Review。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))

    expect(store.get('euclid-1-1')?.workflows['euclid-1-1-v2']).toMatchObject({
      publicationStatus: 'pending_review', euclidStatus: 'editor_draft',
    })
  })

  it('rejects invalid review and event identifiers before persisting them', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    await appendDraft(store)
    const writesBefore = storage.writes

    await expect(store.addReview('euclid-1-1', 'euclid-1-1-v2', {
      id: '   ',
      reviewedAt: 300,
      mathematicalCorrectness: 'passed',
      rigor: 'passed',
      completeness: 'passed',
      clarity: 'passed',
      sourceVerification: 'passed',
      summary: 'ID 为空的 Review 不应落盘。',
    }, reviewer)).rejects.toThrow()
    await expect(store.transitionPublication('euclid-1-1', 'euclid-1-1-v2', 'pending_review', editor, {
      eventId: '   ', occurredAt: 310, reason: '事件 ID 为空，不应落盘。',
    })).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }))

    expect(storage.writes).toBe(writesBefore)
    expect(store.get('euclid-1-1')?.reviews).toHaveLength(0)
    expect(store.get('euclid-1-1')?.workflows['euclid-1-1-v2'].events).toHaveLength(0)
  })
})

describe('corruption safety', () => {
  it('returns a safe empty inspection result and preserves malformed bytes', async () => {
    const { storage, store } = storeFixture()
    storage.values.set(EDITORIAL_STORAGE_KEY, '{not-json')
    const writesBefore = storage.writes
    const inspected = store.inspect()

    expect(inspected.ok).toBe(false)
    expect(inspected.entries).toEqual([])
    expect(inspected.ok ? undefined : inspected.error).toBeInstanceOf(EditorialStoreCorruptionError)
    expect(storage.values.get(EDITORIAL_STORAGE_KEY)).toBe('{not-json')
    expect(storage.writes).toBe(writesBefore)
    expect(() => store.list()).toThrow(EditorialStoreCorruptionError)
  })

  it('does not trust a hand-edited published status without an audit trail', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    const raw = JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY)!)
    raw.entries['euclid-1-1'].workflows['euclid-1-1-v1'].publicationStatus = 'published'
    raw.entries['euclid-1-1'].workflows['euclid-1-1-v1'].euclidStatus = 'published'
    raw.entries['euclid-1-1'].content.publishedRevisionId = 'euclid-1-1-v1'
    storage.values.set(EDITORIAL_STORAGE_KEY, JSON.stringify(raw))

    const inspected = store.inspect()
    expect(inspected.ok).toBe(false)
    expect(inspected.entries).toEqual([])
  })

  it('does not treat public visibility alone as publication', async () => {
    const { storage, store } = storeFixture()
    await initialize(store)
    const raw = JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY)!)
    raw.entries['euclid-1-1'].content.visibility = { kind: 'public' }
    storage.values.set(EDITORIAL_STORAGE_KEY, JSON.stringify(raw))

    expect(store.inspect()).toMatchObject({ ok: false, entries: [] })
  })
})
