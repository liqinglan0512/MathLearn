import {
  ContentModelError,
  attachRevision,
  createContentItem,
  createNextRevision,
  createRevision,
  isReviewComplete,
  validateVisibility,
  type ContentItem,
  type ContentKind,
  type EuclidContentStatus,
  type PublicationStatus,
  type Review,
  type ReviewDimensionResult,
  type Revision,
  type SemanticBlock,
  type VisualizationTrustLevel,
} from './content-model'
import {
  WorkflowPermissionError,
  createReview,
  createRevisionWorkflow,
  isLatestReviewComplete,
  transitionEuclidStatus,
  transitionPublicationStatus,
  type RevisionWorkflowState,
  type TransitionContext,
  type WorkflowAction,
  type WorkflowActor,
  type WorkflowEvent,
} from './content-workflow'

export const EDITORIAL_SCHEMA_VERSION = 1 as const
/** The schema version is intentionally part of the key; migrations never overwrite an unknown schema. */
export const EDITORIAL_STORAGE_KEY = 'mf_editorial_store_v1'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Serializes a complete read/validate/write transaction. Browser callers use
 * the origin-wide Web Locks API; tests can inject one shared in-memory queue.
 */
export interface EditorialWriteCoordinator {
  runExclusive<T>(resource: string, operation: () => T): Promise<T>
}

export interface EditorialStoreOptions {
  readonly key?: string
  readonly now?: () => number
  readonly createId?: (prefix: string) => string
  readonly writeCoordinator?: EditorialWriteCoordinator
}

export interface EuclidEntrySeed {
  readonly contentId: string
  readonly title: string
  readonly kind: ContentKind
  readonly blocks: readonly SemanticBlock[]
  readonly createdBy?: string
  readonly createdAt?: number
  readonly revisionId?: string
  /** Immutable corpus revision the local editorial history was created against. */
  readonly sourceBinding: EditorialSourceBinding
  readonly visualizationTrust?: VisualizationTrustLevel
}

export interface EditorialSourceBinding {
  readonly revisionId: string
  readonly contentHash: string
}

export interface SaveEditorDraftInput {
  readonly revisionId?: string
  /** Revision the editor actually opened; stale tabs must not silently fork over newer work. */
  readonly expectedPreviousRevisionId: string
  readonly blocks: readonly SemanticBlock[]
  readonly changeSummary: string
  readonly createdAt?: number
}

export interface ReviewInput {
  readonly id?: string
  readonly mathematicalCorrectness: ReviewDimensionResult
  readonly rigor: ReviewDimensionResult
  readonly completeness: ReviewDimensionResult
  readonly clarity: ReviewDimensionResult
  readonly sourceVerification: ReviewDimensionResult
  readonly summary: string
  readonly reviewedAt?: number
}

export interface WorkflowActionInput {
  readonly eventId?: string
  readonly occurredAt?: number
  readonly reason: string
}

export interface EditorialEntrySnapshot {
  readonly content: ContentItem
  /** Missing only for legacy localStorage data; callers must then fail closed. */
  readonly sourceBinding?: EditorialSourceBinding
  readonly revisions: readonly Revision[]
  readonly workflows: Readonly<Record<string, RevisionWorkflowState>>
  readonly reviews: readonly Review[]
}

export type SafeEditorialRead =
  | { readonly ok: true; readonly entries: readonly EditorialEntrySnapshot[] }
  | { readonly ok: false; readonly entries: readonly []; readonly error: EditorialStoreCorruptionError }

interface PersistedEntry {
  content: ContentItem
  sourceBinding?: EditorialSourceBinding
  revisions: Revision[]
  workflows: Record<string, RevisionWorkflowState>
  reviews: Review[]
}

interface PersistedState {
  schemaVersion: typeof EDITORIAL_SCHEMA_VERSION
  entries: Record<string, PersistedEntry>
}

export class EditorialStoreCorruptionError extends Error {
  readonly code = 'EDITORIAL_STORE_CORRUPT'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'EditorialStoreCorruptionError'
  }
}

export class EditorialStoreNotFoundError extends Error {
  readonly code = 'EDITORIAL_CONTENT_NOT_FOUND'

  constructor(message: string) {
    super(message)
    this.name = 'EditorialStoreNotFoundError'
  }
}

export class EditorialStoreConflictError extends Error {
  readonly code = 'EDITORIAL_STORE_CONFLICT'

  constructor(message: string) {
    super(message)
    this.name = 'EditorialStoreConflictError'
  }
}

