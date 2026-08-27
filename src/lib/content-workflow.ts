import {
  ContentModelError,
  type AnnotationIssue,
  type EuclidContentStatus,
  type IssueStatus,
  type PublicationStatus,
  type Review,
  type ReviewDimensionResult,
  type Revision,
  isReviewComplete,
} from './content-model'

export type EditorialRole =
  | 'reader'
  | 'contributor'
  | 'editor'
  | 'math_reviewer'
  | 'publisher'
  | 'admin'

export interface WorkflowActor {
  readonly id: string
  readonly kind: 'human' | 'system'
  readonly roles: readonly EditorialRole[]
}

export type WorkflowAction =
  | 'submit_for_review'
  | 'request_revision'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'archive'
  | 'prepare_editor_draft'
  | 'confirm_math_review'
  | 'confirm_euclid_publication'

export interface WorkflowEvent {
  readonly id: string
  readonly revisionId: string
  readonly action: WorkflowAction
  readonly fromPublicationStatus: PublicationStatus
  readonly toPublicationStatus: PublicationStatus
  readonly fromEuclidStatus?: EuclidContentStatus
  readonly toEuclidStatus?: EuclidContentStatus
  readonly actorId: string
  readonly occurredAt: number
  readonly reason: string
}

export interface RevisionWorkflowState {
  readonly revisionId: string
  readonly contentId: string
  readonly publicationStatus: PublicationStatus
  readonly euclidStatus?: EuclidContentStatus
  readonly events: readonly WorkflowEvent[]
}

export class WorkflowPermissionError extends Error {
  readonly code: 'HUMAN_REQUIRED' | 'ROLE_REQUIRED' | 'INVALID_TRANSITION' | 'REVIEW_REQUIRED'

  constructor(code: WorkflowPermissionError['code'], message: string) {
    super(message)
    this.name = 'WorkflowPermissionError'
    this.code = code
  }
}

const PUBLICATION_ACTION: Partial<Record<PublicationStatus, Partial<Record<PublicationStatus, WorkflowAction>>>> = {
  draft: { pending_review: 'submit_for_review', archived: 'archive' },
  pending_review: {
    revision_requested: 'request_revision',
    approved: 'approve',
    rejected: 'reject',
    archived: 'archive',
  },
  revision_requested: { pending_review: 'submit_for_review', archived: 'archive' },
  approved: { published: 'publish', revision_requested: 'request_revision', archived: 'archive' },
  published: { archived: 'archive' },
  rejected: { archived: 'archive' },
}

const ACTION_ROLES: Record<WorkflowAction, readonly EditorialRole[]> = {
  submit_for_review: ['contributor', 'editor', 'admin'],
  request_revision: ['editor', 'math_reviewer', 'admin'],
  approve: ['editor', 'math_reviewer', 'admin'],
  reject: ['editor', 'math_reviewer', 'admin'],
  publish: ['publisher', 'admin'],
  archive: ['publisher', 'admin'],
  prepare_editor_draft: ['editor', 'admin'],
  confirm_math_review: ['math_reviewer', 'admin'],
  confirm_euclid_publication: ['publisher', 'admin'],
}

function requireHuman(actor: WorkflowActor): void {
  if (actor.kind !== 'human') {
    throw new WorkflowPermissionError('HUMAN_REQUIRED', '机器或后台任务不能完成数学审核或发布动作。')
  }
}

function requireRole(actor: WorkflowActor, action: WorkflowAction): void {
  requireHuman(actor)
  const allowed = ACTION_ROLES[action]
  if (!actor.roles.some((role) => allowed.includes(role))) {
    throw new WorkflowPermissionError('ROLE_REQUIRED', `操作者无权执行 ${action}。`)
  }
}

function requireReason(reason: string): string {
  const normalized = reason.trim()
  if (!normalized) throw new WorkflowPermissionError('INVALID_TRANSITION', '每次审核状态变化都必须记录明确理由。')
  return normalized
}

function validateEventContext(actor: WorkflowActor, context: Pick<TransitionContext, 'eventId' | 'occurredAt'>): void {
  if (!actor.id.trim() || !context.eventId.trim() || !Number.isFinite(context.occurredAt) || context.occurredAt < 0) {
    throw new WorkflowPermissionError(
      'INVALID_TRANSITION',
      '审核事件必须记录操作者、永久事件 ID 和有效时间。',
    )
  }
}

function freezeState(state: RevisionWorkflowState): RevisionWorkflowState {
  return Object.freeze({ ...state, events: Object.freeze([...state.events]) })
}

export function createRevisionWorkflow(revision: Revision): RevisionWorkflowState {
  return freezeState({
    revisionId: revision.id,
    contentId: revision.contentId,
    publicationStatus: revision.status,
    euclidStatus: revision.euclidStatus,
    events: [],
  })
}

export interface TransitionContext {
  readonly eventId: string
  readonly occurredAt: number
  readonly reason: string
  readonly reviews?: readonly Review[]
}

/**
 * Review records are append-only. The last review for a Revision is the
 * authoritative disposition, so a later needs_changes review revokes an older
 * passed review instead of being silently ignored.
 */
export function isLatestReviewComplete(
  contentId: string,
  revisionId: string,
  reviews: readonly Review[],
): boolean {
  const latest = reviews.filter((review) => review.contentId === contentId
    && review.revisionId === revisionId).at(-1)
  return Boolean(latest && isReviewComplete(latest))
}

