/**
 * Durable domain types for MathForge content.
 *
 * These records deliberately contain no browser-storage or UI concerns. Formal
 * content is represented by append-only revisions; callers must never rewrite
 * an older revision in place.
 */

export type ContentKind =
  | 'definition'
  | 'axiom'
  | 'postulate'
  | 'theorem'
  | 'proposition'
  | 'problem'
  | 'proof'
  | 'principle'
  | 'paper'
  | 'counterexample'

export type PublicationStatus =
  | 'draft'
  | 'pending_review'
  | 'revision_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived'

export type EuclidContentStatus =
  | 'raw_machine'
  | 'editor_draft'
  | 'math_reviewed'
  | 'published'

export type Visibility = 'private' | 'restricted' | 'public'

export type VisibilityPolicy =
  | { readonly kind: 'private' }
  | { readonly kind: 'restricted'; readonly allowedUserIds: readonly string[] }
  | { readonly kind: 'public' }

export type VisualizationTrustLevel =
  | 'none'
  | 'concept_illustration'
  | 'proposition_specific'
  | 'verified'

export type SemanticBlockKind =
  | 'statement'
  | 'assumption'
  | 'construction'
  | 'proof_step'
  | 'conclusion'
  | 'remark'
  | 'counterexample'
  | 'historical_note'
  | 'definition'
  | 'axiom'
  | 'postulate'
  | 'source'

export interface SemanticBlock {
  /** Permanent semantic identity. It must not be derived from array position. */
  readonly id: string
  readonly kind: SemanticBlockKind
  /** Presentation order is independent of the permanent ID. */
  readonly order: number
  readonly content: string
  readonly language?: string
  /** Optional Euclid block-level editorial state; never inferred from translation coverage. */
  readonly editorialStatus?: EuclidContentStatus
}

export interface Revision {
  readonly id: string
  readonly contentId: string
  readonly version: number
  readonly previousRevisionId?: string
  readonly createdAt: number
  readonly createdBy: string
  readonly origin: 'human' | 'machine'
  /** A revision begins as a draft. Later workflow state is append-only elsewhere. */
  readonly status: 'draft'
  readonly euclidStatus?: 'raw_machine' | 'editor_draft'
  readonly changeSummary: string
  readonly blocks: readonly SemanticBlock[]
}

export interface ContentItem {
  readonly id: string
  readonly kind: ContentKind
  readonly title: string
  readonly createdAt: number
  readonly createdBy: string
  readonly visibility: VisibilityPolicy
  readonly revisionIds: readonly string[]
  readonly currentRevisionId?: string
  readonly publishedRevisionId?: string
  readonly visualizationTrust: VisualizationTrustLevel
}

export type EdgeType =
  | 'cites'
  | 'depends_on'
  | 'generalizes'
  | 'equivalent_to'
  | 'counterexample_to'
  | 'corrects'
  | 'alternative_proof_of'

export type EdgeProvenance =
  | {
      readonly kind: 'explicit_source_reference'
      readonly citation: string
      readonly sourceUrl?: string
    }
  | {
      readonly kind: 'editorial_inference'
      readonly editorId: string
      readonly rationale: string
    }

export interface ContentReference {
  readonly contentId: string
  readonly revisionId?: string
  readonly blockId?: string
}

export interface Edge {
  readonly id: string
  readonly source: ContentReference
  readonly target: ContentReference
  readonly type: EdgeType
  readonly provenance: EdgeProvenance
  readonly createdAt: number
  readonly createdBy: string
}

export type AnnotationType =
  | 'question'
  | 'my_understanding'
  | 'possible_error'
  | 'alternative_proof'
  | 'counterexample'
  | 'background'
  | 'source_issue'

export type IssueStatus = 'open' | 'confirmed' | 'resolved' | 'duplicate' | 'rejected'

export interface AnnotationAnchor {
  readonly contentId: string
  readonly revisionId: string
  readonly blockId: string
  readonly blockVersion: string
  readonly start: number
  readonly end: number
  readonly quote: string
  readonly prefix: string
  readonly suffix: string
}

export interface AnnotationIssue {
  readonly id: string
  readonly type: AnnotationType
  readonly status: IssueStatus
  readonly anchor: AnnotationAnchor
  readonly body: string
  readonly createdAt: number
  readonly createdBy: string
}