export function createInMemoryEditorialWriteCoordinator(): EditorialWriteCoordinator {
  const tails = new Map<string, Promise<void>>()
  return {
    runExclusive<T>(resource: string, operation: () => T): Promise<T> {
      const previous = tails.get(resource) ?? Promise.resolve()
      const result = previous.then(() => operation()) as Promise<T>
      const tail = result.then(() => undefined, () => undefined)
      tails.set(resource, tail)
      return result.finally(() => {
        if (tails.get(resource) === tail) tails.delete(resource)
      })
    },
  }
}

function unavailableWriteCoordinator(): EditorialWriteCoordinator {
  return {
    async runExclusive<T>(): Promise<T> {
      throw new EditorialStoreConflictError(
        '当前环境没有可用的原子写协调器；为避免多标签页覆盖，编辑存储保持只读。',
      )
    },
  }
}

export function createBrowserEditorialWriteCoordinator(): EditorialWriteCoordinator {
  if (typeof navigator === 'undefined' || !navigator.locks) return unavailableWriteCoordinator()
  const locks = navigator.locks
  return {
    runExclusive<T>(resource: string, operation: () => T): Promise<T> {
      return locks.request<T>(resource, { mode: 'exclusive' }, () => operation())
    },
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function defaultId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  return `${prefix}-${randomId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`
}

function freezeSnapshot(entry: PersistedEntry): EditorialEntrySnapshot {
  return Object.freeze({
    content: entry.content,
    sourceBinding: entry.sourceBinding ? Object.freeze({ ...entry.sourceBinding }) : undefined,
    revisions: Object.freeze([...entry.revisions].sort((left, right) => left.version - right.version)),
    workflows: Object.freeze({ ...entry.workflows }),
    reviews: Object.freeze([...entry.reviews]),
  })
}

function cloneState(state: PersistedState): PersistedState {
  return {
    schemaVersion: EDITORIAL_SCHEMA_VERSION,
    entries: Object.fromEntries(Object.entries(state.entries).map(([id, entry]) => [id, {
      content: entry.content,
      sourceBinding: entry.sourceBinding ? { ...entry.sourceBinding } : undefined,
      revisions: [...entry.revisions],
      workflows: { ...entry.workflows },
      reviews: [...entry.reviews],
    }])),
  }
}

function assertHumanEditor(actor: WorkflowActor): void {
  if (actor.kind !== 'human') {
    throw new WorkflowPermissionError('HUMAN_REQUIRED', '机器或后台任务不能保存正式中文编辑稿。')
  }
  if (!actor.roles.some((role) => role === 'editor' || role === 'admin')) {
    throw new WorkflowPermissionError('ROLE_REQUIRED', '只有人工 editor/admin 可以追加正式中文 Revision。')
  }
  if (!actor.id.trim()) {
    throw new WorkflowPermissionError('INVALID_TRANSITION', '编辑操作必须记录操作者。')
  }
}

function sameBlockIdentity(left: readonly SemanticBlock[], right: readonly SemanticBlock[]): boolean {
  if (left.length !== right.length) return false
  const leftById = new Map(left.map((block) => [block.id, block]))
  return right.every((block) => leftById.get(block.id)?.kind === block.kind)
}

function workflowActionForPublication(from: PublicationStatus, to: PublicationStatus): WorkflowAction | undefined {
  if ((from === 'draft' || from === 'revision_requested') && to === 'pending_review') return 'submit_for_review'
  if ((from === 'pending_review' || from === 'approved') && to === 'revision_requested') return 'request_revision'
  if (from === 'pending_review' && to === 'approved') return 'approve'
  if (from === 'pending_review' && to === 'rejected') return 'reject'
  if (to === 'archived' && ['draft', 'pending_review', 'revision_requested', 'approved', 'published', 'rejected'].includes(from)) {
    return 'archive'
  }
  if (from === 'approved' && to === 'published') return 'publish'
  return undefined
}

function assertEventShape(event: WorkflowEvent, revisionId: string): void {
  if (!isObject(event)
    || typeof event.revisionId !== 'string' || event.revisionId !== revisionId
    || typeof event.id !== 'string' || !event.id.trim()
    || typeof event.actorId !== 'string' || !event.actorId.trim()
    || typeof event.reason !== 'string' || !event.reason.trim()
    || typeof event.occurredAt !== 'number' || !Number.isFinite(event.occurredAt) || event.occurredAt < 0) {
    throw new EditorialStoreCorruptionError(`Revision ${revisionId} 含无效审核事件。`)
  }
}

function validateWorkflowHistory(
  revision: Revision,
  workflow: RevisionWorkflowState,
  reviews: readonly Review[],
): RevisionWorkflowState {
  if (workflow.revisionId !== revision.id || workflow.contentId !== revision.contentId || !Array.isArray(workflow.events)) {
    throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的 workflow 归属无效。`)
  }

  let publication: PublicationStatus = revision.status
  let euclid: EuclidContentStatus | undefined = revision.euclidStatus
  const eventIds = new Set<string>()

  for (const event of workflow.events) {
    assertEventShape(event, revision.id)
    if (eventIds.has(event.id)) throw new EditorialStoreCorruptionError(`审核事件 ID 重复：${event.id}`)
    eventIds.add(event.id)
    if (event.fromPublicationStatus !== publication || event.fromEuclidStatus !== euclid) {
      throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的审核事件链不连续。`)
    }

    if (event.action === 'prepare_editor_draft') {
      if (euclid !== 'raw_machine' || event.toEuclidStatus !== 'editor_draft'
        || event.toPublicationStatus !== publication) {
        throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的 editor_draft 状态链无效。`)
      }
      euclid = 'editor_draft'
      continue
    }
    if (event.action === 'confirm_math_review') {
      if (euclid !== 'editor_draft' || event.toEuclidStatus !== 'math_reviewed'
        || event.toPublicationStatus !== publication) {
        throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的 math_reviewed 状态链无效。`)
      }
      euclid = 'math_reviewed'
      continue
    }

    const expectedAction = workflowActionForPublication(publication, event.toPublicationStatus)
    const actualAction = event.action === 'confirm_euclid_publication' ? 'publish' : event.action
    if (!expectedAction || actualAction !== expectedAction) {
      throw new EditorialStoreCorruptionError(`Revision ${revision.id} 含非法发布状态跳转。`)
    }
    if (event.action === 'confirm_euclid_publication') {
      if (euclid !== 'math_reviewed' || event.toEuclidStatus !== 'published') {
        throw new EditorialStoreCorruptionError(`Revision ${revision.id} 未经数学审核却被标为 published。`)
      }
      euclid = 'published'
    } else if (event.toEuclidStatus !== euclid) {
      throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的 Euclid 状态被非审核事件改变。`)
    }
    publication = event.toPublicationStatus
  }

  if (publication !== workflow.publicationStatus || euclid !== workflow.euclidStatus) {
    throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的当前状态与审核事件历史不一致。`)
  }
  if ((publication === 'approved' || publication === 'published')
    && !isLatestReviewComplete(revision.contentId, revision.id, reviews)) {
    throw new EditorialStoreCorruptionError(`Revision ${revision.id} 缺少完整人工 Review，却被标为 ${publication}。`)
  }
  if ((euclid === 'math_reviewed' || euclid === 'published')
    && !isLatestReviewComplete(revision.contentId, revision.id, reviews)) {
    throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的最新 Review 未通过，却被标为 ${euclid}。`)
  }
  if (revision.origin === 'machine' && euclid && euclid !== 'raw_machine') {
    throw new EditorialStoreCorruptionError(`机器 Revision ${revision.id} 不能被原地升级为 ${euclid}；必须追加人工 Revision。`)
  }
  if (publication === 'published' && euclid && euclid !== 'published') {
    throw new EditorialStoreCorruptionError(`Revision ${revision.id} 的发布状态与 Euclid 状态不一致。`)
  }

  return Object.freeze({ ...workflow, events: Object.freeze([...workflow.events]) })
}

function hydrateReview(value: unknown, contentId: string, revisionIds: ReadonlySet<string>): Review {
  if (!isObject(value)) throw new EditorialStoreCorruptionError(`Content ${contentId} 含无效 Review。`)
  const dimensions = ['mathematicalCorrectness', 'rigor', 'completeness', 'clarity', 'sourceVerification'] as const
  const allowed: readonly ReviewDimensionResult[] = ['not_reviewed', 'passed', 'needs_changes', 'not_applicable']
  if (typeof value.id !== 'string' || typeof value.contentId !== 'string' || value.contentId !== contentId
    || typeof value.revisionId !== 'string' || !revisionIds.has(value.revisionId)
    || typeof value.reviewerId !== 'string' || typeof value.reviewedAt !== 'number'
    || typeof value.summary !== 'string'
    || dimensions.some((field) => typeof value[field] !== 'string'
      || !allowed.includes(value[field] as ReviewDimensionResult))) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 含无效 Review 字段。`)
  }
  if (!value.id.trim() || !value.reviewerId.trim() || !value.summary.trim()
    || !Number.isFinite(value.reviewedAt) || value.reviewedAt < 0) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 含不完整 Review 审计信息。`)
  }
  return Object.freeze(value as unknown as Review)
}

function hydrateRevision(value: unknown): Revision {
  if (!isObject(value) || !Array.isArray(value.blocks)) {
    throw new EditorialStoreCorruptionError('Revision 数据结构无效。')
  }
  if ((value.origin !== 'human' && value.origin !== 'machine') || value.status !== 'draft'
    || (value.euclidStatus !== undefined && value.euclidStatus !== 'raw_machine'
      && value.euclidStatus !== 'editor_draft')) {
    throw new EditorialStoreCorruptionError('Revision 来源或初始审核状态无效。')
  }
  try {
    return createRevision({
      id: String(value.id ?? ''),
      contentId: String(value.contentId ?? ''),
      version: Number(value.version),
      previousRevisionId: typeof value.previousRevisionId === 'string' ? value.previousRevisionId : undefined,
      createdAt: Number(value.createdAt),
      createdBy: String(value.createdBy ?? ''),
      origin: value.origin,
      changeSummary: String(value.changeSummary ?? ''),
      blocks: value.blocks as unknown as SemanticBlock[],
      euclidStatus: value.euclidStatus,
    })
  } catch (error) {
    throw new EditorialStoreCorruptionError('Revision 校验失败；不会把该数据当作已发布内容。', { cause: error })
  }
}

function hydrateVisibility(value: unknown): ContentItem['visibility'] {
  if (!isObject(value)) throw new EditorialStoreCorruptionError('Content visibility 数据结构无效。')
  if (value.kind === 'private' || value.kind === 'public') return Object.freeze({ kind: value.kind })
  if (value.kind !== 'restricted' || !Array.isArray(value.allowedUserIds)
    || value.allowedUserIds.some((id) => typeof id !== 'string')) {
    throw new EditorialStoreCorruptionError('Content restricted visibility 白名单无效。')
  }
  const policy = { kind: 'restricted' as const, allowedUserIds: Object.freeze([...value.allowedUserIds] as string[]) }
  if (validateVisibility(policy).length > 0) {
    throw new EditorialStoreCorruptionError('Content restricted visibility 白名单无效。')
  }
  return Object.freeze(policy)
}

function hydrateEntry(contentId: string, value: unknown): PersistedEntry {
  if (!isObject(value) || !isObject(value.content) || !Array.isArray(value.revisions)
    || !isObject(value.workflows) || !Array.isArray(value.reviews)) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 数据结构无效。`)
  }

  const revisions = value.revisions.map(hydrateRevision).sort((left, right) => left.version - right.version)
  if (revisions.length === 0 || revisions.some((revision) => revision.contentId !== contentId)) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 没有合法 Revision。`)
  }
  for (let index = 0; index < revisions.length; index += 1) {
    const revision = revisions[index]
    const previous = revisions[index - 1]
    if (revision.version !== index + 1
      || (index === 0 ? revision.previousRevisionId !== undefined : revision.previousRevisionId !== previous.id)) {
      throw new EditorialStoreCorruptionError(`Content ${contentId} 的 Revision 历史不连续。`)
    }
  }
  const revisionIds = new Set(revisions.map((revision) => revision.id))
  const reviews = value.reviews.map((review) => hydrateReview(review, contentId, revisionIds))
  const workflows: Record<string, RevisionWorkflowState> = {}
  for (const revision of revisions) {
    const rawWorkflow = value.workflows[revision.id]
    if (!isObject(rawWorkflow)) throw new EditorialStoreCorruptionError(`Revision ${revision.id} 缺少 workflow。`)
    workflows[revision.id] = validateWorkflowHistory(
      revision,
      rawWorkflow as unknown as RevisionWorkflowState,
      reviews,
    )
  }

  const rawContent = value.content
  let sourceBinding: EditorialSourceBinding | undefined
  if (value.sourceBinding !== undefined) {
    if (!isObject(value.sourceBinding)
      || typeof value.sourceBinding.revisionId !== 'string' || !value.sourceBinding.revisionId.trim()
      || typeof value.sourceBinding.contentHash !== 'string'
      || !/^[a-f0-9]{64}$/.test(value.sourceBinding.contentHash)) {
      throw new EditorialStoreCorruptionError(`Content ${contentId} 的源语料绑定无效。`)
    }
    sourceBinding = Object.freeze({
      revisionId: value.sourceBinding.revisionId,
      contentHash: value.sourceBinding.contentHash,
    })
  }
  const visibility = hydrateVisibility(rawContent.visibility)
  const contentKinds: readonly ContentKind[] = [
    'definition', 'axiom', 'postulate', 'theorem', 'proposition',
    'problem', 'proof', 'principle', 'paper', 'counterexample',
  ]
  const trustLevels: readonly VisualizationTrustLevel[] = [
    'none', 'concept_illustration', 'proposition_specific', 'verified',
  ]
  if (rawContent.id !== contentId || typeof rawContent.title !== 'string'
    || typeof rawContent.createdBy !== 'string' || typeof rawContent.createdAt !== 'number'
    || typeof rawContent.kind !== 'string' || !contentKinds.includes(rawContent.kind as ContentKind)
    || typeof rawContent.visualizationTrust !== 'string'
    || !trustLevels.includes(rawContent.visualizationTrust as VisualizationTrustLevel)
    || !Array.isArray(rawContent.revisionIds)
    || rawContent.revisionIds.length !== revisions.length
    || rawContent.revisionIds.some((id, index) => id !== revisions[index].id)
    || rawContent.currentRevisionId !== revisions.at(-1)?.id) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 元数据与 Revision 历史不一致。`)
  }
  const publishedRevisionId = typeof rawContent.publishedRevisionId === 'string'
    ? rawContent.publishedRevisionId
    : undefined
  if (publishedRevisionId && workflows[publishedRevisionId]?.publicationStatus !== 'published') {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 指向未经发布流程的 Revision。`)
  }
  const hasPublishedWorkflow = Object.values(workflows)
    .some((workflow) => workflow.publicationStatus === 'published')
  if ((visibility.kind === 'public') !== Boolean(publishedRevisionId)
    || (hasPublishedWorkflow && !publishedRevisionId)) {
    throw new EditorialStoreCorruptionError(`Content ${contentId} 的公开可见性与已发布 Revision 不一致。`)
  }

  return {
    content: Object.freeze({ ...rawContent, visibility } as unknown as ContentItem),
    sourceBinding,
    revisions,
    workflows,
    reviews,
  }
}

function parseState(raw: string | null): PersistedState {
  if (raw === null) return { schemaVersion: EDITORIAL_SCHEMA_VERSION, entries: {} }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new EditorialStoreCorruptionError('编辑存储不是合法 JSON；原值已保留，未自动重置。', { cause: error })
  }
  if (!isObject(parsed) || parsed.schemaVersion !== EDITORIAL_SCHEMA_VERSION || !isObject(parsed.entries)) {
    throw new EditorialStoreCorruptionError('编辑存储 schema 不受支持；未执行自动迁移或发布。')
  }
  return {
    schemaVersion: EDITORIAL_SCHEMA_VERSION,
    entries: Object.fromEntries(Object.entries(parsed.entries).map(([id, entry]) => [id, hydrateEntry(id, entry)])),
  }
}

export class EditorialStore {
  readonly key: string
  private readonly storage: StorageAdapter
  private readonly now: () => number
  private readonly createId: (prefix: string) => string
  private readonly writeCoordinator: EditorialWriteCoordinator
  private readonly writeLockName: string

  constructor(storage: StorageAdapter, options: EditorialStoreOptions = {}) {
    this.storage = storage
    this.key = options.key ?? EDITORIAL_STORAGE_KEY
    this.now = options.now ?? Date.now
    this.createId = options.createId ?? defaultId
    this.writeCoordinator = options.writeCoordinator ?? unavailableWriteCoordinator()
    this.writeLockName = `mathforge:editorial-write:${this.key}`
  }

  private readState(): PersistedState {
    return parseState(this.storage.getItem(this.key))
  }

  private readTransaction(): { readonly raw: string | null; readonly state: PersistedState } {
    const raw = this.storage.getItem(this.key)
    return { raw, state: parseState(raw) }
  }

  private writeState(state: PersistedState, expectedRaw: string | null): void {
    const serialized = JSON.stringify(state)
    // Never persist a state that the next read would reject. This is a second
    // line of defence behind the command-specific workflow guards.
    parseState(serialized)
    if (this.storage.getItem(this.key) !== expectedRaw) {
      throw new EditorialStoreConflictError('编辑存储已被另一个标签页更新；请刷新后基于最新 Revision 重试。')
    }
    this.storage.setItem(this.key, serialized)
  }

  private withWriteLock<T>(operation: () => T): Promise<T> {
    return this.writeCoordinator.runExclusive(this.writeLockName, operation)
  }

  private requireEntry(state: PersistedState, contentId: string): PersistedEntry {
    const entry = state.entries[contentId]
    if (!entry) throw new EditorialStoreNotFoundError(`找不到编辑内容：${contentId}`)
    return entry
  }

  inspect(): SafeEditorialRead {
    try {
      return { ok: true, entries: Object.values(this.readState().entries).map(freezeSnapshot) }
    } catch (error) {
      const corruption = error instanceof EditorialStoreCorruptionError
        ? error
        : new EditorialStoreCorruptionError('编辑存储读取失败。', { cause: error })
      return { ok: false, entries: [], error: corruption }
    }
  }

  list(): readonly EditorialEntrySnapshot[] {
    return Object.values(this.readState().entries).map(freezeSnapshot)
  }

  get(contentId: string): EditorialEntrySnapshot | undefined {
    const entry = this.readState().entries[contentId]
    return entry ? freezeSnapshot(entry) : undefined
  }

  getHistory(contentId: string): readonly Revision[] {
    return freezeSnapshot(this.requireEntry(this.readState(), contentId)).revisions
  }

  getRevisionByVersion(contentId: string, version: number): Revision | undefined {
    return this.getHistory(contentId).find((revision) => revision.version === version)
  }

  initializeEuclidEntry(seed: EuclidEntrySeed): Promise<EditorialEntrySnapshot> {
    return this.withWriteLock(() => {
      const transaction = this.readTransaction()
      const current = transaction.state
      const existing = current.entries[seed.contentId]
      if (existing) {
        if (!existing.sourceBinding
          || existing.sourceBinding.revisionId !== seed.sourceBinding.revisionId
          || existing.sourceBinding.contentHash !== seed.sourceBinding.contentHash) {
          throw new EditorialStoreConflictError(
            '本地编辑历史没有绑定当前源语料，或源语料已经更新。为避免旧译文覆盖新底本，当前数据保持只读；请人工迁移后再编辑。',
          )
        }
        return freezeSnapshot(existing)
      }

      if (!seed.sourceBinding.revisionId.trim() || !/^[a-f0-9]{64}$/.test(seed.sourceBinding.contentHash)) {
        throw new EditorialStoreConflictError('初始化编辑历史必须绑定合法的源 Revision 与 SHA-256 内容哈希。')
      }

      const createdAt = seed.createdAt ?? this.now()
      const createdBy = seed.createdBy?.trim() || 'euclid-machine-import'
      const revision = createRevision({
        id: seed.revisionId ?? this.createId('revision'),
        contentId: seed.contentId,
        version: 1,
        createdAt,
        createdBy,
        origin: 'machine',
        euclidStatus: 'raw_machine',
        changeSummary: '初始化《几何原本》机器原稿；尚未人工审核。',
        blocks: seed.blocks,
      })
      const content = attachRevision(createContentItem({
        id: seed.contentId,
        kind: seed.kind,
        title: seed.title,
        createdAt,
        createdBy,
        visibility: { kind: 'private' },
        visualizationTrust: seed.visualizationTrust ?? 'none',
      }), revision)
      const entry: PersistedEntry = {
        content,
        sourceBinding: Object.freeze({ ...seed.sourceBinding }),
        revisions: [revision],
        workflows: { [revision.id]: createRevisionWorkflow(revision) },
        reviews: [],
      }
      const next = cloneState(current)
      next.entries[seed.contentId] = entry
      this.writeState(next, transaction.raw)
      return freezeSnapshot(entry)
    })
  }

  appendEditorDraft(
    contentId: string,
    input: SaveEditorDraftInput,
    actor: WorkflowActor,
  ): Promise<Revision> {
    return this.withWriteLock(() => {
      assertHumanEditor(actor)
      const transaction = this.readTransaction()
      const state = transaction.state
      const entry = this.requireEntry(state, contentId)
      const previous = entry.revisions.at(-1)
      if (!previous) throw new EditorialStoreCorruptionError(`Content ${contentId} 缺少前序 Revision。`)
      if (previous.id !== input.expectedPreviousRevisionId) {
        throw new EditorialStoreConflictError(
          `编辑基线已过期：当前为 ${previous.id}，页面基于 ${input.expectedPreviousRevisionId}。请刷新后合并改动。`,
        )
      }
      const previousWorkflow = entry.workflows[previous.id]
      if (!previousWorkflow) {
        throw new EditorialStoreCorruptionError(`Revision ${previous.id} 缺少 workflow。`)
      }
      if (previousWorkflow.publicationStatus === 'pending_review') {
        throw new EditorialStoreConflictError(
          '当前 Revision 正在审核中；请先显式退回 revision_requested，再保存新的 editor_draft。',
        )
      }
      if (previousWorkflow.publicationStatus === 'approved') {
        throw new EditorialStoreConflictError(
          '当前 Revision 已批准；请先显式退回 revision_requested，再保存新的 editor_draft。',
        )
      }
      if (previousWorkflow.publicationStatus === 'published') {
        throw new EditorialStoreConflictError(
          '当前 Revision 已发布；请先显式归档，再保存新的 editor_draft。',
        )
      }
      if (!sameBlockIdentity(previous.blocks, input.blocks)) {
        throw new EditorialStoreConflictError('保存正式中文时必须保留全部永久 semantic block ID；不得按数组位置重建。')
      }
      if (input.blocks.some((block) => block.editorialStatus === 'math_reviewed' || block.editorialStatus === 'published')) {
        throw new EditorialStoreConflictError('保存编辑草稿不能把语义块直接标记为已数学审核或已发布。')
      }

      const revision = createNextRevision(previous, {
        id: input.revisionId ?? this.createId('revision'),
        createdAt: input.createdAt ?? this.now(),
        createdBy: actor.id,
        origin: 'human',
        euclidStatus: 'editor_draft',
        changeSummary: input.changeSummary,
        blocks: input.blocks,
      })
      if (Object.values(state.entries).some((candidate) =>
        candidate.revisions.some((storedRevision) => storedRevision.id === revision.id))) {
        throw new EditorialStoreConflictError(`Revision ID 已存在：${revision.id}`)
      }

      const next = cloneState(state)
      const nextEntry = this.requireEntry(next, contentId)
      nextEntry.revisions.push(revision)
      nextEntry.workflows[revision.id] = createRevisionWorkflow(revision)
      nextEntry.content = attachRevision(nextEntry.content, revision)
      this.writeState(next, transaction.raw)
      return revision
    })
  }

  addReview(contentId: string, revisionId: string, input: ReviewInput, actor: WorkflowActor): Promise<Review> {
    return this.withWriteLock(() => {
      const transaction = this.readTransaction()
      const state = transaction.state
      const entry = this.requireEntry(state, contentId)
      if (!entry.revisions.some((revision) => revision.id === revisionId)) {
        throw new EditorialStoreNotFoundError(`找不到 Revision：${revisionId}`)
      }
      if (entry.content.currentRevisionId !== revisionId) {
        throw new EditorialStoreConflictError('只能审核当前 Revision；旧版本历史保持只读。')
      }
      const review = createReview({
        ...input,
        id: input.id ?? this.createId('review'),
        contentId,
        revisionId,
        reviewedAt: input.reviewedAt ?? this.now(),
      }, actor)
      if (entry.reviews.some((candidate) => candidate.id === review.id)) {
        throw new EditorialStoreConflictError(`Review ID 已存在：${review.id}`)
      }
      const workflow = entry.workflows[revisionId]
      if (!workflow) throw new EditorialStoreCorruptionError(`Revision ${revisionId} 缺少 workflow。`)
      const hasTrustedHistory = workflow.events.some((event) => (
        event.action === 'approve'
        || event.action === 'confirm_math_review'
        || event.action === 'confirm_euclid_publication'
      ))
      if (!isReviewComplete(review) && hasTrustedHistory) {
        const requiredStatusAction = workflow.publicationStatus === 'approved'
          ? '请先显式退回 revision_requested，'
          : workflow.publicationStatus === 'published'
            ? '请先显式归档，'
            : ''
        throw new EditorialStoreConflictError(
          `已确认数学审核或曾发布的 Revision 不能追加 needs_changes 或未完成 Review；${requiredStatusAction}再保存新的 editor_draft Revision，并在新版本上 Review。Review 未写入。`,
        )
      }
      const next = cloneState(state)
      this.requireEntry(next, contentId).reviews.push(review)
      this.writeState(next, transaction.raw)
      return review
    })
  }

  transitionEuclid(
    contentId: string,
    revisionId: string,
    target: EuclidContentStatus,
    actor: WorkflowActor,
    input: WorkflowActionInput,
  ): Promise<RevisionWorkflowState> {
    return this.withWriteLock(() => {
      const transaction = this.readTransaction()
      const state = transaction.state
      const entry = this.requireEntry(state, contentId)
      const current = entry.workflows[revisionId]
      if (!current) throw new EditorialStoreNotFoundError(`找不到 Revision workflow：${revisionId}`)
      if (entry.content.currentRevisionId !== revisionId) {
        throw new EditorialStoreConflictError('只能修改当前 Revision 的 Euclid 状态；旧版本历史保持只读。')
      }
      const revision = entry.revisions.find((candidate) => candidate.id === revisionId)
      if (!revision) throw new EditorialStoreNotFoundError(`找不到 Revision：${revisionId}`)
      if (revision.origin !== 'human' || revision.euclidStatus !== 'editor_draft') {
        throw new EditorialStoreConflictError('机器原稿不能原地升级；必须先追加由人工确认的 editor_draft Revision。')
      }
      const updated = transitionEuclidStatus(current, target, actor, {
        eventId: input.eventId ?? this.createId('event'),
        occurredAt: input.occurredAt ?? this.now(),
        reason: input.reason,
      })
      if (target === 'math_reviewed' && !isLatestReviewComplete(contentId, revisionId, entry.reviews)) {
        throw new WorkflowPermissionError('REVIEW_REQUIRED', '确认数学审核前必须先保存同一 Revision 的完整人工 Review。')
      }
      const next = cloneState(state)
      this.requireEntry(next, contentId).workflows[revisionId] = updated
      this.writeState(next, transaction.raw)
      return updated
    })
  }

  transitionPublication(
    contentId: string,
    revisionId: string,
    target: PublicationStatus,
    actor: WorkflowActor,
    input: WorkflowActionInput,
  ): Promise<RevisionWorkflowState> {
    return this.withWriteLock(() => {
      const transaction = this.readTransaction()
      const state = transaction.state
      const entry = this.requireEntry(state, contentId)
      const current = entry.workflows[revisionId]
      if (!current) throw new EditorialStoreNotFoundError(`找不到 Revision workflow：${revisionId}`)
      if (entry.content.currentRevisionId !== revisionId && target !== 'archived') {
        throw new EditorialStoreConflictError('只能审核或发布当前 Revision；旧版本历史保持只读。')
      }
      const revision = entry.revisions.find((candidate) => candidate.id === revisionId)
      if (!revision) throw new EditorialStoreNotFoundError(`找不到 Revision：${revisionId}`)
      if (revision.euclidStatus && revision.origin !== 'human'
        && (target === 'approved' || target === 'published')) {
        throw new EditorialStoreConflictError('机器原稿不能获批或发布；必须先追加人工 editor_draft Revision。')
      }
      const context: TransitionContext = {
        eventId: input.eventId ?? this.createId('event'),
        occurredAt: input.occurredAt ?? this.now(),
        reason: input.reason,
        reviews: entry.reviews,
      }
      const updated = transitionPublicationStatus(current, target, actor, context)
      const next = cloneState(state)
      const nextEntry = this.requireEntry(next, contentId)
      nextEntry.workflows[revisionId] = updated
      if (target === 'published') {
        nextEntry.content = Object.freeze({
          ...nextEntry.content,
          publishedRevisionId: revisionId,
          visibility: Object.freeze({ kind: 'public' as const }),
        })
      } else if (target === 'archived' && nextEntry.content.publishedRevisionId === revisionId) {
        const fallbackPublished = [...nextEntry.revisions]
          .reverse()
          .find((revision) => revision.id !== revisionId
            && nextEntry.workflows[revision.id]?.publicationStatus === 'published')
        nextEntry.content = fallbackPublished
          ? Object.freeze({
              ...nextEntry.content,
              publishedRevisionId: fallbackPublished.id,
              visibility: Object.freeze({ kind: 'public' as const }),
            })
          : Object.freeze({
              ...nextEntry.content,
              publishedRevisionId: undefined,
              visibility: Object.freeze({ kind: 'private' as const }),
            })
      }
      this.writeState(next, transaction.raw)
      return updated
    })
  }
}

export function browserEditorialStore(options?: EditorialStoreOptions): EditorialStore {
  if (typeof localStorage === 'undefined') {
    throw new EditorialStoreNotFoundError('当前环境没有 localStorage；请注入 StorageAdapter。')
  }
  return new EditorialStore(localStorage, {
    ...options,
    writeCoordinator: options?.writeCoordinator ?? createBrowserEditorialWriteCoordinator(),
  })
}

/** Exposed for diagnostics; callers should never treat a failed result as published content. */
export function inspectEditorialStorage(storage: StorageAdapter, options?: EditorialStoreOptions): SafeEditorialRead {
  return new EditorialStore(storage, options).inspect()
}

export function isEditorialModelError(error: unknown): error is ContentModelError {
  return error instanceof ContentModelError
}
