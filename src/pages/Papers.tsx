import { Link, useNavigate } from 'react-router'
import { ArrowRight, Clock3, FileStack, Plus } from 'lucide-react'
import { parsePaperQuestions, recommendedMinutes } from '@/lib/exam'
import { store } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { MathProse } from '@/components/reading/MathProse'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FEATURES } from '@/config/features'

export default function Papers() {
  const { user } = useAuth()
  const nav = useNavigate()
  const papers = store.papers()

  return (
    <div className="mx-auto max-w-4xl py-10 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#ad986a]">让复盘比成绩更重要</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f0e8d3]">试卷与套题</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-[#a5a297]">
            阅读原卷，或者开始一次可记录逐题用时、得分点与错因的完整训练。
          </p>
        </div>
        {FEATURES.publicContribution && (
          <Button size="sm" variant="outline" onClick={() => nav(user ? '/papers/new' : '/login')}>
            <Plus className="mr-1 h-4 w-4" /> 提交试卷审核
          </Button>
        )}
      </div>

      <div className="mt-11 divide-y divide-white/[0.07] border-t border-white/[0.07]">
        {papers.map((paper) => {
          const questions = parsePaperQuestions(paper)
          const minutes = recommendedMinutes(paper, questions.length)
          const totalPoints = questions.reduce((total, question) => total + question.points, 0)

          return (
            <Link key={paper.id} to={`/papers/${paper.id}`} className="group block py-7 sm:py-9">
              <div className="flex items-start gap-4 sm:gap-5">
                <FileStack className="mt-1 h-5 w-5 shrink-0 text-[#c1a976]" />
                <div className="min-w-0 flex-1">
                  <h2 className="inline-flex items-center gap-2 text-lg font-medium leading-8 text-[#e9e4d7]">
                    <MathProse content={paper.title} />
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#a5a297]"><MathProse content={paper.description} /></p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#99968c]">
                    <Badge variant="outline">{paper.competition}</Badge>
                    <Badge variant="outline">{paper.year} 年</Badge>
                    <span>{questions.length} 题 · {totalPoints} 分</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {minutes} 分钟</span>
                    {paper.attachments.length > 0 && <span>{paper.attachments.length} 个附件</span>}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
        {papers.length === 0 && (
          <p className="py-16 text-center text-sm text-[#99968c]">当前没有可公开阅读的试卷。</p>
        )}
      </div>
    </div>
  )
}
