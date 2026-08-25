import { Link, useNavigate } from 'react-router'
import { PenLine } from 'lucide-react'
import { store } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function Principles() {
  const { user } = useAuth()
  const nav = useNavigate()
  const articles = store.articles()

  return (
    <div className="py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">第一性原理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            每一个公式和定理都要有迹可循——从定义出发，一步步推到结论。
          </p>
        </div>
        <Button size="sm" onClick={() => nav(user ? '/principles/new' : '/login')}>
          <PenLine className="mr-1 h-4 w-4" /> 写推导
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            to={`/principles/${a.id}`}
            className="block rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 sm:p-6"
          >
            <Badge variant="outline" className="text-xs">{a.topic}</Badge>
            <h2 className="mt-2.5 text-lg font-medium leading-snug">{a.title}</h2>
            <p className="mt-1.5 text-sm text-neutral-500">{a.summary}</p>
            <p className="mt-3 text-xs text-neutral-400">
              {a.authorName} · {new Date(a.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
            还没有推导长文，来写第一篇。
          </p>
        )}
      </div>
    </div>
  )
}
