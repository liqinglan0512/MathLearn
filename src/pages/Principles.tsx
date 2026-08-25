import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookOpen, ExternalLink, FlaskConical, Layers3, PenLine, Search } from 'lucide-react'
import { EUCLID_SOURCE } from '@/lib/euclid'
import { getArticleLearningProfile, getLabMeta } from '@/lib/learning'
import { store } from '@/lib/store'
import { CHAPTERS } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { MathProse } from '@/components/reading/MathProse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EuclidKind = 'proposition' | 'definition' | 'postulate' | 'common-notion'

interface EuclidEntryMeta {
  book: number
  number: number
  kind: EuclidKind
}

const ROMAN_BOOKS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII']
const PAGE_SIZE = 36

const KIND_FILTERS: { value: EuclidKind | 'all'; label: string }[] = [
  { value: 'all', label: '全部条目' },
  { value: 'proposition', label: '命题' },
  { value: 'definition', label: '定义' },
  { value: 'postulate', label: '公设' },
  { value: 'common-notion', label: '公理' },
]

function getEuclidEntryMeta(id: string): EuclidEntryMeta | null {
  const match = /^euclid-(\d+)-(?:((?:def|post|cn))-)?(\d+)$/.exec(id)
  if (!match) return null
  const [, book, marker, number] = match
  const kind: EuclidKind = marker === 'def'
    ? 'definition'
    : marker === 'post'
      ? 'postulate'
      : marker === 'cn'
        ? 'common-notion'
        : 'proposition'

  return { book: Number(book), number: Number(number), kind }
}

function euclidKindLabel(kind: EuclidKind): string {
  return KIND_FILTERS.find((option) => option.value === kind)?.label ?? '原典'
}

