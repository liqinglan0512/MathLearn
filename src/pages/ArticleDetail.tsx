import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { store } from '@/lib/store'
import { Markdown } from '@/components/Markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CommentThread } from './ProblemDetail'

export default function ArticleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [, bump] = useState(0)
  const article = store.articles().find((a) => a.id === id)

  if (!article) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-500">文章不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => nav('/principles')}>返回列表</Button>
      </div>
    )
  }

  const comments = store.comments().filter((c) => c.targetId === article.id)

  return (
    <div className="mx-auto max-w-3xl py-8">
      <button onClick={() => nav('/principles')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> 第一性原理
      </button>
      <div className="mt-6">
        <Badge variant="outline" className="text-xs">{article.topic}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{article.title}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {article.authorName} · {new Date(article.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>
      <div className="mt-8">
        <Markdown content={article.content} />
      </div>
      <Separator className="my-10" />
      <section>
        <h2 className="text-lg font-semibold">讨论 · {comments.length}</h2>
        <CommentThread targetId={article.id} comments={comments} onPosted={() => bump((x) => x + 1)} />
      </section>
    </div>
  )
}
