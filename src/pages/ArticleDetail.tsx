import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FlaskConical,
  Maximize2,
  Minimize2,
  Moon,
  ShieldAlert,
  Sun,
} from 'lucide-react'
import { getArticleLearningProfile, getKnowledgeNodes, getLabMeta } from '@/lib/learning'
import { store } from '@/lib/store'
import { Markdown } from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommentThread } from './ProblemDetail'

type ReaderLevel = 'intuition' | 'rigorous' | 'extension'
type ReaderTheme = 'dark' | 'paper'

const READER_LEVELS: { id: ReaderLevel; title: string; subtitle: string }[] = [
  { id: 'intuition', title: '直觉层', subtitle: '这个问题为什么出现' },
  { id: 'rigorous', title: '严格层', subtitle: '定义、条件与推导' },
  { id: 'extension', title: '推广层', subtitle: '结构可以走到哪里' },
]

function initialReaderTheme(): ReaderTheme {
  try {
    return localStorage.getItem('mf_reader_theme') === 'paper' ? 'paper' : 'dark'
  } catch {
    return 'dark'
  }
}

function estimateReadingMinutes(content: string) {
  const readableCharacters = content.replace(/[$#*`\\]/g, '').length
  return Math.max(4, Math.ceil(readableCharacters / 420))
}

export default function ArticleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [, bump] = useState(0)
  const [level, setLevel] = useState<ReaderLevel>('intuition')
  const [theme, setTheme] = useState<ReaderTheme>(initialReaderTheme)
  const [immersive, setImmersive] = useState(false)
  const article = store.articles().find((item) => item.id === id)

  useEffect(() => {
    if (!immersive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImmersive(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [immersive])

  if (!article) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-400">文章不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => nav('/principles')}>
          返回列表
        </Button>
      </div>
    )
  }

  const profile = getArticleLearningProfile(article)
  const knowledgeNodes = getKnowledgeNodes(profile.knowledgeIds)
  const relatedProblems = store.problems().filter((problem) => profile.problemIds.includes(problem.id))
  const relatedLabs = profile.labIds.map((labId) => getLabMeta(labId))
  const comments = store.comments().filter((comment) => comment.targetId === article.id)
  const paperMode = theme === 'paper'
  const routes = article.content
    .split('\n')
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, '').replace(/^\d+[.、]\s*/, ''))
    .slice(0, 5)

  function toggleTheme() {
    const nextTheme: ReaderTheme = paperMode ? 'dark' : 'paper'
    setTheme(nextTheme)
    try {
      localStorage.setItem('mf_reader_theme', nextTheme)
    } catch {
      // 阅读偏好不能持久化时，仍然保留当前页面的切换能力。
    }
  }

  return (
    <div
      className={`${immersive ? 'fixed inset-0 z-50 overflow-y-auto' : '-mx-4 min-h-screen'} ${
        paperMode ? 'math-reader-paper bg-[#f5f1e8] text-[#35342e]' : 'bg-[#10110f] text-[#e7e3d8]'
      }`}
    >
      <article className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => nav('/principles')}
            className="inline-flex items-center gap-1.5 text-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <ArrowLeft className="h-4 w-4" /> 第一性原理
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={paperMode ? '切换深色阅读' : '切换纸张阅读'}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs opacity-70 transition-opacity hover:opacity-100"
            >
              {paperMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {paperMode ? '深色' : '纸张'}
            </button>
            <button
              type="button"
              onClick={() => setImmersive((current) => !current)}
              aria-pressed={immersive}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs opacity-70 transition-opacity hover:opacity-100"
            >
              {immersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {immersive ? '退出沉浸' : '沉浸阅读'}
            </button>
          </div>
        </div>

        <header className="pt-14 sm:pt-20">
          <div className="flex flex-wrap items-center gap-3 text-xs tracking-wide opacity-75">
            <Badge variant="outline" className="border-current/20 text-current">
              {article.topic}
            </Badge>
            <span>约 {estimateReadingMinutes(article.content)} 分钟阅读</span>
          </div>
          <h1 className="mt-6 text-[2rem] font-semibold leading-[1.3] tracking-tight sm:text-[2.75rem]">
            {article.title}
          </h1>
          <p className="mt-5 text-sm opacity-70">
            {article.authorName} · {new Date(article.createdAt).toLocaleDateString('zh-CN')}
          </p>

          <div className="mt-11 border-l border-[#c7ad70]/60 pl-5 sm:pl-7">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a99361]">问题从哪里来</p>
            <p className="mt-3 text-lg leading-8 sm:text-xl">{profile.framingQuestion}</p>
          </div>
        </header>

        <section className="mt-12" aria-label="抽象层级">
          <div className="grid grid-cols-3 border-b border-current/10">
            {READER_LEVELS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={level === option.id}
                onClick={() => setLevel(option.id)}
                className={`border-b px-1 pb-3 text-left transition-colors sm:px-2 ${
                  level === option.id ? 'border-[#c7ad70] opacity-100' : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-1 hidden text-[11px] sm:block">{option.subtitle}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-[15px] leading-8 opacity-85">{profile.abstraction[level]}</p>
        </section>

        {knowledgeNodes.length > 0 && (
          <section className="mt-10" aria-label="阅读前置知识">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">从这些基础出发</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {knowledgeNodes.map((node) => (
                <span key={node.id} className="inline-flex items-center gap-1.5 text-sm opacity-80">
                  <Check className="h-3.5 w-3.5 text-[#b8a06a]" /> {node.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {routes.length > 1 && (
          <div className="mt-9 flex flex-wrap items-center gap-2 text-xs opacity-65" aria-label="推导路线">
            {routes.map((route, index) => (
              <span key={route} className="inline-flex items-center gap-2">
                {index > 0 && <ArrowRight className="h-3 w-3 text-[#b8a06a]" />}
                <span>{route}</span>
              </span>
            ))}
          </div>
        )}

        <div className="math-reader-body mt-14 border-t border-current/10 pt-7 sm:mt-16 sm:pt-10">
          <Markdown content={article.content} />
        </div>

        {profile.conditionChecks.length > 0 && (
          <section className="mt-14 border-l border-[#c7ad70]/55 pl-5 sm:pl-7" aria-label="条件核对">
            <h2 className="inline-flex items-center gap-2 text-base font-medium">
              <ShieldAlert className="h-4 w-4 text-[#b8a06a]" /> 哪些条件不能偷偷省略
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-7 opacity-85">
              {profile.conditionChecks.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
            {profile.counterexample && (
              <p className="mt-5 text-sm leading-7 opacity-80">
                <span className="font-medium text-[#ab9360]">条件拿掉之后：</span>
                {profile.counterexample}
              </p>
            )}
          </section>
        )}

        {(relatedLabs.length > 0 || relatedProblems.length > 0) && (
          <section className="mt-16 border-t border-current/10 pt-9" aria-label="继续完成学习闭环">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">把理解带回现实问题</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {relatedLabs.slice(0, 2).map((lab) => (
                <Link
                  key={lab.id}
                  to={lab.href}
                  className="group flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-current/[0.04]"
                >
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-[#b8a06a]" />
                  <span>
                    <span className="block text-sm font-medium">{lab.label}</span>
                    <span className="mt-1 block text-xs leading-6 opacity-70">去实验室亲手改变参数</span>
                  </span>
                </Link>
              ))}
              {relatedProblems.slice(0, 2).map((problem) => (
                <Link
                  key={problem.id}
                  to={`/problems/${problem.id}`}
                  className="group flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-current/[0.04]"
                >
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#b8a06a]" />
                  <span>
                    <span className="block text-sm font-medium">{problem.title}</span>
                    <span className="mt-1 block text-xs leading-6 opacity-70">回到题目，检验真正的理解</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16 border-t border-current/10 pt-9">
          <h2 className="text-base font-medium">讨论 · {comments.length}</h2>
          <CommentThread targetId={article.id} comments={comments} onPosted={() => bump((current) => current + 1)} />
        </section>
      </article>
    </div>
  )
}
