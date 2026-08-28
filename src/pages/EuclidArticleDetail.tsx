import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  GitBranch,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Moon,
  PencilLine,
  ShieldAlert,
  Sun,
} from 'lucide-react'
import { euclidRepository, type EuclidEntryPayload } from '@/lib/euclid-repository'
import { browserEditorialStore } from '@/lib/editorial-store'
import type { Revision } from '@/lib/content-model'
import { getPassageBlockVersion } from '@/lib/annotations'
import { getEuclidEnrichment, type EuclidEnrichmentItem } from '@/lib/euclid-enrichment'
import {
  blockCitationEvidence,
  citationEvidenceLabel,
  groupUnlocatedCitationEdges,
  historicalReaderSurfaces,
  type EuclidCitationProvenance,
} from '@/lib/euclid-reader'
import { createPilotSessionId, recordPilotEvent } from '@/lib/pilot-events'
import { canUseAdminContentManagement } from '@/lib/permissions'
import { FEATURES } from '@/config/features'
import { useAuth } from '@/lib/auth-context'
import { store } from '@/lib/store'
import { EuclidDiagram } from '@/components/geometry/EuclidDiagram'
import { Markdown } from '@/components/Markdown'
import { MathProse } from '@/components/reading/MathProse'
import { PassageAnnotations } from '@/components/reading/PassageAnnotations'
import { CommentThread } from '@/components/CommentThread'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ReaderTheme = 'dark' | 'paper'
type EuclidBlock = EuclidEntryPayload['blocks'][number]
type EuclidRelation = EuclidEntryPayload['dependencies'][number]

const PILOT_SESSION_ID = createPilotSessionId()
const DEPENDENCY_RETURN_KEY = 'mf_pilot_dependency_return_v1'

const KIND_LABEL: Record<EuclidEntryPayload['contentItem']['kind'], string> = {
  proposition: '命题',
  definition: '定义',
  postulate: '公设',
  'common-notion': '公理',
}

const BLOCK_LABEL: Record<EuclidBlock['kind'], string> = {
  statement: '陈述',
  definition: '定义',
  postulate: '公设',
  common_notion: '公理',
  construction: '作图',
  proof_step: '证明',
  conclusion: '结论',
  historical_note: '历史原文',
  source: '来源',
}

function initialReaderTheme(): ReaderTheme {
  try {
    return localStorage.getItem('mf_reader_theme') === 'paper' ? 'paper' : 'dark'
  } catch {
    return 'dark'
  }
}

function romanBook(book: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'][book - 1] ?? String(book)
}

function relationLabel(relation: EuclidRelation): string {
  return relation.kind === 'proposition'
    ? `${romanBook(relation.book)}.${relation.number}`
    : `${romanBook(relation.book)} · ${KIND_LABEL[relation.kind]} ${relation.number}`
}

function citationLabel(id: string): string {
  const match = /^euclid-(\d+)-(?:(def|post|cn)-)?(\d+)$/.exec(id)
  if (!match) return id
  const marker = match[2]
  const kind = marker === 'def' ? '定义' : marker === 'post' ? '公设' : marker === 'cn' ? '公理' : ''
  return kind ? `${romanBook(Number(match[1]))} · ${kind} ${match[3]}` : `${romanBook(Number(match[1]))}.${match[3]}`
}

function estimateReadingMinutes(entry: EuclidEntryPayload): number {
  const length = entry.blocks.reduce((sum, block) => sum + block.surfaces.reduce((part, surface) => part + surface.text.length, 0), 0)
  return Math.max(4, Math.ceil(length / 720))
}

function rememberDependency(originId: string, targetId: string) {
  recordPilotEvent(PILOT_SESSION_ID, {
    type: 'followed_dependency',
    payload: { fromContentId: originId, toContentId: targetId },
  })
  try {
    sessionStorage.setItem(DEPENDENCY_RETURN_KEY, JSON.stringify({ originId, targetId }))
  } catch {
    // 本地试验记录不可用时不影响原典导航。
  }
}

