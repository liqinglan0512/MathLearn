import { lazy, useMemo, useState } from 'react'
import { ArrowRight, FlaskConical, GitBranch, PenLine, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { FEATURES } from '@/config/features'
import { useAuth } from '@/lib/auth-context'
import { listLearningUnits, type LearningField, type LearningLevel, type LearningUnit } from '@/lib/learning-units'
import { getKnowledgeNodes, getLabMeta } from '@/lib/learning'
import { store } from '@/lib/store'
import type { Article } from '@/lib/types'
import { MathProse } from '@/components/reading/MathProse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const EuclidCatalogBrowser = lazy(async () => {
  const module = await import('@/components/euclid/EuclidCatalogBrowser')
  return { default: module.EuclidCatalogBrowser }
})

const FIELD_LABELS: Record<LearningField, string> = {
  calculus: '微积分',
  'linear-algebra': '线性代数',
  'probability-statistics': '概率与统计',
  'differential-equations': '微分方程',
  'number-theory': '数论',
  'analytic-geometry': '解析几何',
}

const LEVEL_LABELS: Record<LearningLevel, string> = {
  foundation: '基础',
  intermediate: '进阶',
  advanced: '深入',
}

interface DirectoryItem {
  unit: LearningUnit
  article: Article
}

export default function Principles() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [field, setField] = useState<LearningField | ''>('')

  const items = useMemo(() => {
    const articles = new Map(store.articles().map((article) => [article.id, article]))
    const query = search.trim().toLocaleLowerCase()

    return listLearningUnits()
      .map((unit): DirectoryItem | null => {
        const article = articles.get(unit.articleId)
        return article ? { unit, article } : null
      })
      .filter((item): item is DirectoryItem => item !== null)
      .filter(({ unit }) => !field || unit.field === field)
      .filter(({ unit, article }) => {
        if (!query) return true
        const conceptLabels = getKnowledgeNodes([...unit.conceptIds, ...unit.prerequisiteConceptIds])
          .map((node) => node.label)
          .join(' ')
        return `${unit.title} ${article.title} ${article.summary} ${FIELD_LABELS[unit.field]} ${conceptLabels}`
          .toLocaleLowerCase()
          .includes(query)
      })
  }, [field, search])

  return (
    <div className="mx-auto max-w-5xl py-10 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#ad986a]">OPEN LEARNING CORE</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f0e8d3] sm:text-4xl">理解数学</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-[#a8a59a]">
            从问题与直觉出发，写清定义、条件和推导；再通过实验与练习，检查自己是否真的理解。
          </p>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#85867f]">
            当前条目均为 pilot 学习索引。它们复用现有正文，不等于已经完成独立数学审核或正式发布。
          </p>
        </div>
        {FEATURES.publicContribution && (
          <Button size="sm" variant="outline" onClick={() => navigate(user ? '/principles/new' : '/login')}>
            <PenLine className="mr-1 h-4 w-4" /> 提交推导审核
          </Button>
        )}
      </div>

      <section className="mt-12 grid gap-6 border-y border-white/[0.07] py-7 sm:grid-cols-3" aria-label="学习内容写作方法">
        {[
          { title: '直觉', description: '先回答：问题为什么出现，我们究竟想看见什么？' },
          { title: '严格', description: '写清定义、适用条件，以及每一次推出的依据。' },
          { title: '推广', description: '用反例检查边界，再追问结构可以走到哪里。' },
        ].map((level, index) => (
          <div key={level.title}>
            <p className="text-[11px] tabular-nums tracking-[0.18em] text-[#a38e60]">0{index + 1}</p>
            <h2 className="mt-2 text-sm font-medium text-[#e6e0d0]">{level.title}</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[#929187]">{level.description}</p>
          </div>
        ))}
      </section>

      <div className="relative mt-9">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#929187]" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)}
          aria-label="搜索学习单元" placeholder="搜索概念、前置知识或核心问题，例如“极限”“内积”……" className="h-11 pl-9" />
      </div>

      <section className="mt-7" aria-label="按数学领域筛选学习单元">
        <p className="mb-3 text-[11px] tracking-[0.17em] text-[#999488]">数学领域</p>
        <div className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-x-5">
          <button type="button" onClick={() => setField('')} aria-pressed={!field}
            className={`text-sm transition-colors ${field ? 'text-[#8f9087] hover:text-[#e3ddce]' : 'text-[#e7d6a7]'}`}>
            全部
          </button>
          {(Object.keys(FIELD_LABELS) as LearningField[]).map((item) => (
            <button key={item} type="button" onClick={() => setField(field === item ? '' : item)}
              aria-pressed={field === item}
              className={`text-sm transition-colors ${field === item ? 'text-[#e7d6a7]' : 'text-[#8f9087] hover:text-[#e3ddce]'}`}>
              {FIELD_LABELS[item]}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between border-b border-white/[0.065] pb-3">
        <p className="text-[11px] tracking-[0.15em] text-[#929187]">PILOT LEARNING UNITS · {items.length}</p>
      </div>

      <div className="divide-y divide-white/[0.065]">
        {items.map(({ unit, article }) => <LearningUnitRow key={unit.id} unit={unit} article={article} />)}
        {items.length === 0 && (
          <p className="py-16 text-center text-sm text-[#929187]">暂时没有符合当前筛选条件的学习单元。</p>
        )}
      </div>

      {FEATURES.euclidPublic && <EuclidCatalogBrowser />}
    </div>
  )
}

function LearningUnitRow({ unit, article }: { unit: LearningUnit; article: Article }) {
  const prerequisites = getKnowledgeNodes(unit.prerequisiteConceptIds)
  const lab = unit.visualizationIds.length > 0 ? getLabMeta(unit.visualizationIds[0]) : null

  return (
    <article className="group py-7 sm:py-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
        <span className="text-[#b59e6d]">{FIELD_LABELS[unit.field]}</span>
        <span>{LEVEL_LABELS[unit.level]}</span>
        <span className="rounded-sm bg-white/[0.035] px-1.5 py-0.5 text-[10px] text-[#8f9087]">pilot</span>
      </div>
      <Link to={`/principles/${article.id}`} className="mt-3 block">
        <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] transition-colors group-hover:text-[#f3e9cd] sm:text-xl">
          <MathProse content={article.title} />
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
        </h2>
        <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-[#a3a096]"><MathProse content={article.summary} /></p>
      </Link>

      {prerequisites.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#85867f]">
          <GitBranch className="h-3.5 w-3.5 text-[#a58e5e]" />
          <span>前置：</span>
          {prerequisites.map((node, index) => (
            <span key={node.id} className="inline-flex items-center gap-2">
              {index > 0 && <span className="text-[#5f605a]">·</span>}
              <MathProse content={node.label} />
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#83847d]">
          {unit.practiceIds.length > 0 ? `${unit.practiceIds.length} 道直接检验练习` : '当前暂无直接配套练习'}
          {' · '}
          {unit.nextConceptIds.length > 0 ? `${unit.nextConceptIds.length} 个后续概念` : '后续关系待完善'}
        </span>
        {lab && (
          <Link to={lab.href} className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]">
            <FlaskConical className="h-3.5 w-3.5" /> {lab.label}
          </Link>
        )}
      </div>
    </article>
  )
}
