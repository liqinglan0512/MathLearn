import { useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { store } from '@/lib/store'
import { Markdown } from '@/components/Markdown'
import { AttachmentList } from '@/components/Attachments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function PaperDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const paper = store.papers().find((p) => p.id === id)

  if (!paper) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-400">试卷不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => nav('/papers')}>返回试卷列表</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <button onClick={() => nav('/papers')} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-100">
        <ArrowLeft className="h-4 w-4" /> 试卷列表
      </button>
      <div className="mt-6">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{paper.competition}</Badge>
          <Badge variant="outline">{paper.year} 年</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{paper.title}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {paper.authorName} · {new Date(paper.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>
      <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        <Markdown content={paper.content} />
        <AttachmentList items={paper.attachments} />
      </div>
    </div>
  )
}
