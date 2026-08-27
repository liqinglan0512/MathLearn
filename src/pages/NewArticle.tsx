import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { store, uid } from '@/lib/store'
import { CHAPTERS, type Article, type Chapter } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditor } from '@/components/MarkdownEditor'

export default function NewArticle() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [topic, setTopic] = useState<Chapter>('函数')
  const [content, setContent] = useState('')
  const [err, setErr] = useState('')

  if (!user) {
    nav('/login')
    return null
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setErr('请填写标题')
    if (!content.trim()) return setErr('请填写正文')
    const a: Article = {
      id: uid(),
      title: title.trim(),
      summary: summary.trim() || content.trim().slice(0, 60),
      topic,
      content,
      authorId: user!.id,
      authorName: user!.name,
      createdAt: Date.now(),
    }
    try {
      store.addArticle(user, a)
      nav(`/principles/${a.id}`)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '保存失败')
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold tracking-tight">写第一性原理推导</h1>
      <p className="mt-1 text-sm text-neutral-400">
        从一个朴素的问题或定义出发，把公式/定理完整地推出来。
      </p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <Label>标题</Label>
          <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：泰勒公式：从「以直代曲」到一般逼近" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>所属板块</Label>
            <Select value={topic} onValueChange={(v) => setTopic(v as Chapter)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{CHAPTERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>一句话摘要（可选）</Label>
            <Input className="mt-1.5" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">正文（Markdown + LaTeX 长文，支持配图）</Label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            rows={20}
            placeholder={'## 1. 起点：我们想干什么？\n\n……\n\n$$P_n(x) = \\sum_{k=0}^{n} \\frac{f^{(k)}(x_0)}{k!} (x-x_0)^k$$'}
          />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-3">
          <Button type="submit">提交审核</Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>取消</Button>
        </div>
      </form>
    </div>
  )
}
