import { Link, useNavigate } from 'react-router'
import { FileStack, Plus } from 'lucide-react'
import { store } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function Papers() {
  const { user } = useAuth()
  const nav = useNavigate()
  const papers = store.papers()

  return (
    <div className="py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">试卷与套题</h1>
          <p className="mt-1 text-sm text-neutral-400">整套试卷、模拟题，支持 Markdown + LaTeX 与 PDF 附件。</p>
        </div>
        <Button size="sm" onClick={() => nav(user ? '/papers/new' : '/login')}>
          <Plus className="mr-1 h-4 w-4" /> 上传试卷
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {papers.map((p) => (
          <Link
            key={p.id}
            to={`/papers/${p.id}`}
            className="block rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <FileStack className="mt-1 h-5 w-5 shrink-0 text-indigo-300" />
              <div className="min-w-0">
                <h2 className="font-medium leading-snug">{p.title}</h2>
                <p className="mt-1.5 text-sm text-neutral-400">{p.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline">{p.competition}</Badge>
                  <Badge variant="outline">{p.year} 年</Badge>
                  {p.attachments.length > 0 && (
                    <span className="text-neutral-500">{p.attachments.length} 个附件</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {papers.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 py-16 text-center text-sm text-neutral-500">
            还没有试卷，来上传第一套。
          </p>
        )}
      </div>
    </div>
  )
}
