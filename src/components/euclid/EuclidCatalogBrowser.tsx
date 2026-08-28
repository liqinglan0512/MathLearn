import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ExternalLink, Layers3, LoaderCircle, Search } from 'lucide-react'
import { Link } from 'react-router'
import { Input } from '@/components/ui/input'
import { MathProse } from '@/components/reading/MathProse'
import { euclidRepository, type EuclidBookIndex, type EuclidCatalog } from '@/lib/euclid-repository'

type EuclidIndexEntry = EuclidBookIndex['entries'][number]

const PAGE_SIZE = 36
const KIND_LABEL: Record<EuclidIndexEntry['kind'], string> = {
  proposition: '命题',
  definition: '定义',
  postulate: '公设',
  'common-notion': '公理',
}

interface EuclidCatalogBrowserProps {
  entryBasePath?: string
  internal?: boolean
}

export function EuclidCatalogBrowser({
  entryBasePath = '/principles',
  internal = false,
}: EuclidCatalogBrowserProps) {
  const [catalog, setCatalog] = useState<EuclidCatalog | null>(null)
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [bookIndex, setBookIndex] = useState<EuclidBookIndex | null>(null)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [loadingBook, setLoadingBook] = useState(false)
  const [loadError, setLoadError] = useState('')

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

  const entries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return (bookIndex?.entries ?? []).filter((entry) => !query ||
      `${entry.title} ${entry.summary} 第${entry.book}卷 ${KIND_LABEL[entry.kind]} ${entry.number}`
        .toLocaleLowerCase().includes(query))
  }, [bookIndex, search])

  const visibleEntries = entries.slice(0, limit)

  function chooseBook(book: number) {
    const next = selectedBook === book ? null : book
    setSelectedBook(next)
    setBookIndex(null)
    setLoadingBook(next !== null)
    setLoadError('')
    setLimit(PAGE_SIZE)
  }

  return (
    <section className="mt-8" aria-label="几何原本归档目录">
      <div className="border-y border-white/[0.07] py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-medium text-[#e6dfd0]">
              <BookOpen className="h-4 w-4 text-[#c7ad70]" /> 《几何原本》十三卷 · 实验归档
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[#a5a196]">
              {catalog
                ? `保留 ${catalog.counts.entries} 条机器稿及其版本、语义块、依赖关系和来源问题；选择卷册后才按需读取索引。`
                : '正在读取轻量目录；条目正文仍保持按需加载。'}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#c29a73]">
              {internal
                ? '仅供本地开发审计；raw_machine 不代表数学审核或公开课程。'
                : '本实验不属于当前公开学习核心；现有机器稿不代表数学审核。'}
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
            <button key={book.book} type="button" onClick={() => chooseBook(book.book)}
              aria-pressed={selectedBook === book.book}
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
      </div>

      {bookIndex && (
        <>
          <div className="relative mt-7">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#929187]" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE) }}
              aria-label="搜索当前卷册索引" placeholder="搜索当前卷册，例如“平行线”“勾股”……" className="h-11 pl-9" />
          </div>
          <div className="mt-7 flex items-center justify-between border-b border-white/[0.065] pb-3">
            <p className="text-[11px] tracking-[0.15em] text-[#929187]">
              当前结果 {entries.length} 条 · 显示 {visibleEntries.length} 条
            </p>
          </div>
          <div className="divide-y divide-white/[0.065]">
            {visibleEntries.map((entry) => (
              <article key={entry.id} className="group py-7 sm:py-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
                  <span className="text-[#b59e6d]">第 {entry.book} 卷 · {KIND_LABEL[entry.kind]} {entry.number}</span>
                  <span className="rounded-sm bg-[#c29a73]/10 px-1.5 py-0.5 text-[10px] text-[#c29a73]">raw_machine</span>
                </div>
                <Link to={`${entryBasePath}/${entry.id}`} className="mt-3 block">
                  <h3 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] group-hover:text-[#f3e9cd] sm:text-xl">
                    <MathProse content={entry.title} />
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
                  </h3>
                  <p className="mt-2 max-w-[48rem] text-[14px] leading-7 text-[#a3a096]"><MathProse content={entry.summary} /></p>
                </Link>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#83847d]">
                  <Layers3 className="h-3.5 w-3.5" /> 英文底本 · 机器辅助中文 · 稳定语义块
                </p>
              </article>
            ))}
          </div>
          {visibleEntries.length < entries.length && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => setLimit((current) => current + PAGE_SIZE)}
                className="rounded-md border border-[#c7ad70]/30 px-5 py-2.5 text-sm text-[#dbcaa4] hover:border-[#c7ad70]/60">
                继续显示 {Math.min(PAGE_SIZE, entries.length - visibleEntries.length)} 条
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
