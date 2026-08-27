import { describe, expect, it } from 'vitest'
import {
  ContentModelError,
  createAnnotationIssue,
  createRevision,
  type ReviewDimensionResult,
  type SemanticBlock,
} from '../src/lib/content-model'
import {
  WorkflowPermissionError,
  createReview,
  createRevisionWorkflow,
  isLatestReviewComplete,
  transitionEuclidStatus,
  transitionIssueStatus,
  transitionPublicationStatus,
  type WorkflowActor,
} from '../src/lib/content-workflow'

const block: SemanticBlock = { id: 'I.1.statement', kind: 'statement', order: 0, content: '作等边三角形。' }
const contributor: WorkflowActor = { id: 'contributor', kind: 'human', roles: ['contributor'] }
const editor: WorkflowActor = { id: 'editor', kind: 'human', roles: ['editor'] }
const reviewer: WorkflowActor = { id: 'reviewer', kind: 'human', roles: ['math_reviewer'] }
const publisher: WorkflowActor = { id: 'publisher', kind: 'human', roles: ['publisher'] }
const machine: WorkflowActor = { id: 'machine', kind: 'system', roles: ['admin'] }

function rawRevision() {
  return createRevision({
    id: 'I.1-v1', contentId: 'I.1', version: 1, createdAt: 1, createdBy: 'machine',
    origin: 'machine', euclidStatus: 'raw_machine', changeSummary: '机器导入', blocks: [block],
  })
}

function context(eventId: string) {
  return { eventId, occurredAt: 2, reason: '人工明确执行并记录依据。' }
}

function passedReview(revisionId = 'I.1-v1') {
  const passed: ReviewDimensionResult = 'passed'
  return createReview({
    id: 'review-1', contentId: 'I.1', revisionId,
    mathematicalCorrectness: passed, rigor: passed, completeness: passed,
    clarity: passed, sourceVerification: passed, reviewedAt: 3, summary: '逐项核对通过。',
  }, reviewer)
}

function needsChangesReview(revisionId = 'I.1-v1') {
  return createReview({
    id: 'review-needs-changes', contentId: 'I.1', revisionId,
    mathematicalCorrectness: 'needs_changes', rigor: 'passed', completeness: 'passed',
    clarity: 'passed', sourceVerification: 'passed', reviewedAt: 4, summary: '发现错误，需要修改。',
  }, reviewer)
}

describe('publication lifecycle and permissions', () => {
  it('requires explicit adjacent transitions and keeps an immutable audit trail', () => {
    const initial = createRevisionWorkflow(rawRevision())
    const pending = transitionPublicationStatus(initial, 'pending_review', contributor, context('event-submit'))
    const approved = transitionPublicationStatus(pending, 'approved', editor, {
      ...context('event-approve'), reviews: [passedReview()],
    })

    expect(initial.publicationStatus).toBe('draft')
    expect(initial.events).toHaveLength(0)
    expect(approved.publicationStatus).toBe('approved')
    expect(approved.events.map((event) => event.action)).toEqual(['submit_for_review', 'approve'])
    expect(Object.isFrozen(approved.events)).toBe(true)
  })

  it('blocks ordinary users, machines, skipped review and direct publication', () => {
    const initial = createRevisionWorkflow(rawRevision())
    expect(() => transitionPublicationStatus(initial, 'approved', editor, context('skip')))
      .toThrow(WorkflowPermissionError)
    expect(() => transitionPublicationStatus(initial, 'pending_review', machine, context('machine-submit')))
      .toThrowError(expect.objectContaining({ code: 'HUMAN_REQUIRED' }))

    const pending = transitionPublicationStatus(initial, 'pending_review', contributor, context('submit'))
    expect(() => transitionPublicationStatus(pending, 'approved', contributor, {
      ...context('user-approve'), reviews: [passedReview()],
    })).toThrowError(expect.objectContaining({ code: 'ROLE_REQUIRED' }))
    expect(() => transitionPublicationStatus(pending, 'approved', editor, context('no-review')))
      .toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))
  })

  it('does not publish an approved raw-machine Euclid revision', () => {
    let state = createRevisionWorkflow(rawRevision())
    state = transitionPublicationStatus(state, 'pending_review', contributor, context('submit-raw'))
    state = transitionPublicationStatus(state, 'approved', editor, {
      ...context('approve-raw'), reviews: [passedReview()],
    })
    expect(() => transitionPublicationStatus(state, 'published', publisher, context('publish-raw')))
      .toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))
  })

  it('uses the latest review disposition so needs_changes revokes an earlier pass', () => {
    const reviews = [passedReview(), needsChangesReview()]
    expect(isLatestReviewComplete('I.1', 'I.1-v1', reviews)).toBe(false)

    const pending = transitionPublicationStatus(
      createRevisionWorkflow(rawRevision()),
      'pending_review',
      contributor,
      context('latest-review-submit'),
    )
    expect(() => transitionPublicationStatus(pending, 'approved', editor, {
      ...context('latest-review-approve'), reviews,
    })).toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))

    const approved = transitionPublicationStatus(pending, 'approved', editor, {
      ...context('approved-before-later-review'), reviews: [passedReview()],
    })
    expect(() => transitionPublicationStatus(approved, 'published', publisher, {
      ...context('publish-after-revocation'), reviews,
    })).toThrowError(expect.objectContaining({ code: 'REVIEW_REQUIRED' }))
  })

  it('rejects blank and duplicate workflow event IDs', () => {
    const initial = createRevisionWorkflow(rawRevision())
    expect(() => transitionPublicationStatus(initial, 'pending_review', contributor, context('   ')))
      .toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }))

    const pending = transitionPublicationStatus(initial, 'pending_review', contributor, context('duplicate-event'))
    expect(() => transitionPublicationStatus(pending, 'revision_requested', editor, context('duplicate-event')))
      .toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }))
    expect(pending.events).toHaveLength(1)
  })
})