export default function EuclidArticleDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [, bump] = useState(0)
  const [entry, setEntry] = useState<EuclidEntryPayload | null>(null)
  const [publishedRevision, setPublishedRevision] = useState<Revision | null>(null)
  const [editorialBindingNotice, setEditorialBindingNotice] = useState('')
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(null)
  const [theme, setTheme] = useState<ReaderTheme>(initialReaderTheme)
  const [immersive, setImmersive] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    euclidRepository.loadEntry(id, { signal: controller.signal })
      .then((payload) => {
        setEntry(payload)
        setLoadError(null)
        try {
          const editorial = browserEditorialStore().get(payload.contentItem.id)
          const publishedId = editorial?.content.publishedRevisionId
          const sourceMatches = editorial?.sourceBinding?.revisionId === payload.revision.id
            && editorial.sourceBinding.contentHash === payload.revision.contentHash
          if (publishedId && !sourceMatches) {
            setPublishedRevision(null)
            setEditorialBindingNotice('检测到基于旧版或未绑定源语料的本地发布稿。为避免旧中文覆盖当前英文底本，本页已停止叠加该稿；需由人工编辑迁移后才能恢复。')
          } else {
            setPublishedRevision(publishedId
              ? editorial?.revisions.find((revision) => revision.id === publishedId) ?? null
              : null)
            setEditorialBindingNotice('')
          }
        } catch {
          // 损坏或未知版本的本地编辑数据绝不能被当作已发布正文。
          setPublishedRevision(null)
          setEditorialBindingNotice('本地编辑记录无法通过完整性校验，因此没有作为正式中文叠加。原始记录未被修改。')
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError({ id, message: reason instanceof Error ? reason.message : '原典条目加载失败。' })
        }
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!entry) return
    recordPilotEvent(PILOT_SESSION_ID, {
      type: 'opened_proposition',
      payload: { contentId: entry.contentItem.id },
    })
    try {
      const pending = JSON.parse(sessionStorage.getItem(DEPENDENCY_RETURN_KEY) ?? 'null') as {
        originId?: string
        targetId?: string
      } | null
      if (pending?.originId === entry.contentItem.id && pending.targetId) {
        recordPilotEvent(PILOT_SESSION_ID, {
          type: 'returned_from_dependency',
          payload: { fromContentId: pending.targetId, toContentId: pending.originId },
        })
        sessionStorage.removeItem(DEPENDENCY_RETURN_KEY)
      }
    } catch {
      // 本地试验记录损坏时不改变阅读页行为。
    }
  }, [entry])

  useEffect(() => {
    if (!immersive) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [immersive])

  const annotationBlocks = useMemo(() => {
    const core = (entry?.blocks ?? []).map((block) => {
    const formal = publishedRevision?.blocks.find((candidate) => candidate.id === block.id)?.content
    return {
      id: block.id,
      title: block.title,
      version: formal
        ? getPassageBlockVersion(`${publishedRevision.id}\n${formal}\n${block.contentHash}`)
        : block.contentHash,
    }
    })
    const enrichment = entry ? getEuclidEnrichment(entry.contentItem.id) : undefined
    const supplemental = enrichment
      ? [enrichment.modernExplanation, ...enrichment.alternativeProofs, ...enrichment.commonErrors]
        .map((item) => ({
          id: item.id,
          title: item.title,
          version: `${item.revision.id}:${getPassageBlockVersion(item.content)}`,
        }))
      : []
    return [...core, ...supplemental]
  }, [entry, publishedRevision])

  if (loadError?.id === id) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-[#c98276]">该条原典无法读取：{loadError.message}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/principles')}>返回第一性原理</Button>
      </div>
    )
  }

  if (!entry || entry.contentItem.id !== id) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#929187]" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" /> 正在按需读取这一条原典正文…
      </div>
    )
  }

  const paperMode = theme === 'paper'
  const localDiscussionEnabled = FEATURES.localDiscussionPrototype
  const comments = localDiscussionEnabled
    ? store.comments().filter((comment) => comment.targetId === entry.contentItem.id)
    : []
  const canEdit = FEATURES.adminContentManagement && canUseAdminContentManagement(user)

  function toggleTheme() {
    const next: ReaderTheme = paperMode ? 'dark' : 'paper'
    setTheme(next)
    try {
      localStorage.setItem('mf_reader_theme', next)
    } catch {
      // 偏好无法保存时仍保留当前切换结果。
    }
  }

  return (
    <div className={`${immersive ? 'fixed inset-0 z-50 overflow-y-auto' : '-mx-4 min-h-screen'} ${
      paperMode ? 'math-reader-paper bg-[#f5f1e8] text-[#35342e]' : 'bg-[#10110f] text-[#e7e3d8]'
    }`}>
      <article className="mx-auto w-full max-w-[820px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate('/principles')}
            className="inline-flex items-center gap-1.5 text-sm opacity-70 transition-opacity hover:opacity-100">
            <ArrowLeft className="h-4 w-4" /> 第一性原理
          </button>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link to={`/internal/euclid/${entry.contentItem.id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs opacity-70 transition-opacity hover:opacity-100">
                <PencilLine className="h-4 w-4" /> 内部编辑
              </Link>
            )}
            <button type="button" onClick={toggleTheme} aria-label={paperMode ? '切换深色阅读' : '切换纸张阅读'}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs opacity-70 transition-opacity hover:opacity-100">
              {paperMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {paperMode ? '深色' : '纸张'}
            </button>
            <button type="button" onClick={() => setImmersive((current) => !current)} aria-pressed={immersive}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs opacity-70 transition-opacity hover:opacity-100">
              {immersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {immersive ? '退出沉浸' : '沉浸阅读'}
            </button>
          </div>
        </div>

        <header className="pt-14 sm:pt-20">
          <div className="flex flex-wrap items-center gap-3 text-xs tracking-wide opacity-75">
            <Badge variant="outline" className="border-current/20 text-current">《几何原本》</Badge>
            <span>Book {romanBook(entry.contentItem.book)} · {KIND_LABEL[entry.contentItem.kind]} {entry.contentItem.number}</span>
            <span>约 {estimateReadingMinutes(entry)} 分钟阅读</span>
          </div>
          <h1 className="mt-6 text-[2rem] font-semibold leading-[1.3] tracking-tight sm:text-[2.75rem]">
            <MathProse content={entry.contentItem.title} />
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-sm px-2 py-1 ${publishedRevision ? 'bg-[#8db394]/12 text-[#8fb197]' : 'bg-[#c29a73]/12 text-[#b88965]'}`}>
              {publishedRevision ? `published · v${publishedRevision.version}` : entry.status}
            </span>
            <span className="opacity-65">
              {publishedRevision
                ? '当前浏览器中的人工审核发布 Revision；英文底本仍逐块保留'
                : '机器辅助中文 · 尚未完成人工数学审核 · 非正式出版版本'}
            </span>
          </div>
          <div className="mt-10 border-l border-[#c7ad70]/60 pl-5 sm:pl-7">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a99361]">可信阅读边界</p>
            <p className="mt-3 text-[15px] leading-8 opacity-85">
              {entry.contentItem.sourceMissing
                ? '中文用于帮助阅读；本条在上游语料中存在英文底本缺口，页面保留缺口声明、内容版本与现存来源，不会用机器中文冒充缺失原文。'
                : '中文用于帮助阅读；每个语义块都保留 Heath 英文底本、内容版本与明确引用。若两者冲突，请以原文和人工校勘为准。'}
            </p>
          </div>
          {editorialBindingNotice && (
            <p className="mt-5 border-l border-[#c78f7c]/55 pl-5 text-xs leading-6 text-[#c99a89]" role="status">
              {editorialBindingNotice}
            </p>
          )}
        </header>

        <EuclidDiagram
          title={entry.contentItem.title}
          englishTitle={entry.contentItem.englishTitle}
          book={entry.contentItem.book}
          proposition={entry.contentItem.number}
          rendererId={entry.visualization.rendererId}
          trustLevel={entry.visualization.level}
          attestation={entry.visualization.attestation}
          paperMode={paperMode}
        />

        <div className="math-reader-body mt-14 border-t border-current/10 pt-7 sm:mt-16 sm:pt-10">
          {localDiscussionEnabled ? (
            <PassageAnnotations articleId={entry.contentItem.id} paperMode={paperMode} blocks={annotationBlocks}>
              <EuclidSemanticBlocks entry={entry} publishedRevision={publishedRevision} annotationVersions={annotationBlocks} />
            </PassageAnnotations>
          ) : (
            <EuclidSemanticBlocks entry={entry} publishedRevision={publishedRevision} annotationVersions={annotationBlocks} />
          )}
        </div>

        <EuclidDependencySection entry={entry} />

        {entry.sourceIssues.length > 0 && (
          <section className="mt-14 border-l border-[#c78f7c]/55 pl-5 sm:pl-7" aria-label="来源问题">
            <h2 className="inline-flex items-center gap-2 text-base font-medium">
              <ShieldAlert className="h-4 w-4 text-[#c78f7c]" /> 尚未解决的来源问题
            </h2>
            <div className="mt-4 space-y-3">
              {entry.sourceIssues.map((issue) => (
                <div key={issue.id} className="text-sm leading-7 opacity-85">
                  <span className="mr-2 rounded-sm border border-current/15 px-1.5 py-0.5 text-[10px]">{issue.status}</span>
                  {issue.description}
                </div>
              ))}
            </div>
          </section>
        )}

        {localDiscussionEnabled && (
          <section className="mt-16 border-t border-current/10 pt-9">
            <h2 className="text-base font-medium">讨论 · {comments.length}</h2>
            <CommentThread targetId={entry.contentItem.id} comments={comments} onPosted={() => bump((current) => current + 1)} />
          </section>
        )}
      </article>
    </div>
  )
}