export type ReviewDimensionResult = 'not_reviewed' | 'passed' | 'needs_changes' | 'not_applicable'

export interface Review {
  readonly id: string
  readonly contentId: string
  readonly revisionId: string
  readonly mathematicalCorrectness: ReviewDimensionResult
  readonly rigor: ReviewDimensionResult
  readonly completeness: ReviewDimensionResult
  readonly clarity: ReviewDimensionResult
  readonly sourceVerification: ReviewDimensionResult
  readonly reviewerId: string
  readonly reviewedAt: number
  readonly summary: string
}

export type ModelValidationCode =
  | 'EMPTY_ID'
  | 'INVALID_REVISION_VERSION'
  | 'INVALID_REVISION_CHAIN'
  | 'DUPLICATE_BLOCK_ID'
  | 'DUPLICATE_BLOCK_ORDER'
  | 'INVALID_BLOCK_ORDER'
  | 'INVALID_BLOCK_STATUS'
  | 'EMPTY_BLOCK_CONTENT'
  | 'INVALID_VISIBILITY'
  | 'INVALID_ANCHOR'
  | 'SELF_REFERENCE'
  | 'DANGLING_EDGE'
  | 'DUPLICATE_EDGE'
  | 'INVALID_PROVENANCE'

export interface ModelValidationIssue {
  readonly code: ModelValidationCode
  readonly message: string
  readonly entityId?: string
}

export class ContentModelError extends Error {
  readonly issues: readonly ModelValidationIssue[]

  constructor(message: string, issues: readonly ModelValidationIssue[]) {
    super(message)
    this.name = 'ContentModelError'
    this.issues = issues
  }
}

function requireText(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new ContentModelError(`${field} 不能为空。`, [{ code: 'EMPTY_ID', message: `${field} 不能为空。` }])
  }
  return normalized
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function freezeVisibility(policy: VisibilityPolicy): VisibilityPolicy {
  if (policy.kind !== 'restricted') return Object.freeze({ ...policy })
  return Object.freeze({ ...policy, allowedUserIds: freezeArray(policy.allowedUserIds) })
}

export function validateVisibility(policy: VisibilityPolicy): readonly ModelValidationIssue[] {
  if (policy.kind !== 'restricted') return []
  const users = policy.allowedUserIds.map((id) => id.trim()).filter(Boolean)
  if (users.length === 0 || new Set(users).size !== users.length) {
    return [{
      code: 'INVALID_VISIBILITY',
      message: 'restricted 可见性必须包含非空且不重复的用户白名单。',
    }]
  }
  return []
}

export function validateSemanticBlocks(blocks: readonly SemanticBlock[]): readonly ModelValidationIssue[] {
  const issues: ModelValidationIssue[] = []
  const ids = new Set<string>()
  const orders = new Set<number>()

  for (const block of blocks) {
    if (!block.id.trim()) issues.push({ code: 'EMPTY_ID', message: '语义块必须拥有永久 ID。' })
    if (ids.has(block.id)) {
      issues.push({ code: 'DUPLICATE_BLOCK_ID', message: `语义块 ID 重复：${block.id}`, entityId: block.id })
    }
    ids.add(block.id)

    if (!Number.isInteger(block.order) || block.order < 0) {
      issues.push({ code: 'INVALID_BLOCK_ORDER', message: `语义块顺序必须是非负整数：${block.id}`, entityId: block.id })
    } else if (orders.has(block.order)) {
      issues.push({ code: 'DUPLICATE_BLOCK_ORDER', message: `语义块顺序重复：${block.order}`, entityId: block.id })
    }
    orders.add(block.order)

    if (!block.content.trim()) {
      issues.push({ code: 'EMPTY_BLOCK_CONTENT', message: `语义块正文不能为空：${block.id}`, entityId: block.id })
    }
    if (block.editorialStatus && !['raw_machine', 'editor_draft', 'math_reviewed', 'published'].includes(block.editorialStatus)) {
      issues.push({ code: 'INVALID_BLOCK_STATUS', message: `语义块审核状态无效：${block.id}`, entityId: block.id })
    }
  }

  return issues
}