export default function Principles() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [topic, setTopic] = useState('')
  const [search, setSearch] = useState('')
  const [book, setBook] = useState('all')
  const [kind, setKind] = useState<EuclidKind | 'all'>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const articles = store.articles()
  const indexedArticles = articles.map((article) => ({ article, euclid: getEuclidEntryMeta(article.id) }))
  const euclidEntries = indexedArticles.filter((item) => item.euclid !== null)
  const propositionCount = euclidEntries.filter((item) => item.euclid?.kind === 'proposition').length
  const query = search.trim().toLocaleLowerCase()

  const filtered = indexedArticles.filter(({ article, euclid }) => {
    if (topic && article.topic !== topic) return false
    if (book !== 'all' && euclid?.book !== Number(book)) return false
    if (kind !== 'all' && euclid?.kind !== kind) return false
    if (!query) return true

    const originalLocation = euclid
      ? `几何原本 第${euclid.book}卷 第${ROMAN_BOOKS[euclid.book - 1]}卷 ${euclidKindLabel(euclid.kind)}${euclid.number}`
      : ''
    return `${article.title} ${article.summary} ${article.topic} ${originalLocation} ${article.content.slice(0, 1200)}`
      .toLocaleLowerCase().includes(query)
  })
  const visibleArticles = filtered.slice(0, limit)
  const showEuclidFilters = euclidEntries.length > 0 && (!topic || topic === '解析几何')

  function changeTopic(nextTopic: string) {
    setTopic(nextTopic)
    setLimit(PAGE_SIZE)
    if (nextTopic && nextTopic !== '解析几何') {
      setBook('all')
      setKind('all')
    }
  }

  function changeBook(nextBook: string) {
    setBook(nextBook)
    setLimit(PAGE_SIZE)
  }

  return (
    <div className="mx-auto max-w-5xl py-10 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#ad986a]">从最初的问题开始</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f0e8d3] sm:text-4xl">第一性原理</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-8 text-[#a8a59a]">
            不从结论出发。先弄明白问题为什么出现，再让定义、条件和证明一步步长出来。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => nav(user ? '/principles/new' : '/login')}>
          <PenLine className="mr-1 h-4 w-4" /> 写推导
        </Button>
      </div>

      <section className="mt-12 grid gap-6 border-y border-white/[0.07] py-7 sm:grid-cols-3" aria-label="阅读方法">
        {[
          { title: '直觉', description: '先回答：我们究竟想解决什么？' },
          { title: '严格', description: '写清定义、假设和每一次推出。' },
          { title: '推广', description: '追问条件改变后还剩下什么。' },
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
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE) }}
          aria-label="搜索推导、定义和几何原本命题"
          placeholder="搜索标题、命题、定义或证明，例如「平行线」「勾股」「公设」……"
          className="h-11 pl-9"
        />
      </div>

      <section className="mt-7" aria-label="按学科筛选推导">
        <p className="mb-3 text-[11px] tracking-[0.17em] text-[#999488]">知识分类</p>
        <div className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-x-5">
          <button
            type="button"
            onClick={() => changeTopic('')}
            aria-pressed={!topic}
            className={`text-sm transition-colors ${topic ? 'text-[#8f9087] hover:text-[#e3ddce]' : 'text-[#e7d6a7]'}`}
          >
            全部
          </button>
          {CHAPTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeTopic(topic === item ? '' : item)}
              aria-pressed={topic === item}
              className={`text-sm transition-colors ${
                topic === item ? 'text-[#e7d6a7]' : 'text-[#8f9087] hover:text-[#e3ddce]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {showEuclidFilters && (
        <section className="mt-8 rounded-md bg-[#171813]/80 p-4 ring-1 ring-white/[0.045] sm:p-5" aria-label="几何原本原典索引">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#e6dfd0]">
                <BookOpen className="h-4 w-4 text-[#c7ad70]" /> 《几何原本》十三卷
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#a5a196]">
                按原文独立拆分 {euclidEntries.length} 篇，其中 {propositionCount} 条命题；定义、公设与公理均可单独阅读。
              </p>
            </div>
            <a
              href={EUCLID_SOURCE.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#c1aa78] hover:text-[#ead6a8]"
            >
              查看原始文献 <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="按卷册筛选">
            <IndexChip active={book === 'all'} onClick={() => changeBook('all')}>全部内容</IndexChip>
            {ROMAN_BOOKS.map((roman, index) => (
              <IndexChip key={roman} active={book === String(index + 1)} onClick={() => changeBook(String(index + 1))}>
                {`第 ${roman} 卷`}
              </IndexChip>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="按原典条目类型筛选">
            {KIND_FILTERS.map((option) => (
              <IndexChip
                key={option.value}
                active={kind === option.value}
                onClick={() => { setKind(option.value); setLimit(PAGE_SIZE) }}
              >
                {option.label}
              </IndexChip>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-6 text-[#929187]">
            来源：{EUCLID_SOURCE.translator} 译本（{EUCLID_SOURCE.year}），{EUCLID_SOURCE.publisher}；
            依照{' '}
            <a href={EUCLID_SOURCE.licenseUrl} target="_blank" rel="noreferrer" className="text-[#bda77b] hover:text-[#ead6a8]">
              {EUCLID_SOURCE.license}
            </a>
            {' '}标注。
          </p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-3">
        <p className="text-[11px] tracking-[0.15em] text-[#929187]">
          共 {filtered.length} 篇 · 当前显示 {visibleArticles.length} 篇
        </p>
        {filtered.length > PAGE_SIZE && <span className="text-[11px] text-[#8d8b82]">按需加载，保留完整十三卷</span>}
      </div>

      <div className="divide-y divide-white/[0.065]">
        {visibleArticles.map(({ article, euclid }) => {
          const profile = euclid ? null : getArticleLearningProfile(article)
          const lab = profile && profile.labIds.length > 0 ? getLabMeta(profile.labIds[0]) : null

          return (
            <article key={article.id} className="group py-7 sm:py-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
                <span className="text-[#b59e6d]">{article.topic}</span>
                {euclid ? (
                  <span>第 {euclid.book} 卷 · {euclidKindLabel(euclid.kind)} {euclid.number}</span>
                ) : (
                  <span>直觉 · 严格 · 推广</span>
                )}
              </div>
              <Link to={`/principles/${article.id}`} className="mt-3 block">
                <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] transition-colors group-hover:text-[#f3e9cd] sm:text-xl">
                  <MathProse content={article.title} />
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
                </h2>
                <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-[#a3a096]">
                  <MathProse content={article.summary} />
                </p>
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#83847d]">
                  {article.authorName} · {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                </span>
                {euclid ? (
                  <Link
                    to={`/principles/${article.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]"
                  >
                    <Layers3 className="h-3.5 w-3.5" /> 几何作图与证明互引
                  </Link>
                ) : lab && (
                  <Link to={lab.href} className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]">
                    <FlaskConical className="h-3.5 w-3.5" /> {lab.label}
                  </Link>
                )}
              </div>
            </article>
          )
        })}
        {visibleArticles.length === 0 && (
          <p className="py-16 text-center text-sm text-[#929187]">暂时没有符合当前分类、卷册和关键词的推导文章。</p>
        )}
      </div>

      {visibleArticles.length < filtered.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="rounded-md border border-[#c7ad70]/30 px-5 py-2.5 text-sm text-[#dbcaa4] transition-colors hover:border-[#c7ad70]/60 hover:text-[#f0e5ca]"
          >
            继续显示 {Math.min(PAGE_SIZE, filtered.length - visibleArticles.length)} 篇
          </button>
        </div>
      )}
    </div>
  )
}

function IndexChip({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? 'border-[#c7ad70]/40 bg-[#c7ad70]/10 text-[#e6d6b1]'
          : 'border-white/[0.09] text-[#a29f96] hover:border-white/20 hover:text-[#ded8ca]'
      }`}
    >
      {children}
    </button>
  )
}
