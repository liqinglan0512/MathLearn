import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CheckCircle2, Flag, GitBranch, History, LoaderCircle, Save, ShieldCheck } from 'lucide-react'
import {
  browserEditorialStore,
  type EditorialEntrySnapshot,
} from '@/lib/editorial-store'
import type {
  ContentKind,
  ReviewDimensionResult,
  SemanticBlock,
  SemanticBlockKind,
} from '@/lib/content-model'
import { isLatestReviewComplete, type WorkflowActor } from '@/lib/content-workflow'
import { euclidRepository, type EuclidEntryPayload } from '@/lib/euclid-repository'
import { useAuth } from '@/lib/auth-context'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Pane = 'source' | 'machine' | 'formal'
type EuclidBlock = EuclidEntryPayload['blocks'][number]

interface BlockFlagState {
  suspectedMistranslation: boolean
  mathematicalReviewPending: boolean
}

const FLAG_STORAGE_PREFIX = 'mf_euclid_editor_flags_v1:'
const REVIEW_RESULTS: ReviewDimensionResult[] = ['not_reviewed', 'passed', 'needs_changes', 'not_applicable']
const REVIEW_LABEL: Record<ReviewDimensionResult, string> = {
  not_reviewed: '尚未审核',
  passed: '通过',
  needs_changes: '需要修改',
  not_applicable: '不适用',
}
const REVIEW_FIELDS = [
  ['mathematicalCorrectness', '数学正确性'],
  ['rigor', '严谨性'],
  ['completeness', '完整性'],
  ['clarity', '清晰度'],
  ['sourceVerification', '来源核验'],
] as const

function contentKind(kind: EuclidEntryPayload['contentItem']['kind']): ContentKind {
  return kind === 'common-notion' ? 'axiom' : kind
}

function blockKind(kind: EuclidBlock['kind']): SemanticBlockKind {
  if (kind === 'common_notion') return 'axiom'
  if (kind === 'proof_step') return 'proof_step'
  return kind
}

function blockSurface(block: EuclidBlock, role: EuclidBlock['surfaces'][number]['role']): string {
  return block.surfaces.find((surface) => surface.role === role)?.text.trim() ?? ''
}

function machineDraft(block: EuclidBlock): string {
  return blockSurface(block, 'machine_translation')
    || blockSurface(block, 'historical_machine_interpretation')
    || blockSurface(block, 'source_gap_notice')
    || blockSurface(block, 'historical_source')
    || blockSurface(block, 'provenance_note')
    || blockSurface(block, 'source')
}

function seedBlocks(entry: EuclidEntryPayload): SemanticBlock[] {
  return entry.blocks.map((block) => ({
    id: block.id,
    kind: blockKind(block.kind),
    order: block.order,
    content: machineDraft(block),
    language: 'zh-CN',
    editorialStatus: 'raw_machine',
  }))
}

function sameEditableBlocks(left: readonly SemanticBlock[], right: readonly SemanticBlock[]): boolean {
  const snapshot = (blocks: readonly SemanticBlock[]) => blocks.map((block) => [
    block.id,
    block.kind,
    block.order,
    block.content,
    block.language ?? '',
    block.editorialStatus ?? '',
  ])
  return JSON.stringify(snapshot(left)) === JSON.stringify(snapshot(right))
}

