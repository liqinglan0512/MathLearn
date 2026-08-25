import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Heart, MessageSquare, PenLine } from 'lucide-react'
import { store, uid } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Markdown } from '@/components/Markdown'
import { AttachmentList } from '@/components/Attachments'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ProblemDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [, bump] = useState(0)
  const problem = store.problems().find((p) => p.id === id)

  if (!problem) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-400">题目不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => nav('/problems')}>
          返回题库
        </Button>
      </div>
    )
  }

  const solutions = store.solutions().filter((s) => s.problemId === problem.id)
  const comments = store.comments().filter((c) => c.targetId === problem.id)

  return (
    <div className="py-8">
      <button onClick={() => nav('/problems')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100">
        <ArrowLeft className="h-4 w-4" /> 返回题库
      </button>

      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline">{problem.chapter}</Badge>
          <Badge variant="outline">{problem.difficulty}</Badge>
          <span className="text-neutral-400">{problem.competition}</span>
          <span className="text-neutral-300">·</span>
          <span className="text-neutral-400">{fmt(problem.createdAt)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{problem.title}</h1>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <Markdown content={problem.statement} />
          <AttachmentList items={problem.attachments} />
        </div>
        {problem.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-neutral-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </article>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">社区解法 · {solutions.length}</h2>
          <Button size="sm" onClick={() => nav(user ? `/problems/${problem.id}/new-solution` : '/login')}>
            <PenLine className="mr-1 h-4 w-4" /> 提交我的解法
          </Button>
        </div>
        {solutions.length === 0 && (
          <p className="mt-6 rounded-lg border border-dashed border-white/10 py-10 text-center text-sm text-neutral-400">
            还没有解法 —— 来做第一个讲清楚这道题的人。
          </p>
        )}
        <div className="mt-4 space-y-4">
          {solutions.map((s, i) => (
            <SolutionCard key={s.id} index={i} solution={s} onLike={() => { store.likeSolution(s.id); bump((x) => x + 1) }} />
          ))}
        </div>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" /> 讨论区 · {comments.length}
        </h2>
        <CommentThread targetId={problem.id} comments={comments} onPosted={() => bump((x) => x + 1)} />
      </section>
    </div>
  )
}

function SolutionCard({
  index,
  solution,
  onLike,
}: {
  index: number
  solution: ReturnType<typeof store.solutions>[number]
  onLike: () => void
}) {
  return (
    <div className="rounded-lg border border-white/10 p-5 sm:p-6">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>
          解法 #{index + 1} · <span className="font-medium text-neutral-300">{solution.authorName}</span> · {fmt(solution.createdAt)}
        </span>
        <button onClick={onLike} className="flex items-center gap-1 text-neutral-400 transition-colors hover:text-red-400">
          <Heart className="h-4 w-4" /> {solution.likes}
        </button>
      </div>
      <div className="mt-3">
        <Markdown content={solution.content} />
        <AttachmentList items={solution.attachments} />
      </div>
    </div>
  )
}

export function CommentThread({
  targetId,
  comments,
  onPosted,
}: {
  targetId: string
  comments: { id: string; authorName: string; content: string; createdAt: number }[]
  onPosted: () => void
}) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return nav('/login')
    if (!text.trim()) return
    store.addComment({ id: uid(), targetId, authorId: user.id, authorName: user.name, content: text.trim(), createdAt: Date.now() })
    setText('')
    onPosted()
  }

  return (
    <div className="mt-4">
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <span className="font-medium">{c.authorName}</span>
            <span className="ml-2 text-xs text-neutral-400">{fmt(c.createdAt)}</span>
            <p className="mt-1 text-neutral-300">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-neutral-400">还没有讨论，说点什么吧。</p>}
      </div>
      <form onSubmit={submit} className="mt-6">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={user ? '写下你的想法…' : '登录后参与讨论'}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" type="submit" disabled={!text.trim()}>
            发表
          </Button>
        </div>
      </form>
    </div>
  )
}