function surface(block: EuclidBlock, role: EuclidBlock['surfaces'][number]['role']) {
  return block.surfaces.find((item) => item.role === role)?.text.trim() ?? ''
}

function EuclidSemanticBlocks({ entry, publishedRevision, annotationVersions }: {
  entry: EuclidEntryPayload
  publishedRevision: Revision | null
  annotationVersions: readonly { id: string; version: string }[]
}) {
  const enrichment = getEuclidEnrichment(entry.contentItem.id)
  const unlocatedCitations = groupUnlocatedCitationEdges(entry.outgoingEdges)
  return (
    <div className="space-y-10" aria-label="按原典顺序展开的语义证明链">
      {entry.blocks.map((block, index) => {
        const machineChinese = surface(block, 'machine_translation')
        const english = surface(block, 'source')
        const historical = surface(block, 'historical_source')
        const historicalModern = surface(block, 'historical_machine_interpretation')
        const sourceGap = surface(block, 'source_gap_notice')
        const provenance = surface(block, 'provenance_note')
        const formalChinese = publishedRevision?.blocks.find((candidate) => candidate.id === block.id)?.content ?? ''
        const primary = formalChinese || machineChinese || historicalModern || sourceGap || historical || provenance || english
        const historicalSurfaces = historicalReaderSurfaces(block, primary)
        const blockVersion = annotationVersions.find((candidate) => candidate.id === block.id)?.version ?? block.contentHash

        return (
          <section key={block.id} data-block-id={block.id} data-block-version={blockVersion}
            data-block-kind={block.kind} data-block-language="zh-CN"
            className={`scroll-mt-24 border-l pl-4 sm:pl-6 ${block.kind === 'source' ? 'border-current/15' : 'border-[#c7ad70]/35'}`}>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[10px] tabular-nums tracking-[0.18em] text-[#a58f60]">
                {String(index + 1).padStart(2, '0')} · {BLOCK_LABEL[block.kind]}
              </span>
              <h2 className="text-sm font-medium opacity-90">{block.title}</h2>
              <span className="text-[10px] opacity-55">{formalChinese ? 'published' : block.status}</span>
            </div>

            {primary && (
              <div data-reading-role={formalChinese ? 'formal-chinese' : machineChinese ? 'machine-chinese' : historicalModern ? 'historical-modern' : block.kind === 'historical_note' ? 'historical-original' : 'source'}>
                {formalChinese
                  ? <p className="mb-2 text-[10px] tracking-[0.12em] text-[#82a88a]">正式中文 · 人工发布 Revision v{publishedRevision?.version}</p>
                  : machineChinese
                    ? <p className="mb-2 text-[10px] tracking-[0.12em] opacity-60">现代中文 · 机器辅助草稿</p>
                    : historicalModern && <p className="mb-2 text-[10px] tracking-[0.12em] opacity-60">历史中译的现代汉语解读 · 机器辅助草稿</p>}
                <Markdown content={primary} />
              </div>
            )}

            {sourceGap && (
              <p className="mt-3 inline-flex rounded-sm border border-[#c78f7c]/35 px-2 py-1 text-[10px] text-[#c99a89]">
                英文底本缺失 · 上游语料问题已保留，未由机器内容补写
              </p>
            )}

            {english && english !== primary && (
              <aside data-reading-role="english-original"
                className="mt-5 border-l border-current/15 pl-3 sm:pl-4 [&_.md]:text-[13px] [&_.md]:leading-7 [&_.md]:opacity-80">
                <p className="text-[10px] tracking-[0.14em] opacity-65">英文原文 · Heath 底本</p>
                <div lang="en"><Markdown content={english} /></div>
              </aside>
            )}

            {historicalSurfaces.map((historicalSurface) => (
              <aside key={historicalSurface.role} data-reading-role={historicalSurface.readingRole}
                className={`mt-4 border-l pl-3 sm:pl-4 ${historicalSurface.role === 'historical_machine_interpretation' ? 'border-[#c7ad70]/25' : 'border-current/15'}`}>
                <p className="text-[10px] tracking-[0.14em] opacity-65">{historicalSurface.label}</p>
                <Markdown content={historicalSurface.text} />
              </aside>
            ))}

            {block.citations.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]" aria-label="本步骤引用的前置条目">
                <span className="opacity-70">这一段关联：</span>
                {block.citations.map((citationId) => {
                  const evidence = blockCitationEvidence(entry.outgoingEdges, block.id, citationId)
                  return (
                    <Link key={citationId} to={`/principles/${citationId}`}
                      data-citation-evidence={evidence}
                      onClick={() => rememberDependency(entry.contentItem.id, citationId)}
                      className="rounded-sm border border-[#c7ad70]/25 px-2 py-1 text-[#ae9563] transition-colors hover:border-[#c7ad70]/55">
                      {citationLabel(citationId)}
                      <span className="ml-1.5 text-[9px] opacity-65">{citationEvidenceLabel(evidence)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
      <UnlocatedCitationGroup edges={unlocatedCitations.explicit} provenance="explicit_source_reference"
        originId={entry.contentItem.id} />
      <UnlocatedCitationGroup edges={unlocatedCitations.editorial} provenance="editorial_inference"
        originId={entry.contentItem.id} />
      {enrichment && (
        <>
          <EnrichmentBlock item={enrichment.modernExplanation} label="现代解释" originId={entry.contentItem.id} />
          {enrichment.alternativeProofs.map((item) => (
            <EnrichmentBlock key={item.id} item={item} label="替代证明" originId={entry.contentItem.id} />
          ))}
          {enrichment.commonErrors.map((item) => (
            <EnrichmentBlock key={item.id} item={item} label="常见错误" originId={entry.contentItem.id} warning />
          ))}
        </>
      )}
    </div>
  )
}

type EuclidEdge = EuclidEntryPayload['outgoingEdges'][number]

function UnlocatedCitationGroup({ edges, provenance, originId }: {
  edges: EuclidEdge[]
  provenance: EuclidCitationProvenance
  originId: string
}) {
  if (edges.length === 0) return null
  const explicit = provenance === 'explicit_source_reference'
  return (
    <section data-citation-provenance={provenance}
      className={`border-l pl-4 text-xs leading-6 opacity-80 sm:pl-6 ${explicit ? 'border-[#c7ad70]/25' : 'border-[#82a88a]/35'}`}
      aria-label={explicit ? '尚未定位到具体证明步骤的原文明确引用' : '尚未定位到具体证明步骤的编辑推断'}>
      <p className="font-medium">
        {explicit ? '条目级原文明确引用' : '条目级编辑推断 · 非原文引用'} · 尚未定位到单一语义块
      </p>
      <p className="mt-1 opacity-75">
        {explicit
          ? '底本明确引用了下列早期条目，但当前自动分块还不能可靠判断它属于哪一步；因此只保留条目级链接，不伪造逐步定位。'
          : '下列关系来自有 provenance 的编辑判断，不属于底本原文引用；在定位到具体语义块之前，只保留条目级推断关系。'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {edges.map((edge) => (
          <Link key={edge.id} to={`/principles/${edge.targetContentId}`}
            onClick={() => rememberDependency(originId, edge.targetContentId)}
            className="rounded-sm border border-current/20 px-2 py-1 text-[#ae9563]">
            {citationLabel(edge.targetContentId)}
            <span className="ml-1.5 text-[9px] opacity-65">{citationEvidenceLabel(provenance)}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function EnrichmentBlock({ item, label, originId, warning = false }: {
  item: EuclidEnrichmentItem
  label: string
  originId: string
  warning?: boolean
}) {
  return (
    <section data-block-id={item.id} data-block-version={`${item.revision.id}:${getPassageBlockVersion(item.content)}`}
      data-block-kind={warning ? 'common-error' : label === '替代证明' ? 'alternative-proof' : 'modern-explanation'}
      className={`scroll-mt-24 border-l pl-4 sm:pl-6 ${warning ? 'border-[#c78f7c]/55' : 'border-[#c7ad70]/35'}`}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] tracking-[0.18em] text-[#a58f60]">{label}</span>
        <h2 className="text-sm font-medium opacity-90">{item.title}</h2>
        <span className="rounded-sm border border-[#c78f7c]/30 px-1.5 py-0.5 text-[10px] text-[#c99a89]">
          {item.revision.status} · v{item.revision.version}
        </span>
      </div>
      <p className="mb-4 text-[11px] leading-5 text-[#c99a89]">
        未经人工数学审核 · MathForge 站内补充草稿 · 不属于 Heath 原文证明链
      </p>
      <Markdown content={item.content} />
      {item.citations.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="opacity-70">补充草稿中的参考链接（未纳入原文依赖图）：</span>
          {item.citations.map((citationId) => (
            <Link key={citationId} to={`/principles/${citationId}`}
              onClick={() => rememberDependency(originId, citationId)}
              className="rounded-sm border border-[#c7ad70]/25 px-2 py-1 text-[#ae9563]">
              {citationLabel(citationId)}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function EuclidDependencySection({ entry }: { entry: EuclidEntryPayload }) {
  return (
    <section className="mt-14 border-t border-current/10 pt-9" aria-label="双向证明依赖图">
      <h2 className="inline-flex items-center gap-2 text-base font-medium">
        <GitBranch className="h-4 w-4 text-[#b8a06a]" /> 证明依赖图
      </h2>
      <p className="mt-2 text-xs leading-6 opacity-70">
        底本显式引用与有 provenance 的编辑推断可以同时展示，但标签严格区分；编辑推断不属于原文依赖。
      </p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <RelationList title="本证明依赖" empty="目前没有可展示的显式引用或编辑推断。" originId={entry.contentItem.id}
          relations={entry.dependencies} />
        <RelationList title="哪些后续条目使用了本结论" empty="目前没有可展示的后续显式引用或编辑推断。" originId={entry.contentItem.id}
          relations={entry.dependents} />
      </div>
    </section>
  )
}

function RelationList({ title, empty, originId, relations }: {
  title: string
  empty: string
  originId: string
  relations: EuclidRelation[]
}) {
  return (
    <div>
      <h3 className="text-sm font-medium opacity-90">{title} · {relations.length}</h3>
      {relations.length === 0 ? (
        <p className="mt-3 text-xs leading-6 opacity-70">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {relations.map((relation) => (
            <Link key={relation.edgeId} to={`/principles/${relation.id}`}
              data-citation-provenance={relation.provenance}
              onClick={() => rememberDependency(originId, relation.id)}
              className="group flex items-start gap-2 rounded-sm px-1 py-1.5 text-xs leading-6 transition-colors hover:bg-current/[0.04]">
              <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#b8a06a]" />
              <span>
                <span className="font-medium">{relationLabel(relation)}</span> · {relation.title}
                <span className="ml-2 text-[10px] opacity-55">{citationEvidenceLabel(relation.provenance)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {title === '本证明依赖' && relations.length > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] opacity-55">
          <BookOpen className="h-3 w-3" /> 点击可沿证明链返回前置条目
        </p>
      )}
    </div>
  )
}
