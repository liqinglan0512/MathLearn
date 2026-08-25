import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { store, uid } from '@/lib/store'
import { CHAPTERS, COMPETITIONS, DIFFICULTIES, type Attachment, type Chapter, type Competition, type Difficulty, type Problem } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { AttachmentUploader } from '@/components/Attachments'

export default function NewProblem() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [statement, setStatement] = useState('')
  const [chapter, setChapter] = useState<Chapter>('函数')
  const [difficulty, setDifficulty] = useState<Difficulty>('基础')
  const [competition, setCompetition] = useState<Competition>('全国大学生数学竞赛')
  const [tags, setTags] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [err, setErr] = useState('')

  if (!user) {
    nav('/login')
    return null
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setErr('请填写题目标题')
    if (!statement.trim()) return setErr('请填写题目内容')
    const p: Problem = {
      id: uid(),
      title: title.trim(),
      statement,
      chapter,
      difficulty,
      competition,
      tags: tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      attachments,
      createdAt: Date.now(),
      authorId: user!.id,
    }
    try {
      store.addProblem(p)
      nav(`/problems/${p.id}`)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '保存失败')
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold tracking-tight">上传题目</h1>
      <p className="mt-1 text-sm text-neutral-400">支持 Markdown + LaTeX 题干，可附 PDF 或图片。</p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <Label>标题</Label>
          <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：极限：Stolz 定理的应用" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>章节</Label>
            <Select value={chapter} onValueChange={(v) => setChapter(v as Chapter)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{CHAPTERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>难度</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>竞赛类型</Label>
            <Select value={competition} onValueChange={(v) => setCompetition(v as Competition)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{COMPETITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>标签（空格或逗号分隔）</Label>
          <Input className="mt-1.5" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="如：极限 递推数列" />
        </div>
        <div>
          <Label className="mb-1.5 block">题目内容</Label>
          <MarkdownEditor value={statement} onChange={setStatement} placeholder="题干支持 LaTeX：$a_n$、$$\int_0^1$$ …" />
        </div>
        <div>
          <Label className="mb-1.5 block">附件（可选）</Label>
          <AttachmentUploader value={attachments} onChange={setAttachments} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-3">
          <Button type="submit">发布题目</Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>取消</Button>
        </div>
      </form>
    </div>
  )
}
