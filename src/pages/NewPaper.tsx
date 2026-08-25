import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { store, uid } from '@/lib/store'
import { COMPETITIONS, type Attachment, type Competition, type Paper } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { AttachmentUploader } from '@/components/Attachments'

export default function NewPaper() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [competition, setCompetition] = useState<Competition>('全国大学生数学竞赛')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [err, setErr] = useState('')

  if (!user) {
    nav('/login')
    return null
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setErr('请填写试卷标题')
    if (!content.trim() && attachments.length === 0) return setErr('请填写试卷内容或上传 PDF 附件')
    const p: Paper = {
      id: uid(),
      title: title.trim(),
      competition,
      year: parseInt(year) || new Date().getFullYear(),
      description: description.trim(),
      content,
      attachments,
      createdAt: Date.now(),
      authorId: user!.id,
      authorName: user!.name,
    }
    try {
      store.addPaper(p)
      nav(`/papers/${p.id}`)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '保存失败')
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold tracking-tight">上传试卷 / 套题</h1>
      <p className="mt-1 text-sm text-neutral-400">
        整套试题直接写在正文里（Markdown + LaTeX），也可以附上原版 PDF。
      </p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <Label>标题</Label>
          <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：2025 全国大学生数学竞赛预赛·模拟卷 A" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>竞赛类型</Label>
            <Select value={competition} onValueChange={(v) => setCompetition(v as Competition)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{COMPETITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>年份</Label>
            <Input className="mt-1.5" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div>
          <Label>简介（可选）</Label>
          <Input className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="覆盖范围、题量、建议用时…" />
        </div>
        <div>
          <Label className="mb-1.5 block">试卷正文</Label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            rows={18}
            placeholder={'## 一（15 分）\n\n求极限\n\n$$\\lim_{n \\to \\infty} …$$'}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">附件（PDF 原卷 / 答题卡，可选）</Label>
          <AttachmentUploader value={attachments} onChange={setAttachments} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-3">
          <Button type="submit">发布试卷</Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>取消</Button>
        </div>
      </form>
    </div>
  )
}
