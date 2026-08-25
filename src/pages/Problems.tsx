import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, BookOpen, GitBranch, Plus, Search, ShieldAlert } from 'lucide-react'
import { store } from '@/lib/store'
import {
  diagnoseKnowledgeGaps,
  getKnowledgeNode,
  getKnowledgeNodes,
  getLearningSnapshot,
  getProblemLearningProfile,
} from '@/lib/learning'
import { CHAPTERS, COMPETITIONS, DIFFICULTIES } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { MathProse } from '@/components/reading/MathProse'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const DIFF_STYLE: Record<string, string> = {
  入门: 'border-[#9bbba1]/20 bg-[#9bbba1]/[0.07] text-[#afc3ae]',
  基础: 'border-[#aab7bd]/20 bg-[#aab7bd]/[0.07] text-[#bec8c8]',
  提高: 'border-[#c7ad70]/25 bg-[#c7ad70]/[0.08] text-[#d2bc8d]',
  冲刺: 'border-[#d4a681]/20 bg-[#d4a681]/[0.07] text-[#ddb696]',
  决赛: 'border-[#c99289]/20 bg-[#c99289]/[0.07] text-[#d4a49c]',
}

export default function Problems() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [chapter, setChapter] = useState(params.get('chapter') ?? '')
  const [difficulty, setDifficulty] = useState('')
  const [competition, setCompetition] = useState('')
  const [knowledgeFilter, setKnowledgeFilter] = useState(params.get('knowledge') ?? '')

  const problems = store.problems()
  const solutions = store.solutions()
  const snapshot = getLearningSnapshot()
  const gaps = diagnoseKnowledgeGaps()
  const keyword = query.trim().toLowerCase()
  const filtered = problems.filter((problem) => {
    const profile = getProblemLearningProfile(problem)
    if (chapter && problem.chapter !== chapter) return false
    if (difficulty && problem.difficulty !== difficulty) return false
    if (competition && problem.competition !== competition) return false
    if (knowledgeFilter && !profile.prerequisiteIds.includes(knowledgeFilter)) return false
    if (!keyword) return true
    const knowledgeLabels = getKnowledgeNodes(profile.prerequisiteIds).map((node) => node.label).join(' ')
    return `${problem.title} ${problem.statement} ${problem.tags.join(' ')} ${profile.summary} ${knowledgeLabels}`
      .toLowerCase().includes(keyword)
  })

  return (
    <div className="py-9 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.24em] text-[#b29b69]">PROBLEM ARCHIVE</p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.045em] text-[#f0e8d3]">从一道题开始</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#96958d]">看见题目背后的前置知识，再沿着推导找到缺失的那一步。</p>
        </div>
        <Button size="sm" onClick={() => nav(user ? '/problems/new' : '/login')}>
          <Plus className="mr-1 h-4 w-4" /> 上传题目
        </Button>
      </div>

      <KnowledgeSnapshot onChooseKnowledge={setKnowledgeFilter} />

      <div className="mt-9 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#929188]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索题目、前置知识或核心思想，如「Stolz」「内积」「停时」…" className="h-11 pl-9" />
        </div>
        <FilterRow label="章节" options={CHAPTERS} value={chapter} onChange={setChapter} />
        <FilterRow label="难度" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
        <FilterRow label="竞赛" options={COMPETITIONS} value={competition} onChange={setCompetition} />
        {knowledgeFilter && <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-xs text-[#96958d]">知识</span>
          <button onClick={() => setKnowledgeFilter('')} className="rounded-full border border-[#c7ad70]/30 px-3 py-1 text-xs text-[#d8c79e]">
            <MathProse content={getKnowledgeNode(knowledgeFilter)?.label ?? knowledgeFilter} /> ×</button>
        </div>}
      </div>

      <div className="mt-10 flex items-center justify-between border-b border-white/[0.07] pb-3">
        <p className="text-[11px] tracking-[0.14em] text-[#929188]">PROBLEMS · {filtered.length}</p>
        {snapshot.totalAttempts > 0 && <p className="text-[11px] text-[#929188]">已练习 {snapshot.practicedProblemIds.length} 道</p>}
      </div>

      <div className="divide-y divide-white/[0.055]">
        {filtered.map((problem) => {
          const profile = getProblemLearningProfile(problem)
          const prerequisiteNodes = getKnowledgeNodes(profile.prerequisiteIds)
          const relatedGap = gaps.find((gap) => gap.confidence === 'repeated' && profile.prerequisiteIds.includes(gap.node.id))
          const solutionCount = solutions.filter((solution) => solution.problemId === problem.id).length

          return <Link key={problem.id} to={`/problems/${problem.id}`} className="group block py-6 transition-colors hover:bg-white/[0.018] sm:py-7">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-medium leading-snug tracking-[-0.02em] text-[#e8e1d1] group-hover:text-[#f2ead7]">
                    <MathProse content={problem.title} /></h2>
                  {relatedGap && <span className="inline-flex items-center gap-1 text-[10px] text-[#d5b888]">
                    <ShieldAlert className="h-3 w-3" /> 共同薄弱环节</span>}
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#aaa79d]"><MathProse content={profile.summary} /></p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline" className="border-white/[0.09] text-[#b8b4a8]">{problem.chapter}</Badge>
                  <Badge variant="outline" className={DIFF_STYLE[problem.difficulty]}>{problem.difficulty}</Badge>
                  <span className="text-[#929188]">{problem.competition}</span>
                </div>
                {prerequisiteNodes.length > 0 && <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#929188]">
                  <GitBranch className="h-3.5 w-3.5 text-[#a58e5e]" />
                  {prerequisiteNodes.slice(0, 3).map((node, index) => <span key={node.id} className="inline-flex items-center gap-2">
                    {index > 0 && <span className="text-[#65645e]">→</span>}<MathProse content={node.label} /></span>)}
                  {prerequisiteNodes.length > 3 && <span className="text-[#77766f]">+{prerequisiteNodes.length - 3}</span>}
                </div>}
              </div>
              <div className="hidden shrink-0 items-center gap-1.5 pt-1 text-[11px] text-[#929188] sm:flex">
                {solutionCount} 解法 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></div>
            </div>
          </Link>
        })}
        {filtered.length === 0 && <p className="py-16 text-center text-sm text-[#96958d]">没有符合条件的题目，可以换一个关键词或知识点。</p>}
      </div>
    </div>
  )
}

function KnowledgeSnapshot({ onChooseKnowledge }: { onChooseKnowledge: (id: string) => void }) {
  const snapshot = getLearningSnapshot()
  const gaps = diagnoseKnowledgeGaps().filter((gap) => gap.confidence === 'repeated')
  const markedCount = Object.keys(snapshot.statusByKnowledge).length

  return <section className="mt-8 rounded-[5px] bg-[#171813]/80 px-5 py-5 ring-1 ring-white/[0.045] sm:px-6"
    aria-label="个人知识图谱">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2">
      <BookOpen className="h-4 w-4 text-[#c7ad70]" />
      <h2 className="text-[13px] font-medium text-[#e4ddcc]">我的知识图谱</h2></div>
      <span className="text-[10px] text-[#929188]">只依据本机真实练习与自主标记</span></div>

    {snapshot.totalAttempts === 0 && markedCount === 0 ? (
      <p className="mt-3 text-[12px] leading-6 text-[#96958d]">还没有学习记录。打开一道题，标记卡点或知识状态之后，才会显示你的个人知识路径。</p>
    ) : <><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <SnapshotMetric label="已掌握" value={snapshot.masteredCount} color="text-[#a9b89b]" />
      <SnapshotMetric label="需要补强" value={snapshot.weakCount} color="text-[#d5a399]" />
      <SnapshotMetric label="学习中" value={snapshot.learningCount} color="text-[#d1c094]" />
      <SnapshotMetric label="待复习" value={snapshot.reviewCount} color="text-[#c7ad70]" />
    </div>{gaps.length > 0 && <div className="mt-5 border-t border-white/[0.055] pt-4">
      <p className="text-[11px] text-[#bdb7aa]">以下前置知识出现在多道你标记卡住的题中，建议优先核对：</p>
      <div className="mt-2 flex flex-wrap gap-2">{gaps.slice(0, 4).map((gap) => <button key={gap.node.id}
        onClick={() => onChooseKnowledge(gap.node.id)} className="rounded-full border border-[#c7ad70]/25 px-2.5 py-1 text-[11px] text-[#d2bf95]">
        <MathProse content={gap.node.label} /> · {gap.problemIds.length} 题</button>)}</div>
    </div>}</>}
  </section>
}

function SnapshotMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><p className={`text-[19px] font-medium ${color}`}>{value}</p><p className="mt-1 text-[11px] text-[#929188]">{label}</p></div>
}

function FilterRow({ label, options, value, onChange }: {
  label: string; options: readonly string[]; value: string; onChange: (value: string) => void
}) {
  return <div className="flex items-start gap-3"><span className="mt-1.5 w-10 shrink-0 text-xs text-[#96958d]">{label}</span>
    <div className="flex flex-wrap gap-1.5"><FilterChip active={!value} onClick={() => onChange('')}>全部</FilterChip>
      {options.map((option) => <FilterChip key={option} active={value === option}
        onClick={() => onChange(value === option ? '' : option)}>{option}</FilterChip>)}</div></div>
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs transition-colors ${active
    ? 'border-[#c7ad70]/35 bg-[#c7ad70]/[0.08] text-[#e0d0ae]'
    : 'border-white/[0.08] text-[#96958d] hover:border-white/20 hover:text-[#ded9cc]'}`}>{children}</button>
}