describe('Euclid trust state', () => {
  it('cannot promote raw machine text directly to reviewed or published', () => {
    const initial = createRevisionWorkflow(rawRevision())
    expect(() => transitionEuclidStatus(initial, 'math_reviewed', reviewer, context('skip-draft')))
      .toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }))
    expect(() => transitionEuclidStatus(initial, 'editor_draft', machine, context('machine-promote')))
      .toThrowError(expect.objectContaining({ code: 'HUMAN_REQUIRED' }))
  })

  it('requires editor draft, human math review, approval, then publisher action', () => {
    let state = createRevisionWorkflow(rawRevision())
    state = transitionEuclidStatus(state, 'editor_draft', editor, context('prepare'))
    state = transitionEuclidStatus(state, 'math_reviewed', reviewer, context('math-review'))
    state = transitionPublicationStatus(state, 'pending_review', contributor, context('submit'))
    state = transitionPublicationStatus(state, 'approved', editor, {
      ...context('approve'), reviews: [passedReview()],
    })
    state = transitionPublicationStatus(state, 'published', publisher, {
      ...context('publish'), reviews: [passedReview()],
    })

    expect(state.publicationStatus).toBe('published')
    expect(state.euclidStatus).toBe('published')
    expect(state.events.at(-1)?.actorId).toBe('publisher')
    expect(state.events.at(-1)?.action).toBe('confirm_euclid_publication')
  })
})

describe('review audit identity', () => {
  it('rejects blank review or reviewer IDs and invalid review time', () => {
    const validInput = {
      id: 'review-valid', contentId: 'I.1', revisionId: 'I.1-v1',
      mathematicalCorrectness: 'passed' as const,
      rigor: 'passed' as const,
      completeness: 'passed' as const,
      clarity: 'passed' as const,
      sourceVerification: 'passed' as const,
      reviewedAt: 3,
      summary: '完整审核。',
    }

    expect(() => createReview({ ...validInput, id: '   ' }, reviewer)).toThrow(ContentModelError)
    expect(() => createReview(validInput, { ...reviewer, id: '   ' })).toThrow(ContentModelError)
    expect(() => createReview({ ...validInput, reviewedAt: -1 }, reviewer)).toThrow(ContentModelError)
  })
})

describe('annotation issue moderation', () => {
  it('allows readers to open issues but only human editors to resolve them', () => {
    const issue = createAnnotationIssue({
      id: 'issue-1', type: 'question', status: 'open', body: '此处为何成立？', createdAt: 1, createdBy: 'reader',
      anchor: {
        contentId: 'I.1', revisionId: 'I.1-v1', blockId: 'I.1.statement', blockVersion: 'hash-1',
        start: 0, end: 2, quote: '作等', prefix: '', suffix: '边三角形',
      },
    })
    expect(() => transitionIssueStatus(issue, 'resolved', contributor))
      .toThrowError(expect.objectContaining({ code: 'ROLE_REQUIRED' }))
    const resolved = transitionIssueStatus(issue, 'resolved', editor)
    expect(issue.status).toBe('open')
    expect(resolved.status).toBe('resolved')
  })
})
