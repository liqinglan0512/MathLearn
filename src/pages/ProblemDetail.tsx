import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp,
  FlaskConical, GitBranch, Heart, Lightbulb, ListChecks, MessageSquare, PenLine,
  ShieldAlert, ShieldCheck,
} from 'lucide-react'
import { store, uid } from '@/lib/store'
import {
  describeSolutionApproach, diagnoseKnowledgeGaps, getKnowledgeNodes, getKnowledgeStatus,
  getLabMeta, getProblemLearningProfile, getProofReview, recordProblemAttempt,
  recordProofReview, setKnowledgeStatus, type KnowledgeNode, type KnowledgeStatus,
  type ProblemLearningProfile, type ProofVerification,
} from '@/lib/learning'
import { canUseAdminContentManagement } from '@/lib/permissions'
import { FEATURES } from '@/config/features'
import { useAuth } from '@/lib/auth-context'
import { Markdown } from '@/components/Markdown'
import { MathProse } from '@/components/reading/MathProse'
import { AttachmentList } from '@/components/Attachments'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const STATUS_LABEL: Record<KnowledgeStatus, string> = {
  unseen: '尚未标记', learning: '学习中', weak: '需要补强', mastered: '已掌握', review: '待复习',
}
const STATUS_STYLE: Record<KnowledgeStatus, string> = {
  unseen: 'text-[#85857e]', learning: 'text-[#d1c094]', weak: 'text-[#e2a095]',
  mastered: 'text-[#9bbba1]', review: 'text-[#c6ae78]',
}
const VERIFICATION_LABEL: Record<ProofVerification, string> = {
  unreviewed: '待验证', community_checked: '社区已核对',
  editor_checked: '编辑已复核', rigorous: '编辑确认严格证明',
}
const PROOF_CHECKS = [
  '已逐条核对定理的使用条件', '每一步推导都有明确依据',
  '已检查边界、等号与反例', '结论与原问题完全对应',
]

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ProblemDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [, bump] = useState(0)
  const [hintProgress, setHintProgress] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')
  const problem = store.problems().find((candidate) => candidate.id === id)

  if (!problem) return (
    <div className="py-24 text-center">
      <p className="text-[#96958d]">题目不存在或已被删除。</p>
      <Button variant="ghost" className="mt-4" onClick={() => nav('/problems')}>返回题库</Button>
    </div>
  )

  const profile = getProblemLearningProfile(problem)
  const solutions = store.solutions().filter((solution) => solution.problemId === problem.id)
  const comments = store.comments().filter((comment) => comment.targetId === problem.id)
  const articles = profile.articleIds
    .map((articleId) => store.articles().find((article) => article.id === articleId))
    .filter((article): article is NonNullable<typeof article> => article !== undefined)
  const variants = profile.variantIds
    .map((problemId) => store.problems().find((candidate) => candidate.id === problemId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== undefined)
  const revealedHints = hintProgress[problem.id] ?? 0
  const matchingGaps = diagnoseKnowledgeGaps().filter(
    (gap) => gap.confidence === 'repeated' && profile.prerequisiteIds.includes(gap.node.id),
  )

  function reportAttempt(outcome: 'struggled' | 'solved') {
    recordProblemAttempt(problem!.id, outcome)
    setNotice(outcome === 'struggled'
      ? '已记录卡点；只有多道题指向同一知识时，才会提示共同薄弱环节。'
      : '已记录独立解出；知识是否真正掌握，仍由你逐项确认。')
    bump((value) => value + 1)
  }

  return (
    <div className="py-9 sm:py-12">
      <Link to="/problems" className="inline-flex items-center gap-1.5 text-[13px] text-[#96958d] hover:text-[#e9e2d0]">
        <ArrowLeft className="h-4 w-4" /> 返回题库
      </Link>

      <article className="mt-9">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="border-[#c7ad70]/20 text-[#cfbb8c]">{problem.chapter}</Badge>
          <Badge variant="outline" className="border-white/10 text-[#c5c1b5]">{problem.difficulty}</Badge>
          <span className="text-[#929188]">{problem.competition}</span>
          <span className="text-[#686861]">·</span>
          <span className="text-[#929188]">{fmt(problem.createdAt)}</span>
        </div>
        <h1 className="mt-4 text-[1.8rem] font-semibold tracking-[-0.045em] text-[#f0e8d3] sm:text-[2.2rem]">
          <MathProse content={problem.title} />
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#a8a59a]"><MathProse content={profile.summary} /></p>
        <div className="mt-8 rounded-[5px] bg-[#181914]/80 px-5 py-5 ring-1 ring-white/[0.045] sm:px-8 sm:py-7">
          <Markdown content={problem.statement} />
          <AttachmentList items={problem.attachments} />
        </div>
      </article>

      <div className="mt-11 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
        <div className="min-w-0">
          <section aria-labelledby="learning-loop-heading">
            <SectionHeading id="learning-loop-heading" eyebrow="LEARNING PATH" title="把不会的地方，接回完整逻辑"
              description="从前置知识回到推导，再用动态实验与变式检验重新理解。" />
            <div className="mt-7 grid gap-px overflow-hidden rounded-[5px] bg-white/[0.055] sm:grid-cols-2">
              <PathCard icon={<BookOpen className="h-[18px] w-[18px]" />} label="回到第一性原理"
                description={articles[0]?.title ?? '从定义与逻辑条件重新开始'}
                to={articles[0] ? `/principles/${articles[0].id}` : '/principles'} />
              <PathCard icon={<FlaskConical className="h-[18px] w-[18px]" />} label="进入概念实验室"
                description={getLabMeta(profile.labIds[0]).description} to={getLabMeta(profile.labIds[0]).href} />
              <PathCard icon={<Lightbulb className="h-[18px] w-[18px]" />} label="逐级打开提示"
                description="只揭开下一层观察，不提前泄露完整证明。" to="#hints" />
              <PathCard icon={<GitBranch className="h-[18px] w-[18px]" />} label="比较迁移与变式"
                description={variants.length ? `${variants.length} 道真实题库中的相关练习` : '当前题库尚无足够接近的变式'} to="#variants" />
            </div>
          </section>

          <section id="hints" className="mt-14 scroll-mt-24" aria-labelledby="hint-heading">
            <SectionHeading id="hint-heading" eyebrow="GUIDED DISCOVERY" title="提示阶梯"
              description="每次只推进一步；在继续之前，先尝试自己补全逻辑。" />
            <div className="mt-7 space-y-0">
              {profile.hints.slice(0, revealedHints).map((hint, index) => (
                <div key={hint.title} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 pb-7">
                  {index < profile.hints.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-white/[0.08]" />}
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#c7ad70]/35 text-[11px] text-[#d6c294]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-[14px] font-medium text-[#e9e2d0]"><MathProse content={hint.title} /></h3>
                    <Markdown content={hint.content} className="mt-2 text-[13px]" />
                  </div>
                </div>
              ))}
            </div>
            {revealedHints < profile.hints.length ? (
              <button onClick={() => {
                setHintProgress((current) => ({ ...current, [problem.id]: revealedHints + 1 }))
                if (revealedHints === 0) recordProblemAttempt(problem.id, 'review')
              }} className="inline-flex items-center gap-2 rounded-[4px] border border-[#c7ad70]/25 px-4 py-2.5 text-[13px] text-[#ded2b4] hover:border-[#c7ad70]/50">
                <Lightbulb className="h-4 w-4" />
                {revealedHints === 0 ? '先看第一层提示' : `打开第 ${revealedHints + 1} 层提示`}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : <p className="flex items-center gap-2 text-[13px] text-[#aaa79d]"><Check className="h-4 w-4 text-[#a9b89b]" /> 所有提示已展开。</p>}
          </section>

          {articles.length > 0 && (
            <section className="mt-14" aria-labelledby="principle-links-heading">
              <SectionHeading id="principle-links-heading" eyebrow="FIRST PRINCIPLES" title="把定理推回它成立的地方" />
              <div className="mt-5 divide-y divide-white/[0.055]">
                {articles.map((article) => (
                  <Link key={article.id} to={`/principles/${article.id}`} className="group flex items-start justify-between gap-4 py-4">
                    <div><p className="text-[14px] font-medium text-[#ded9cc] group-hover:text-[#f0e8d3]"><MathProse content={article.title} /></p>
                      <p className="mt-1.5 text-[12px] leading-6 text-[#929188]"><MathProse content={article.summary} /></p></div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9e8b65] group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-14" aria-labelledby="solutions-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading id="solutions-heading" eyebrow="PROOF AUDIT" title={`解法比较 · ${solutions.length}`}
                description="发布来源不等于正确性；每份证明都需要逐步核对。" />
              {FEATURES.publicContribution && (
                <Button size="sm" onClick={() => nav(user ? `/problems/${problem.id}/new-solution` : '/login')}>
                  <PenLine className="mr-1 h-4 w-4" /> 提交解法审核
                </Button>
              )}
            </div>
            {solutions.length === 0 ? <p className="mt-7 py-8 text-sm text-[#96958d]">还没有解法，可以沿提示阶梯留下第一份证明。</p> : (
              <div className="mt-7 space-y-5">
                {solutions.map((solution, index) => <SolutionCard key={solution.id} index={index} solution={solution}
                  onChange={() => bump((value) => value + 1)} />)}
              </div>
            )}
          </section>

          <section id="variants" className="mt-14 scroll-mt-24" aria-labelledby="variants-heading">
            <SectionHeading id="variants-heading" eyebrow="TRANSFER PRACTICE" title="迁移与变式检验"
              description="只展示题库中真实存在的相关题；同一学科不自动意味着同构。" />
            {variants.length === 0 ? <p className="mt-5 text-[13px] leading-7 text-[#96958d]">当前题库还没有足够接近的变式；可以先回到推导或实验室。</p> : (
              <div className="mt-4 divide-y divide-white/[0.055]">
                {variants.map((variant) => (
                  <Link key={variant.id} to={`/problems/${variant.id}`} className="group flex items-center justify-between gap-3 py-4">
                    <div><p className="text-[14px] text-[#ded9cc] group-hover:text-[#f0e8d3]"><MathProse content={variant.title} /></p>
                      <p className="mt-1 text-[12px] text-[#929188]"><MathProse content={getProblemLearningProfile(variant).summary} /></p></div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#9e8b65] group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <Separator className="my-12 bg-white/[0.075]" />
          <section><h2 className="flex items-center gap-2 text-[17px] font-medium text-[#e9e2d0]">
            <MessageSquare className="h-4 w-4 text-[#c7ad70]" /> 讨论 · {comments.length}</h2>
            <CommentThread targetId={problem.id} comments={comments} onPosted={() => bump((value) => value + 1)} />
          </section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24" aria-label="个人知识路径">
          <section><p className="text-[10px] font-medium tracking-[0.22em] text-[#b29b69]">PREREQUISITES</p>
            <h2 className="mt-2 text-[16px] font-medium text-[#e9e2d0]">前置知识链</h2>
            <p className="mt-1 text-[12px] leading-6 text-[#929188]">点击状态，按实际理解程度标记。</p>
            <KnowledgePath profile={profile} onChange={() => { setNotice('个人知识标记已保存。'); bump((value) => value + 1) }} />
          </section>
          <section><p className="text-[10px] font-medium tracking-[0.22em] text-[#b29b69]">MY PROGRESS</p>
            <h2 className="mt-2 text-[16px] font-medium text-[#e9e2d0]">这次做到哪里</h2>
            <div className="mt-4 flex flex-col items-start gap-2">
              <button onClick={() => reportAttempt('struggled')} className="inline-flex items-center gap-2 text-[13px] text-[#c8c3b5] hover:text-[#eadfca]">
                <CircleHelp className="h-4 w-4 text-[#c7ad70]" /> 我在这里卡住了</button>
              <button onClick={() => reportAttempt('solved')} className="inline-flex items-center gap-2 text-[13px] text-[#c8c3b5] hover:text-[#eadfca]">
                <Check className="h-4 w-4 text-[#a9b89b]" /> 我已经独立解决</button>
            </div>
            {notice && <p role="status" className="mt-4 text-[12px] leading-6 text-[#a5a196]">{notice}</p>}
          </section>
          {matchingGaps.length > 0 && <section className="rounded-[4px] bg-[#c7ad70]/[0.065] p-4">
            <p className="flex items-center gap-2 text-[12px] font-medium text-[#d7c08b]">
              <AlertTriangle className="h-4 w-4" /> 共同前置环节</p>
            {matchingGaps.slice(0, 2).map((gap) => <p key={gap.node.id} className="mt-2 text-[12px] leading-6 text-[#c9c3b4]">
              「<MathProse content={gap.node.label} />」出现在 {gap.problemIds.length} 道你标记卡住的题中；这是复习线索，不是诊断结论。</p>)}
          </section>}
          <section><p className="text-[10px] font-medium tracking-[0.22em] text-[#b29b69]">CONCEPT LABS</p>
            <h2 className="mt-2 text-[16px] font-medium text-[#e9e2d0]">对应动态实验</h2>
            <div className="mt-3 space-y-3">{profile.labIds.map((labId) => {
              const lab = getLabMeta(labId)
              return <Link key={lab.id} to={lab.href} className="group block">
                <span className="flex items-center justify-between gap-2 text-[13px] text-[#d3cec0]"><MathProse content={lab.label} />
                  <ArrowRight className="h-3.5 w-3.5 text-[#9e8b65] group-hover:translate-x-1" /></span>
                <span className="mt-1 block text-[11px] leading-5 text-[#929188]"><MathProse content={lab.description} /></span>
              </Link>
            })}</div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return <div><p className="text-[10px] font-medium tracking-[0.22em] text-[#b29b69]">{eyebrow}</p>
    <h2 id={id} className="mt-2 text-[18px] font-medium tracking-[-0.025em] text-[#e9e2d0]"><MathProse content={title} /></h2>
    {description && <p className="mt-1.5 text-[12px] leading-6 text-[#929188]"><MathProse content={description} /></p>}</div>
}

function PathCard({ icon, label, description, to }: { icon: ReactNode; label: string; description: string; to: string }) {
  const className = 'group min-w-0 bg-[#151613] px-5 py-5 transition-colors hover:bg-[#1a1b17]'
  const content = <><span className="text-[#c7ad70]">{icon}</span>
    <span className="mt-3 block text-[13px] font-medium text-[#ded9cc]"><MathProse content={label} /></span>
    <span className="mt-1.5 block text-[11px] leading-5 text-[#929188]"><MathProse content={description} /></span></>
  return to.startsWith('#') ? <a href={to} className={className}>{content}</a> : <Link to={to} className={className}>{content}</Link>
}

function KnowledgePath({ profile, onChange }: { profile: ProblemLearningProfile; onChange: () => void }) {
  const nodes = getKnowledgeNodes(profile.prerequisiteIds)
  return <ol className="mt-5 space-y-0">{nodes.map((knowledge, index) => <li key={knowledge.id} className="relative pb-5 pl-6 last:pb-0">
    {index < nodes.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[5px] top-3 w-px bg-white/[0.11]" />}
    <span aria-hidden="true" className="absolute left-0 top-[6px] h-[11px] w-[11px] rounded-full border border-[#c7ad70]/60 bg-[#151613]" />
    <p className="text-[13px] text-[#dfd9cb]"><MathProse content={knowledge.label} /></p>
    <p className="mt-1 text-[11px] leading-5 text-[#929188]"><MathProse content={knowledge.description} /></p>
    <KnowledgeStatusPicker knowledge={knowledge} onChange={onChange} />
  </li>)}</ol>
}

function KnowledgeStatusPicker({ knowledge, onChange }: { knowledge: KnowledgeNode; onChange: () => void }) {
  const status = getKnowledgeStatus(knowledge.id)
  return <label className="relative mt-2 inline-flex items-center"><span className="sr-only">标记{knowledge.label}的掌握状态</span>
    <select value={status} onChange={(event) => { setKnowledgeStatus(knowledge.id, event.target.value as KnowledgeStatus); onChange() }}
      className={`appearance-none bg-transparent pr-4 text-[11px] outline-none ${STATUS_STYLE[status]}`}>
      {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value} className="bg-[#181914] text-[#e6dfcf]">{label}</option>)}
    </select><ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-0 h-3 w-3 ${STATUS_STYLE[status]}`} />
  </label>
}

function SolutionCard({ index, solution, onChange }: {
  index: number; solution: ReturnType<typeof store.solutions>[number]; onChange: () => void
}) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [auditOpen, setAuditOpen] = useState(false)
  const [concern, setConcern] = useState('')
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [auditNotice, setAuditNotice] = useState('')
  const review = getProofReview(solution.id)
  const status = review?.status ?? 'unreviewed'
  const proofComments = store.comments().filter((comment) => comment.targetId === solution.id)
  const isOwnSolution = user?.id === solution.authorId
  const canModerate = canUseAdminContentManagement(user)

  function submitConcern(event: FormEvent) {
    event.preventDefault()
    if (!user) return nav('/login')
    if (!concern.trim()) return
    store.addComment({ id: uid(), targetId: solution.id, authorId: user.id, authorName: user.name,
      content: concern.trim(), createdAt: Date.now() })
    setConcern('')
    setAuditNotice('疑点已关联到对应解法，不会被误标为已经解决。')
    onChange()
  }

  function verify(nextStatus: ProofVerification) {
    if (!user) return nav('/login')
    if (!canModerate) return setAuditNotice('审核状态只能由本地管理员编辑工作流修改。')
    if (isOwnSolution) return setAuditNotice('作者不能为自己的解法完成独立核验。')
    if (checkedItems.length !== PROOF_CHECKS.length)
      return setAuditNotice('请先逐条确认四项条件；来源或点赞数不能代替证明审计。')
    recordProofReview({ solutionId: solution.id, status: nextStatus, reviewerId: user.id,
      reviewerName: user.name, checkedAt: Date.now(), checks: checkedItems }, user)
    setAuditNotice('已记录核验人、时间与检查项。')
    onChange()
  }

  return <div className="rounded-[5px] bg-[#181914]/70 px-5 py-5 ring-1 ring-white/[0.05] sm:px-6 sm:py-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] tracking-[0.18em] text-[#9b8962]">METHOD {String(index + 1).padStart(2, '0')}</p>
        <p className="mt-1.5 text-[14px] font-medium text-[#e9e2d0]"><MathProse content={describeSolutionApproach(solution)} /></p>
        <p className="mt-1 text-[11px] text-[#96958d]">{solution.authorName} · {fmt(solution.createdAt)}</p></div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 text-[11px] ${status === 'unreviewed' ? 'text-[#c6ab77]' : 'text-[#a9b89b]'}`}>
          {status === 'unreviewed' ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {VERIFICATION_LABEL[status]}</span>
        <button onClick={() => { store.likeSolution(solution.id); onChange() }} aria-label={`喜欢这份解法，当前 ${solution.likes} 次`}
          className="flex items-center gap-1 text-[11px] text-[#96958d] hover:text-[#d9998e]">
          <Heart className="h-4 w-4" /> {solution.likes}</button>
      </div>
    </div>
    <div className="mt-5"><Markdown content={solution.content} /><AttachmentList items={solution.attachments} /></div>
    {review && <p className="mt-4 text-[11px] text-[#96958d]">{review.reviewerName} 于 {fmt(review.checkedAt)} 完成 {review.checks.length} 项核查。</p>}
    <button onClick={() => setAuditOpen((current) => !current)} aria-expanded={auditOpen}
      className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-[#c7b58e] hover:text-[#e6d6b2]">
      <ListChecks className="h-4 w-4" />{auditOpen ? '收起证明审计' : `核查证明步骤${proofComments.length ? ` · ${proofComments.length} 条讨论` : ''}`}
    </button>
    {auditOpen && <div className="mt-5 border-t border-white/[0.07] pt-5">
      <p className="text-[12px] font-medium text-[#ded9cc]">逐步检查</p>
      <div className="mt-3 space-y-2.5">{PROOF_CHECKS.map((check) => <label key={check} className="flex items-start gap-2.5 text-[12px] leading-5 text-[#b5b1a5]">
        <input type="checkbox" checked={checkedItems.includes(check)} className="mt-[3px] accent-[#c7ad70]"
          onChange={(event) => setCheckedItems((current) => event.target.checked ? [...current, check] : current.filter((item) => item !== check))} />{check}
      </label>)}</div>
      {canModerate && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={isOwnSolution} onClick={() => verify('community_checked')}>记录社区核查</Button>
          <Button size="sm" variant="outline" disabled={isOwnSolution} onClick={() => verify('editor_checked')}>编辑复核</Button>
          <Button size="sm" disabled={isOwnSolution} onClick={() => verify('rigorous')}>确认严格证明</Button>
        </div>
      )}
      {proofComments.length > 0 && <div className="mt-5 space-y-3"><p className="text-[12px] font-medium text-[#ded9cc]">步骤疑点与讨论</p>
        {proofComments.map((comment) => <div key={comment.id} className="border-l border-[#c7ad70]/35 pl-3">
          <p className="text-[11px] text-[#96958d]">{comment.authorName} · {fmt(comment.createdAt)}</p>
          <p className="mt-1 text-[12px] leading-6 text-[#d0cabe]"><MathProse content={comment.content} /></p></div>)}</div>}
      <form onSubmit={submitConcern} className="mt-5"><Textarea value={concern} onChange={(event) => setConcern(event.target.value)} rows={3}
        placeholder={user ? '指出具体步骤、缺失条件或可能的反例…' : '登录后指出具体步骤或逻辑疑点'} className="text-[12px]" />
        <div className="mt-2 flex justify-end"><Button size="sm" type="submit" disabled={!concern.trim()}>记录步骤疑点</Button></div></form>
      {auditNotice && <p role="status" className="mt-3 text-[11px] leading-5 text-[#c2b18d]">{auditNotice}</p>}
    </div>}
  </div>
}

export function CommentThread({ targetId, comments, onPosted }: {
  targetId: string; comments: { id: string; authorName: string; content: string; createdAt: number }[]; onPosted: () => void
}) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [text, setText] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return nav('/login')
    if (!text.trim()) return
    store.addComment({ id: uid(), targetId, authorId: user.id, authorName: user.name, content: text.trim(), createdAt: Date.now() })
    setText('')
    onPosted()
  }
  return <div className="mt-5"><div className="space-y-5">
    {comments.map((comment) => <div key={comment.id} className="text-sm"><span className="font-medium text-[#ded9cc]">{comment.authorName}</span>
      <span className="ml-2 text-xs text-[#929188]">{fmt(comment.createdAt)}</span>
      <p className="mt-1.5 leading-7 text-[#bdb9ad]"><MathProse content={comment.content} /></p></div>)}
    {comments.length === 0 && <p className="text-[13px] text-[#96958d]">还没有讨论，可以从一个具体条件或疑问开始。</p>}
  </div><form onSubmit={submit} className="mt-6"><Textarea value={text} onChange={(event) => setText(event.target.value)} rows={3}
    placeholder={user ? '写下你的想法…' : '登录后参与讨论'} />
    <div className="mt-2 flex justify-end"><Button size="sm" type="submit" disabled={!text.trim()}>发表</Button></div></form></div>
}
