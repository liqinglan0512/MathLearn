import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Clock3, FileText } from 'lucide-react'
import ExamWorkspace from '@/components/ExamWorkspace'
import { parsePaperQuestions, recommendedMinutes } from '@/lib/exam'
import { store } from '@/lib/store'
import { Markdown } from '@/components/Markdown'
import { MathProse } from '@/components/reading/MathProse'
import { AttachmentList } from '@/components/Attachments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function PaperDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [mode, setMode] = useState<'reading' | 'training'>('reading')
  const paper = store.papers().find((p) => p.id === id)

  if (!paper) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-400">试卷不存在或已被删除。</p>
        <Button variant="ghost" className="mt-4" onClick={() => nav('/papers')}>返回试卷列表</Button>
      </div>
    )
  }

  const questions = parsePaperQuestions(paper)
  const duration = recommendedMinutes(paper, questions.length)
  const points = questions.reduce((total, question) => total + question.points, 0)

  return (
    <div className="mx-auto max-w-4xl py-9 sm:py-12">
      <button onClick={() => nav('/papers')} className="flex items-center gap-1 text-sm text-[#97948b] hover:text-[#e8e2d3]">
        <ArrowLeft className="h-4 w-4" /> 试卷列表
      </button>
      <div className="mt-9">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{paper.competition}</Badge>
          <Badge variant="outline">{paper.year} 年</Badge>
        </div>
        <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-[#eee8da] sm:text-3xl"><MathProse content={paper.title} /></h1>
        <p className="mt-3 text-sm text-[#a5a297]">
          {paper.authorName} · {new Date(paper.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#a5a297]">
        <span>{questions.length} 道题目</span>
        <span>{points} 分</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> 建议 {duration} 分钟</span>
      </div>

      <div className="mt-9 flex gap-6 border-b border-white/[0.08]" aria-label="试卷浏览模式">
        <button
          type="button"
          onClick={() => setMode('reading')}
          aria-pressed={mode === 'reading'}
          className={`inline-flex items-center gap-1.5 border-b pb-3 text-sm ${
            mode === 'reading' ? 'border-[#c7ad70] text-[#e7d6a7]' : 'border-transparent text-[#98968d]'
          }`}
        >
          <FileText className="h-4 w-4" /> 阅读原卷
        </button>
        <button
          type="button"
          onClick={() => setMode('training')}
          aria-pressed={mode === 'training'}
          className={`inline-flex items-center gap-1.5 border-b pb-3 text-sm ${
            mode === 'training' ? 'border-[#c7ad70] text-[#e7d6a7]' : 'border-transparent text-[#98968d]'
          }`}
        >
          <Clock3 className="h-4 w-4" /> 计时训练
        </button>
      </div>

      {mode === 'reading' ? (
        <div className="mx-auto mt-9 max-w-[760px]">
          <Markdown content={paper.content} />
          <AttachmentList items={paper.attachments} />
          <div className="mt-11 border-t border-white/[0.08] pt-7">
            <p className="text-sm text-[#a5a297]">想知道时间花在哪里，以及哪一步真正卡住了吗？</p>
            <Button className="mt-4 bg-[#e7d6a7] text-[#25231c] hover:bg-[#f0e3c1]" onClick={() => setMode('training')}>开始计时训练</Button>
          </div>
        </div>
      ) : (
        <ExamWorkspace paper={paper} />
      )}
    </div>
  )
}