export interface CreateRevisionInput {
  readonly id: string
  readonly contentId: string
  readonly version: number
  readonly previousRevisionId?: string
  readonly createdAt: number
  readonly createdBy: string
  readonly origin: 'human' | 'machine'
  readonly changeSummary: string
  readonly blocks: readonly SemanticBlock[]
  readonly euclidStatus?: 'raw_machine' | 'editor_draft'
}

export function createRevision(input: CreateRevisionInput): Revision {
  requireText(input.id, 'revision.id')
  requireText(input.contentId, 'revision.contentId')
  requireText(input.createdBy, 'revision.createdBy')
  requireText(input.changeSummary, 'revision.changeSummary')

  const issues = [...validateSemanticBlocks(input.blocks)]
  if (!Number.isInteger(input.version) || input.version < 1) {
    issues.push({ code: 'INVALID_REVISION_VERSION', message: 'Revision version 必须是从 1 开始的正整数。' })
  }
  if ((input.version === 1 && input.previousRevisionId) || (input.version > 1 && !input.previousRevisionId)) {
    issues.push({ code: 'INVALID_REVISION_CHAIN', message: '首版不能有前序版本，后续版本必须指向前序 Revision。' })
  }
  if (input.origin === 'machine' && input.euclidStatus && input.euclidStatus !== 'raw_machine') {
    issues.push({
      code: 'INVALID_REVISION_CHAIN',
      message: '机器生成的《几何原本》内容只能从 raw_machine 开始。',
    })
  }
  if (input.origin === 'machine' && input.blocks.some((block) => block.editorialStatus && block.editorialStatus !== 'raw_machine')) {
    issues.push({
      code: 'INVALID_BLOCK_STATUS',
      message: '机器生成的语义块不能自动标记为 editor_draft、math_reviewed 或 published。',
    })
  }
  if (issues.length > 0) throw new ContentModelError('Revision 数据无效。', issues)

  const blocks = input.blocks
    .map((block) => Object.freeze({ ...block }))
    .sort((left, right) => left.order - right.order)

  return Object.freeze({
    ...input,
    id: input.id.trim(),
    contentId: input.contentId.trim(),
    createdBy: input.createdBy.trim(),
    changeSummary: input.changeSummary.trim(),
    status: 'draft',
    blocks: freezeArray(blocks),
  })
}

export function createNextRevision(
  previous: Revision,
  input: Omit<CreateRevisionInput, 'contentId' | 'version' | 'previousRevisionId'>,
): Revision {
  return createRevision({
    ...input,
    contentId: previous.contentId,
    version: previous.version + 1,
    previousRevisionId: previous.id,
  })
}

export function createContentItem(input: Omit<ContentItem, 'revisionIds' | 'currentRevisionId' | 'publishedRevisionId'>): ContentItem {
  requireText(input.id, 'content.id')
  requireText(input.title, 'content.title')
  requireText(input.createdBy, 'content.createdBy')
  const issues = validateVisibility(input.visibility)
  if (issues.length > 0) throw new ContentModelError('Visibility 数据无效。', issues)
  return Object.freeze({
    ...input,
    visibility: freezeVisibility(input.visibility),
    revisionIds: freezeArray([]),
  })
}

export function attachRevision(content: ContentItem, revision: Revision): ContentItem {
  if (revision.contentId !== content.id) {
    throw new ContentModelError('Revision 不属于该 ContentItem。', [{
      code: 'INVALID_REVISION_CHAIN',
      message: `Revision ${revision.id} 的 contentId 与 ${content.id} 不一致。`,
      entityId: revision.id,
    }])
  }
  if (content.revisionIds.includes(revision.id)) return content
  return Object.freeze({
    ...content,
    revisionIds: freezeArray([...content.revisionIds, revision.id]),
    currentRevisionId: revision.id,
  })
}

export function reorderSemanticBlocks(
  blocks: readonly SemanticBlock[],
  orderedIds: readonly string[],
): readonly SemanticBlock[] {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  if (orderedIds.length !== blocks.length || new Set(orderedIds).size !== blocks.length
    || orderedIds.some((id) => !byId.has(id))) {
    throw new ContentModelError('重新排序必须且只能包含全部现有永久 block ID。', [{
      code: 'INVALID_BLOCK_ORDER',
      message: 'orderedIds 与现有语义块集合不一致。',
    }])
  }
  return freezeArray(orderedIds.map((id, order) => Object.freeze({ ...byId.get(id)!, order })))
}

