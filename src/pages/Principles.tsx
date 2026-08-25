import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, FlaskConical, PenLine } from 'lucide-react'
import { getArticleLearningProfile, getLabMeta } from '@/lib/learning'
import { store } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default function Principles() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [topic, setTopic] = useState('')
  const articles = store.articles()
  const topics = [...new Set(articles.map((article) => article.topic))]
  const visibleArticles = topic ? articles.filter((article) => article.topic === topic) : articles

  return (
    <div className="mx-auto max-w-4xl py-10 sm:py-16">
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

      <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3" aria-label="按学科筛选推导">
        <button
          type="button"
          onClick={() => setTopic('')}
          className={`text-sm transition-colors ${topic ? 'text-[#8f9087] hover:text-[#e3ddce]' : 'text-[#e7d6a7]'}`}
        >
          全部
        </button>
        {topics.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTopic(topic === item ? '' : item)}
            className={`text-sm transition-colors ${
              topic === item ? 'text-[#e7d6a7]' : 'text-[#8f9087] hover:text-[#e3ddce]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-7 divide-y divide-white/[0.065] border-t border-white/[0.065]">
        {visibleArticles.map((article) => {
          const profile = getArticleLearningProfile(article)
          const lab = profile.labIds.length > 0 ? getLabMeta(profile.labIds[0]) : null

          return (
            <article key={article.id} className="group py-7 sm:py-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#929187]">
                <span className="text-[#b59e6d]">{article.topic}</span>
                <span>直觉 · 严格 · 推广</span>
              </div>
              <Link to={`/principles/${article.id}`} className="mt-3 block">
                <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7] transition-colors group-hover:text-[#f3e9cd] sm:text-xl">
                  {article.title}
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
                </h2>
                <p className="mt-2 max-w-[44rem] text-[14px] leading-7 text-[#a3a096]">{article.summary}</p>
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#83847d]">
                  {article.authorName} · {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                </span>
                {lab && (
                  <Link to={lab.href} className="inline-flex items-center gap-1.5 text-xs text-[#baa474] hover:text-[#e7d6a7]">
                    <FlaskConical className="h-3.5 w-3.5" /> {lab.label}
                  </Link>
                )}
              </div>
            </article>
          )
        })}
        {visibleArticles.length === 0 && <p className="py-16 text-center text-sm text-[#929187]">暂时没有对应的推导文章。</p>}
      </div>
    </div>
  )
}