export function transitionPublicationStatus(
  state: RevisionWorkflowState,
  target: PublicationStatus,
  actor: WorkflowActor,
  context: TransitionContext,
): RevisionWorkflowState {
  const action = PUBLICATION_ACTION[state.publicationStatus]?.[target]
  if (!action) {
    throw new WorkflowPermissionError(
      'INVALID_TRANSITION',
      `不能从 ${state.publicationStatus} 直接变为 ${target}。`,
    )
  }
  requireRole(actor, action)
  validateEventContext(actor, context)
  const reason = requireReason(context.reason)

  if (state.events.some((event) => event.id === context.eventId)) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', `审核事件 ID 已存在：${context.eventId}`)
  }
  if ((target === 'approved' || target === 'published')
    && !isLatestReviewComplete(state.contentId, state.revisionId, context.reviews ?? [])) {
    throw new WorkflowPermissionError(
      'REVIEW_REQUIRED',
      `${target === 'published' ? '发布' : '批准'} Revision 前，最新一份同版本人工 Review 必须完整通过。`,
    )
  }
  if (target === 'published' && state.euclidStatus && state.euclidStatus !== 'math_reviewed') {
    throw new WorkflowPermissionError('REVIEW_REQUIRED', '《几何原本》Revision 必须先完成人工数学审核才能发布。')
  }

  const nextEuclidStatus = target === 'published' && state.euclidStatus === 'math_reviewed'
    ? 'published'
    : state.euclidStatus
  const event: WorkflowEvent = Object.freeze({
    id: context.eventId,
    revisionId: state.revisionId,
    action: target === 'published' && state.euclidStatus ? 'confirm_euclid_publication' : action,
    fromPublicationStatus: state.publicationStatus,
    toPublicationStatus: target,
    fromEuclidStatus: state.euclidStatus,
    toEuclidStatus: nextEuclidStatus,
    actorId: actor.id,
    occurredAt: context.occurredAt,
    reason,
  })

  return freezeState({
    ...state,
    publicationStatus: target,
    euclidStatus: nextEuclidStatus,
    events: [...state.events, event],
  })
}

export function transitionEuclidStatus(
  state: RevisionWorkflowState,
  target: EuclidContentStatus,
  actor: WorkflowActor,
  context: Omit<TransitionContext, 'reviews'>,
): RevisionWorkflowState {
  if (!state.euclidStatus) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', '该 Revision 不是《几何原本》编辑内容。')
  }

  const transition = `${state.euclidStatus}>${target}`
  const action: WorkflowAction | undefined = transition === 'raw_machine>editor_draft'
    ? 'prepare_editor_draft'
    : transition === 'editor_draft>math_reviewed'
      ? 'confirm_math_review'
      : undefined
  if (!action) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', `不能从 ${state.euclidStatus} 直接变为 ${target}。`)
  }
  requireRole(actor, action)
  validateEventContext(actor, context)
  const reason = requireReason(context.reason)
  if (state.events.some((event) => event.id === context.eventId)) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', `审核事件 ID 已存在：${context.eventId}`)
  }
  const event: WorkflowEvent = Object.freeze({
    id: context.eventId,
    revisionId: state.revisionId,
    action,
    fromPublicationStatus: state.publicationStatus,
    toPublicationStatus: state.publicationStatus,
    fromEuclidStatus: state.euclidStatus,
    toEuclidStatus: target,
    actorId: actor.id,
    occurredAt: context.occurredAt,
    reason,
  })

  return freezeState({ ...state, euclidStatus: target, events: [...state.events, event] })
}

export function createReview(
  input: Omit<Review, 'reviewerId'>,
  actor: WorkflowActor,
): Review {
  requireHuman(actor)
  if (!actor.roles.some((role) => ['math_reviewer', 'editor', 'admin'].includes(role))) {
    throw new WorkflowPermissionError('ROLE_REQUIRED', '只有人工编辑或数学审核员可以创建正式审核记录。')
  }
  if (!input.summary.trim()) {
    throw new ContentModelError('审核摘要不能为空。', [{ code: 'EMPTY_ID', message: '审核摘要不能为空。' }])
  }
  const allowed: readonly ReviewDimensionResult[] = ['not_reviewed', 'passed', 'needs_changes', 'not_applicable']
  const dimensions = [
    input.mathematicalCorrectness,
    input.rigor,
    input.completeness,
    input.clarity,
    input.sourceVerification,
  ]
  if (!actor.id.trim() || !input.id.trim() || !input.contentId.trim() || !input.revisionId.trim()
    || !Number.isFinite(input.reviewedAt) || input.reviewedAt < 0
    || dimensions.some((result) => !allowed.includes(result))) {
    throw new ContentModelError('Review 审计字段无效。', [{
      code: 'INVALID_REVISION_CHAIN',
      message: 'Review 必须包含有效操作者、ID、Revision、时间和五项审核结果。',
    }])
  }
  return Object.freeze({ ...input, reviewerId: actor.id, summary: input.summary.trim() })
}

const ISSUE_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  open: ['confirmed', 'resolved', 'duplicate', 'rejected'],
  confirmed: ['resolved', 'duplicate', 'rejected'],
  resolved: [],
  duplicate: [],
  rejected: [],
}

export function transitionIssueStatus(
  issue: AnnotationIssue,
  target: IssueStatus,
  actor: WorkflowActor,
): AnnotationIssue {
  requireHuman(actor)
  if (!actor.roles.some((role) => ['editor', 'math_reviewer', 'admin'].includes(role))) {
    throw new WorkflowPermissionError('ROLE_REQUIRED', '只有编辑或审核员可以确认、解决或驳回数学 Issue。')
  }
  if (!ISSUE_TRANSITIONS[issue.status].includes(target)) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', `Issue 不能从 ${issue.status} 变为 ${target}。`)
  }
  return Object.freeze({ ...issue, status: target })
}