export function validateAnnotationAnchor(anchor: AnnotationAnchor): readonly ModelValidationIssue[] {
  const textFields = [anchor.contentId, anchor.revisionId, anchor.blockId, anchor.blockVersion, anchor.quote]
  if (textFields.some((value) => !value.trim()) || !Number.isInteger(anchor.start)
    || !Number.isInteger(anchor.end) || anchor.start < 0 || anchor.end <= anchor.start
    || anchor.end - anchor.start !== anchor.quote.length) {
    return [{ code: 'INVALID_ANCHOR', message: 'Annotation anchor 的版本、语义块、范围与引文必须完整且彼此一致。' }]
  }
  return []
}

export function createAnnotationIssue(input: AnnotationIssue): AnnotationIssue {
  const issues = [...validateAnnotationAnchor(input.anchor)]
  if (!input.id.trim() || !input.body.trim() || !input.createdBy.trim()) {
    issues.push({ code: 'EMPTY_ID', message: 'Issue ID、正文和作者不能为空。' })
  }
  if (input.status !== 'open') {
    issues.push({ code: 'INVALID_REVISION_CHAIN', message: '新建 Issue 必须从 open 状态开始。' })
  }
  if (issues.length > 0) throw new ContentModelError('Annotation Issue 数据无效。', issues)
  return Object.freeze({ ...input, anchor: Object.freeze({ ...input.anchor }) })
}

function referenceKey(reference: ContentReference): string {
  return [reference.contentId, reference.revisionId ?? '', reference.blockId ?? ''].join('|')
}

export function validateEdges(
  contentIds: ReadonlySet<string>,
  edges: readonly Edge[],
): readonly ModelValidationIssue[] {
  const issues: ModelValidationIssue[] = []
  const edgeIds = new Set<string>()
  const relationships = new Set<string>()

  for (const edge of edges) {
    const sourceKey = referenceKey(edge.source)
    const targetKey = referenceKey(edge.target)
    if (!edge.id.trim()) {
      issues.push({ code: 'EMPTY_ID', message: '关系必须拥有永久 ID。' })
    } else if (edgeIds.has(edge.id)) {
      issues.push({ code: 'DUPLICATE_EDGE', message: `关系 ID 重复：${edge.id}`, entityId: edge.id })
    }
    edgeIds.add(edge.id)

    if (edge.source.contentId === edge.target.contentId) {
      issues.push({ code: 'SELF_REFERENCE', message: `关系不能指向自身：${edge.id}`, entityId: edge.id })
    }
    if (!contentIds.has(edge.source.contentId) || !contentIds.has(edge.target.contentId)) {
      issues.push({ code: 'DANGLING_EDGE', message: `关系存在缺失目标：${edge.id}`, entityId: edge.id })
    }

    const relationship = `${sourceKey}>${targetKey}>${edge.type}`
    if (relationships.has(relationship)) {
      issues.push({ code: 'DUPLICATE_EDGE', message: `关系重复：${edge.id}`, entityId: edge.id })
    }
    relationships.add(relationship)

    if (edge.provenance.kind === 'explicit_source_reference' && !edge.provenance.citation.trim()) {
      issues.push({ code: 'INVALID_PROVENANCE', message: `显式原文引用必须附引用文本：${edge.id}`, entityId: edge.id })
    }
    if (edge.provenance.kind === 'editorial_inference'
      && (!edge.provenance.editorId.trim() || !edge.provenance.rationale.trim())) {
      issues.push({ code: 'INVALID_PROVENANCE', message: `编辑推断必须记录编辑者和理由：${edge.id}`, entityId: edge.id })
    }
  }

  return issues
}

export function isReviewComplete(review: Review): boolean {
  return [
    review.mathematicalCorrectness,
    review.rigor,
    review.completeness,
    review.clarity,
    review.sourceVerification,
  ].every((result) => result === 'passed')
}