function loadFlags(contentId: string): Record<string, BlockFlagState> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${FLAG_STORAGE_PREFIX}${contentId}`) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, BlockFlagState> : {}
  } catch {
    return {}
  }
}

function saveFlags(contentId: string, flags: Record<string, BlockFlagState>) {
  localStorage.setItem(`${FLAG_STORAGE_PREFIX}${contentId}`, JSON.stringify(flags))
}

export default function EuclidEditor() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const editorialStore = useMemo(() => browserEditorialStore(), [])
  const [entry, setEntry] = useState<EuclidEntryPayload | null>(null)
  const [snapshot, setSnapshot] = useState<EditorialEntrySnapshot | null>(null)
  const [draftBlocks, setDraftBlocks] = useState<SemanticBlock[]>([])
  const [flags, setFlags] = useState<Record<string, BlockFlagState>>({})
  const [mobilePane, setMobilePane] = useState<Pane>('formal')
  const [changeSummary, setChangeSummary] = useState('')
  const [workflowReason, setWorkflowReason] = useState('')
  const [reviewSummary, setReviewSummary] = useState('')
  const [review, setReview] = useState<Record<(typeof REVIEW_FIELDS)[number][0], ReviewDimensionResult>>({
    mathematicalCorrectness: 'not_reviewed',
    rigor: 'not_reviewed',
    completeness: 'not_reviewed',
    clarity: 'not_reviewed',
    sourceVerification: 'not_reviewed',
  })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState<{ id: string; message: string } | null>(null)
  const [isWriting, setIsWriting] = useState(false)

  const actor: WorkflowActor | null = user ? {
    id: user.id,
    kind: 'human',
    roles: ['admin', 'editor', 'math_reviewer', 'publisher'],
  } : null

  useEffect(() => {
    const controller = new AbortController()
    euclidRepository.loadEntry(id, { signal: controller.signal })
      .then(async (payload) => {
        const initialized = await editorialStore.initializeEuclidEntry({
          contentId: payload.contentItem.id,
          title: payload.contentItem.title,
          kind: contentKind(payload.contentItem.kind),
          blocks: seedBlocks(payload),
          createdBy: payload.revision.createdBy,
          createdAt: Date.UTC(2025, 0, 1),
          revisionId: payload.revision.id,
          sourceBinding: {
            revisionId: payload.revision.id,
            contentHash: payload.revision.contentHash,
          },
          visualizationTrust: payload.visualization.level,
        })
        if (controller.signal.aborted) return
        setEntry(payload)
        setSnapshot(initialized)
        setDraftBlocks(initialized.revisions.at(-1)?.blocks.map((block) => ({ ...block })) ?? [])
        setFlags(loadFlags(payload.contentItem.id))
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError({ id, message: reason instanceof Error ? reason.message : '内部编辑数据加载失败。' })
        }
      })
    return () => controller.abort()
  }, [editorialStore, id])

  const currentRevision = snapshot?.revisions.at(-1)
  const workflow = currentRevision ? snapshot?.workflows[currentRevision.id] : undefined
  const hasUnsavedChanges = currentRevision
    ? !sameEditableBlocks(draftBlocks, currentRevision.blocks)
    : false
  const completeReview = currentRevision && snapshot
    ? isLatestReviewComplete(entry?.contentItem.id ?? '', currentRevision.id, snapshot.reviews)
    : false
  const proposedReviewComplete = REVIEW_FIELDS.every(([field]) => review[field] === 'passed')
  const reviewRequiresStatusReset = Boolean(workflow
    && (workflow.publicationStatus === 'approved' || workflow.publicationStatus === 'published'
      || workflow.euclidStatus === 'math_reviewed' || workflow.euclidStatus === 'published')
    && !proposedReviewComplete)

  function refresh(contentId: string) {
    const next = editorialStore.get(contentId) ?? null
    setSnapshot(next)
    setDraftBlocks(next?.revisions.at(-1)?.blocks.map((block) => ({ ...block })) ?? [])
  }

  function updateBlock(blockId: string, update: Partial<SemanticBlock>) {
    setDraftBlocks((current) => current.map((block) => block.id === blockId ? { ...block, ...update } : block))
  }

  function toggleFlag(blockId: string, field: keyof BlockFlagState) {
    if (!entry) return
    const next = {
      ...flags,
      [blockId]: {
        suspectedMistranslation: flags[blockId]?.suspectedMistranslation ?? false,
        mathematicalReviewPending: flags[blockId]?.mathematicalReviewPending ?? true,
        [field]: !(flags[blockId]?.[field] ?? false),
      },
    }
    setFlags(next)
    saveFlags(entry.contentItem.id, next)
  }

  async function perform(action: () => Promise<unknown>, success: string) {
    setIsWriting(true)
    try {
      await action()
      if (entry) refresh(entry.contentItem.id)
      setNotice(success)
      setError(null)
    } catch (reason) {
      setError({ id, message: reason instanceof Error ? reason.message : '操作失败；没有修改审核状态。' })
      setNotice('')
    } finally {
      setIsWriting(false)
    }
  }

  async function saveDraft() {
    if (!entry || !actor || !currentRevision) return
    await perform(async () => {
      await editorialStore.appendEditorDraft(entry.contentItem.id, {
        expectedPreviousRevisionId: currentRevision.id,
        blocks: draftBlocks.map((block) => ({
          ...block,
          editorialStatus: block.editorialStatus === 'raw_machine' ? 'raw_machine' : 'editor_draft',
        })),
        changeSummary,
      }, actor)
      setChangeSummary('')
    }, '已追加一个 editor_draft Revision；旧版本未被覆盖，也没有自动提交或发布。')
  }

  function requireSavedRevision(): boolean {
    if (!hasUnsavedChanges) return true
    setError({ id, message: '正文还有未保存修改。请先保存为新 Revision，再对那个版本添加 Review 或改变状态。' })
    setNotice('')
    return false
  }

  async function addReview() {
    if (!entry || !actor || !currentRevision) return
    if (!requireSavedRevision()) return
    await perform(() => editorialStore.addReview(entry.contentItem.id, currentRevision.id, {
      ...review,
      summary: reviewSummary,
    }, actor), '人工 Review 已保存到当前 Revision；它本身不会触发发布。')
  }

  async function transitionPublication(target: 'pending_review' | 'revision_requested' | 'approved' | 'published' | 'archived') {
    if (!entry || !actor || !currentRevision) return
    if (!requireSavedRevision()) return
    await perform(() => editorialStore.transitionPublication(entry.contentItem.id, currentRevision.id, target, actor, {
      reason: workflowReason,
    }), `发布工作流已显式变更为 ${target}。`)
  }

  async function confirmMathReview() {
    if (!entry || !actor || !currentRevision) return
    if (!requireSavedRevision()) return
    await perform(() => editorialStore.transitionEuclid(entry.contentItem.id, currentRevision.id, 'math_reviewed', actor, {
      reason: workflowReason,
    }), '当前 Revision 已由人工显式标记为 math_reviewed；尚未发布。')
  }

  if (error?.id === id && (!entry || entry.contentItem.id !== id)) {
    return <div className="py-20 text-center text-sm text-[#c98276]" role="alert">{error.message}</div>
  }
  if (!entry || entry.contentItem.id !== id || !snapshot || snapshot.content.id !== id || !currentRevision || !workflow) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#929187]" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" /> 正在初始化本地编辑工作区…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <Link to={`/principles/${entry.contentItem.id}`} className="inline-flex items-center gap-1.5 text-xs text-[#929187] hover:text-[#e8e1d1]">
            <ArrowLeft className="h-3.5 w-3.5" /> 返回公开阅读页
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-[#eee6d3]">{entry.contentItem.title}</h1>
          <p className="mt-2 text-xs leading-6 text-[#99968d]">
            内部本地编辑原型 · 保存只追加 Revision · 数学审核与发布必须分别操作
          </p>
        </div>
        <div className="text-right text-xs leading-6 text-[#99968d]">
          <p>Revision v{currentRevision.version} · {workflow.euclidStatus}</p>
          <p>发布状态：{workflow.publicationStatus}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 md:hidden" aria-label="窄屏编辑栏切换">
        {(['source', 'machine', 'formal'] as Pane[]).map((pane) => (
          <button key={pane} type="button" onClick={() => setMobilePane(pane)} aria-pressed={mobilePane === pane}
            className={`rounded-sm border px-3 py-1.5 text-xs ${mobilePane === pane ? 'border-[#c7ad70]/55 text-[#e7d6a7]' : 'border-white/10 text-[#929187]'}`}>
            {pane === 'source' ? '英文底本' : pane === 'machine' ? '机器草稿' : '正式中文'}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {entry.blocks.map((sourceBlock, index) => {
          const draft = draftBlocks.find((block) => block.id === sourceBlock.id)
          if (!draft) return null
          const english = blockSurface(sourceBlock, 'source') || blockSurface(sourceBlock, 'historical_source')
          const machine = machineDraft(sourceBlock)
          const blockFlags = flags[sourceBlock.id] ?? {
            suspectedMistranslation: false,
            mathematicalReviewPending: true,
          }
          return (
            <section key={sourceBlock.id} className="rounded-md border border-white/[0.075] bg-[#141510] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] tracking-[0.16em] text-[#9d895d]">{String(index + 1).padStart(2, '0')} · {sourceBlock.id}</span>
                  <h2 className="mt-1 text-sm font-medium text-[#ddd7c9]">{sourceBlock.title}</h2>
                </div>
                <select value={draft.editorialStatus ?? 'editor_draft'}
                  onChange={(event) => updateBlock(sourceBlock.id, { editorialStatus: event.target.value as 'raw_machine' | 'editor_draft' })}
                  className="rounded-sm border border-white/10 bg-[#10110f] px-2 py-1 text-xs text-[#bdb7aa]">
                  <option value="raw_machine">raw_machine</option>
                  <option value="editor_draft">editor_draft</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <EditorPane title="英文底本 / 历史古文" visible={mobilePane === 'source'}>
                  <Markdown content={english || '本块没有对应的英文/历史原文表面。'} />
                </EditorPane>
                <EditorPane title="机器草稿（只读）" visible={mobilePane === 'machine'}>
                  <Markdown content={machine || '本块没有机器草稿。'} />
                </EditorPane>
                <EditorPane title="正式中文编辑稿" visible={mobilePane === 'formal'}>
                  <Textarea value={draft.content} rows={Math.max(5, Math.min(14, draft.content.split('\n').length + 4))}
                    onChange={(event) => updateBlock(sourceBlock.id, {
                      content: event.target.value,
                      editorialStatus: 'editor_draft',
                    })}
                    className="min-h-36 border-white/10 bg-[#10110f] text-[13px] leading-7" />
                </EditorPane>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-[#aaa69b]">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={blockFlags.suspectedMistranslation}
                    onChange={() => toggleFlag(sourceBlock.id, 'suspectedMistranslation')} className="accent-[#c7ad70]" />
                  <Flag className="h-3.5 w-3.5" /> suspected mistranslation（只标记，不自动改写）
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={blockFlags.mathematicalReviewPending}
                    onChange={() => toggleFlag(sourceBlock.id, 'mathematicalReviewPending')} className="accent-[#c7ad70]" />
                  mathematical review pending
                </label>
              </div>
            </section>
          )
        })}
      </div>

      <section className="mt-8 grid gap-6 border-t border-white/[0.08] pt-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#ded8ca]"><Save className="h-4 w-4 text-[#b8a06a]" /> 追加编辑 Revision</h2>
          <Input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)}
            placeholder="必填：说明本次修改了什么，为什么修改" className="mt-4" />
          <Button className="mt-3" disabled={isWriting || !changeSummary.trim() || !hasUnsavedChanges} onClick={saveDraft}>保存为新 editor_draft</Button>
          <p className="mt-2 text-[11px] leading-5 text-[#8f8d85]">
            {hasUnsavedChanges ? '当前有未保存正文；审核与状态按钮已锁定。' : '正文与当前 Revision 一致。'}
            保存不等于提交审核，更不等于发布；旧 Revision 永久保留。
          </p>
        </div>
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#ded8ca]"><History className="h-4 w-4 text-[#b8a06a]" /> 版本历史 · {snapshot.revisions.length}</h2>
          <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-2">
            {[...snapshot.revisions].reverse().map((revision) => (
              <div key={revision.id} className="border-l border-white/10 pl-3 text-xs leading-6 text-[#a7a49b]">
                v{revision.version} · {revision.euclidStatus} · {revision.createdBy}<br />
                <span className="opacity-70">{revision.changeSummary}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-white/[0.08] pt-8" aria-label="独立人工审核与发布工作流">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#ded8ca]"><ShieldCheck className="h-4 w-4 text-[#b8a06a]" /> 独立人工审核 · 绑定 v{currentRevision.version} / {currentRevision.id}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {REVIEW_FIELDS.map(([field, label]) => (
            <label key={field} className="text-xs text-[#aaa69b]">
              <span className="mb-1.5 block">{label}</span>
              <select value={review[field]} onChange={(event) => setReview((current) => ({
                ...current,
                [field]: event.target.value as ReviewDimensionResult,
              }))} className="w-full rounded-sm border border-white/10 bg-[#10110f] px-2 py-2 text-xs">
                {REVIEW_RESULTS.map((result) => <option key={result} value={result}>{REVIEW_LABEL[result]}</option>)}
              </select>
            </label>
          ))}
        </div>
        <Textarea value={reviewSummary} onChange={(event) => setReviewSummary(event.target.value)} rows={3}
          placeholder="必填：人工审核摘要与尚存问题" className="mt-4" />
        <Button variant="outline" className="mt-3"
          disabled={isWriting || !reviewSummary.trim() || hasUnsavedChanges || reviewRequiresStatusReset}
          onClick={addReview}>保存 Review（不改变发布状态）</Button>
        {reviewRequiresStatusReset && (
          <p className="mt-2 text-xs leading-6 text-[#c7ad70]">
            {workflow.publicationStatus === 'approved'
              ? '当前 Revision 已批准。请先显式退回 revision_requested，再编辑并保存新的 editor_draft；needs_changes 必须绑定新版本。'
              : workflow.publicationStatus === 'published'
                ? '当前 Revision 已发布。请先显式归档，再编辑并保存新的 editor_draft；needs_changes 必须绑定新版本。'
                : `当前 Revision 保留 ${workflow.euclidStatus} 的历史结论。请先编辑并保存新的 editor_draft，再在新版本上记录 needs_changes。`}
          </p>
        )}

        <div className="mt-8 rounded-md border border-white/[0.07] p-4">
          <p className="text-xs leading-6 text-[#aaa69b]">
            当前：{workflow.publicationStatus} / {workflow.euclidStatus} · 完整同版人工 Review：{completeReview ? '有' : '无'}
          </p>
          <Input value={workflowReason} onChange={(event) => setWorkflowReason(event.target.value)}
            placeholder="每次状态变化都必须填写理由" className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-2">
            {(workflow.publicationStatus === 'draft' || workflow.publicationStatus === 'revision_requested') && (
              <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges} onClick={() => transitionPublication('pending_review')}>提交人工审核</Button>
            )}
            {workflow.publicationStatus === 'pending_review' && (
              <>
                <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges} onClick={() => transitionPublication('revision_requested')}>退回修改</Button>
                <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges || !completeReview} onClick={() => transitionPublication('approved')}>批准 Revision</Button>
              </>
            )}
            {workflow.euclidStatus === 'editor_draft' && (
              <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges || !completeReview} onClick={confirmMathReview}>确认 math_reviewed</Button>
            )}
            {workflow.publicationStatus === 'approved' && (
              <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges}
                onClick={() => transitionPublication('revision_requested')}>撤回批准并退回修改</Button>
            )}
            {workflow.publicationStatus === 'approved' && workflow.euclidStatus === 'math_reviewed' && (
              <Button disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges} onClick={() => transitionPublication('published')}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> 独立发布当前 Revision
              </Button>
            )}
            {workflow.publicationStatus === 'published' && (
              <Button variant="outline" disabled={isWriting || !workflowReason.trim() || hasUnsavedChanges}
                onClick={() => transitionPublication('archived')}>归档已发布 Revision</Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 border-t border-white/[0.08] pt-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#ded8ca]"><GitBranch className="h-4 w-4 text-[#b8a06a]" /> 显式依赖与来源问题</h2>
        <p className="mt-3 text-xs leading-6 text-[#9c9990]">{entry.dependencies.length} 条底本显式依赖；{entry.sourceIssues.length} 条来源问题。编辑推断必须另建 provenance，不能改写为原典引用。</p>
      </section>

      {notice && <p className="mt-6 text-sm leading-7 text-[#9fbd9f]" role="status">{notice}</p>}
      {error?.id === id && <p className="mt-6 text-sm leading-7 text-[#c98276]" role="alert">{error.message}</p>}
    </div>
  )
}

function EditorPane({ title, visible, children }: { title: string; visible: boolean; children: ReactNode }) {
  return (
    <div className={`${visible ? 'block' : 'hidden'} min-w-0 md:block`}>
      <p className="mb-2 text-[10px] tracking-[0.14em] text-[#8f8d85]">{title}</p>
      <div className="max-h-80 overflow-y-auto rounded-sm border border-white/[0.06] bg-[#10110f] p-3 text-[12px] leading-6 text-[#b8b4a9]">
        {children}
      </div>
    </div>
  )
}
