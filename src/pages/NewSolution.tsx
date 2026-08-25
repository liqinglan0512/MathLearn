import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { store, uid } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import type { Attachment, Solution } from '@/lib/types'
import { Markdown } from '@/components/Markdown'
import { MathProse } from '@/components/reading/MathProse'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { AttachmentUploader } from '@/components/Attachments'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function NewSolution() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const problem = store.problems().find((p) => p.id === id)
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [err, setErr] = useState('')

  if (!user) {
    nav('/login')
    return null
  }
  if (!problem) {
    nav('/problems')
    return null
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return setErr('请填写解法内容或上传附件')
    const s: Solution = {
      id: uid(),
      problemId: problem!.id,
      authorId: user!.id,
      authorName: user!.name,
      content,
      attachments,
      createdAt: Date.now(),
      likes: 0,
    }
    try {
      store.addSolution(s)
      nav(`/problems/${problem!.id}`)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '保存失败')
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold tracking-tight">提交解法</h1>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs text-neutral-400">题目</p>
        <h2 className="mt-1 font-medium"><MathProse content={problem.title} /></h2>
        <div className="mt-2 text-sm">
          <Markdown content={problem.statement} />
        </div>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <Label className="mb-1.5 block">解法（Markdown + LaTeX）</Label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            rows={16}
            placeholder={'写出你的完整推导，例如：\n\n**第一步：** ……\n$$\\lim_{n\\to\\infty} a_n = L$$'}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">手写过程图片 / PDF（可选）</Label>
          <AttachmentUploader value={attachments} onChange={setAttachments} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex gap-3">
          <Button type="submit">发布解法</Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>取消</Button>
        </div>
      </form>
    </div>
  )
}
