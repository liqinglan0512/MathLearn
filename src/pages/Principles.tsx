import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookOpen, ExternalLink, FlaskConical, Layers3, LoaderCircle, PenLine, Search } from 'lucide-react'
import { euclidRepository, type EuclidBookIndex, type EuclidCatalog } from '@/lib/euclid-repository'
import { getArticleLearningProfile, getLabMeta } from '@/lib/learning'
import { store } from '@/lib/store'
import { CHAPTERS, type Article } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { MathProse } from '@/components/reading/MathProse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FEATURES } from '@/config/features'

type EuclidIndexEntry = EuclidBookIndex['entries'][number]
type ListItem =
  | { type: 'article'; article: Article }
  | { type: 'euclid'; entry: EuclidIndexEntry }

const PAGE_SIZE = 36
const EUCLID_COLLECTION = '《几何原本》'

const KIND_LABEL: Record<EuclidIndexEntry['kind'], string> = {
  proposition: '命题',
  definition: '定义',
  postulate: '公设',
  'common-notion': '公理',
}

export default function Principles() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [search, setSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<EuclidCatalog | null>(null)
  const [bookIndex, setBookIndex] = useState<EuclidBookIndex | null>(null)
  const [loadingBook, setLoadingBook] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  useEffect(() => {
    const controller = new AbortController()
    euclidRepository.loadCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(reason instanceof Error ? reason.message : '《几何原本》目录加载失败。')
        }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedBook === null) return

    const controller = new AbortController()
    euclidRepository.loadBookIndex(selectedBook, { signal: controller.signal })
      .then((index) => {
        setBookIndex(index)
        setLoadingBook(false)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setBookIndex(null)
          setLoadingBook(false)
          setLoadError(reason instanceof Error ? reason.message : `第 ${selectedBook} 卷索引加载失败。`)
        }
      })
    return () => controller.abort()
  }, [selectedBook])

  const items = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const ordinary = store.articles()
      .filter((article) => !topic || article.topic === topic)
      .filter((article) => !query || `${article.title} ${article.summary} ${article.topic} ${article.content.slice(0, 1200)}`
        .toLocaleLowerCase().includes(query))
      .map((article): ListItem => ({ type: 'article', article }))

    const showEuclid = !topic || topic === EUCLID_COLLECTION
    const euclid = showEuclid
      ? (bookIndex?.entries ?? [])
        .filter((entry) => !query || `${entry.title} ${entry.summary} 第${entry.book}卷 ${KIND_LABEL[entry.kind]} ${entry.number}`
          .toLocaleLowerCase().includes(query))
        .map((entry): ListItem => ({ type: 'euclid', entry }))
      : []

    return [...ordinary, ...euclid]
  }, [bookIndex, search, topic])

  const visibleItems = items.slice(0, limit)

  function chooseBook(book: number) {
    const next = selectedBook === book ? null : book
    setSelectedBook(next)
    setBookIndex(null)
    setLoadingBook(next !== null)
    setLoadError('')
    setLimit(PAGE_SIZE)
  }

  function chooseTopic(nextTopic: string) {
    setTopic(nextTopic)
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
        {FEATURES.publicContribution && (
          <Button size="sm" variant="outline" onClick={() => navigate(user ? '/principles/new' : '/login')}>
            <PenLine className="mr-1 h-4 w-4" /> 提交推导审核
          </Button>
        )}
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
          aria-label="搜索推导或当前卷册索引"
          placeholder="搜索普通推导或当前已打开卷册，例如「平行线」「勾股」……"
          className="h-11 pl-9"
        />
      </div>

      <section className="mt-7" aria-label="按学科筛选推导">
        <p className="mb-3 text-[11px] tracking-[0.17em] text-[#999488]">知识分类</p>
        <div className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-x-5">
          <button type="button" onClick={() => chooseTopic('')} aria-pressed={!topic}
            className={`text-sm transition-colors ${topic ? 'text-[#8f9087] hover:text-[#e3ddce]' : 'text-[#e7d6a7]'}`}>
            全部
          </button>
          {CHAPTERS.map((item) => (
            <button key={item} type="button" onClick={() => chooseTopic(topic === item ? '' : item)} aria-pressed={topic === item}
              className={`text-sm transition-colors ${topic === item ? 'text-[#e7d6a7]' : 'text-[#8f9087] hover:text-[#e3ddce]'}`}>
              {item}
            </button>
          ))}
          <button type="button" onClick={() => chooseTopic(topic === EUCLID_COLLECTION ? '' : EUCLID_COLLECTION)}
            aria-pressed={topic === EUCLID_COLLECTION}
            className={`text-sm transition-colors ${topic === EUCLID_COLLECTION ? 'text-[#e7d6a7]' : 'text-[#8f9087] hover:text-[#e3ddce]'}`}>
            {EUCLID_COLLECTION}
          </button>
        </div>
      </section>

      {(!topic || topic === EUCLID_COLLECTION) && (
        <section className="mt-8 rounded-md bg-[#171813]/80 p-4 ring-1 ring-white/[0.045] sm:p-5" aria-label="几何原本分卷目录">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-medium text-[#e6dfd0]">
                <BookOpen className="h-4 w-4 text-[#c7ad70]" /> 《几何原本》十三卷 · 实验性机器稿
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[#a5a196]">
                {catalog
                  ? `目录含 ${catalog.counts.entries} 条内容。这里只先载入卷册元数据；选择一卷后才下载该卷索引，打开条目后才下载正文。`
                  : '正在读取轻量目录；不会在首页或本页入口下载十三卷正文。'}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#c29a73]">
                现有中文均标为 raw_machine，不代表数学审核或正式出版。
              </p>
            </div>
            {catalog && (
              <a href={catalog.source.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#c1aa78] hover:text-[#ead6a8]">
                查看英文底本 <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(catalog?.books ?? []).map((book) => (
              <button key={book.book} type="button" onClick={() => chooseBook(book.book)} aria-pressed={selectedBook === book.book}
                className={`rounded-sm px-3 py-2.5 text-left transition-colors ${selectedBook === book.book
                  ? 'bg-[#c7ad70]/10 text-[#eadfca] ring-1 ring-[#c7ad70]/35'
                  : 'bg-white/[0.018] text-[#aaa79e] hover:bg-white/[0.04] hover:text-[#dfd8c8]'}`}>
                <span className="block text-xs font-medium">第 {book.roman} 卷 · {book.entries} 条</span>
                <span className="mt-1 block truncate text-[11px] opacity-70">{book.title}</span>
              </button>
            ))}
          </div>

          {loadingBook && (
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#aaa79e]" role="status">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> 正在按需载入第 {selectedBook} 卷索引…
            </p>
          )}
          {bookIndex && !loadingBook && (
            <p className="mt-4 text-xs text-[#aaa79e]" role="status">
              已载入第 {bookIndex.book.roman} 卷索引，共 {bookIndex.entries.length} 条；正文仍未下载。
            </p>
          )}
          {loadError && <p className="mt-4 text-xs leading-6 text-[#c98276]" role="alert">{loadError}</p>}
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-3">
        <p className="text-[11px] tracking-[0.15em] text-[#929187]">
          当前结果 {items.length} 篇 · 显示 {visibleItems.length} 篇
        </p>
        {selectedBook === null && (!topic || topic === EUCLID_COLLECTION) && (
          <span className="text-[11px] text-[#8d8b82]">选择卷册后显示原典条目</span>
        )}
      </div>

      <div className="divide-y divide-white/[0.065]">
        {visibleItems.map((item) => item.type === 'euclid'
          ? <EuclidRow key={item.entry.id} entry={item.entry} />
          : <ArticleRow key={item.article.id} article={item.article} />)}
        {visibleItems.length === 0 && !loadingBook && (
          <p className="py-16 text-center text-sm text-[#929187]">暂时没有符合当前筛选条件的内容。</p>
        )}
      </div>

      {visibleItems.length < items.length && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="rounded-md border border-[#c7ad70]/30 px-5 py-2.5 text-sm text-[#dbcaa4] transition-colors hover:border-[#c7ad70]/60 hover:text-[#f0e5ca]">
            继续显示 {Math.min(PAGE_SIZE, items.length - visibleItems.length)} 篇
          </button>
        </div>
      )}
    </div>
  )
}

function EuclidRow({ entry }: { entry: EuclidIndexEntry }) {
  return (
    <article className="group py-7 sm:py-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
        <span className="text-[#b59e6d]">《几何原本》</span>
        <span>第 {entry.book} 卷 · {KIND_LABEL[entry.kind]} {entry.number}</span>
        <span className="rounded-sm bg-[#c29a73]/10 px-1.5 py-0.5 text-[10px] text-[#c29a73]">raw_machine</span>
      </div>
      <Link to={`/principles/${entry.id}`} className="mt-3 block">
        <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] transition-colors group-hover:text-[#f3e9cd] sm:text-xl">
          <MathProse content={entry.title} />
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
        </h2>
        <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-[#a3a096]"><MathProse content={entry.summary} /></p>
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#83847d]">英文底本 · 机器辅助中文 · 分块引用</span>
        <Link to={`/principles/${entry.id}`} className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]">
          <Layers3 className="h-3.5 w-3.5" /> 打开单条正文与证明链
        </Link>
      </div>
    </article>
  )
}

function ArticleRow({ article }: { article: Article }) {
  const profile = getArticleLearningProfile(article)
  const lab = profile.labIds.length > 0 ? getLabMeta(profile.labIds[0]) : null
  return (
    <article className="group py-7 sm:py-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
        <span className="text-[#b59e6d]">{article.topic}</span>
        <span>直觉 · 严格 · 推广</span>
      </div>
      <Link to={`/principles/${article.id}`} className="mt-3 block">
        <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] transition-colors group-hover:text-[#f3e9cd] sm:text-xl">
          <MathProse content={article.title} />
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
        </h2>
        <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-[#a3a096]"><MathProse content={article.summary} /></p>
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#83847d]">{article.authorName} · {new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
        {lab && (
          <Link to={lab.href} className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]">
            <FlaskConical className="h-3.5 w-3.5" /> {lab.label}
          </Link>
        )}
      </div>
    </article>
  )
}
