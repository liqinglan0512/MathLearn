import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, CirclePause, CirclePlay, Clock3, RotateCcw } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { MathProse } from '@/components/reading/MathProse'
import { Button } from '@/components/ui/button'
import {
  advanceExamClock,
  createExamSession,
  ERROR_REASONS,
  formatDuration,
  loadExamSession,
  parsePaperQuestions,
  persistExamSession,
  questionScore,
  recommendedMinutes,
  type ExamErrorReason,
  type ExamSession,
} from '@/lib/exam'
import { getLabMeta, type LabId } from '@/lib/learning'
import { store } from '@/lib/store'
import type { Paper } from '@/lib/types'

interface ExamWorkspaceProps {
  paper: Paper
}

export default function ExamWorkspace({ paper }: ExamWorkspaceProps) {
  const questions = parsePaperQuestions(paper)
  const suggestedMinutes = recommendedMinutes(paper, questions.length)
  const [session, setSession] = useState(() => loadExamSession(paper.id, questions.length))

  useEffect(() => {
    if (session.status !== 'running') return

    const interval = window.setInterval(() => {
      setSession((current) => persistExamSession(advanceExamClock(current, Date.now())))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [session.status])

  const activeQuestion = questions[session.activeQuestion] ?? questions[0]
  const elapsedSeconds = session.secondsByQuestion.reduce((total, seconds) => total + seconds, 0)
  const remainingSeconds = Math.max(0, suggestedMinutes * 60 - elapsedSeconds)
  const maximumScore = questions.reduce((total, question) => total + question.points, 0)
  const earnedScore = questions.reduce((total, question) => total + questionScore(question, session), 0)

  function updateSession(updater: (current: ExamSession) => ExamSession) {
    setSession((current) => persistExamSession(updater(current)))
  }

  function startOrResume() {
    updateSession((current) => ({
      ...current,
      status: 'running',
      startedAt: current.startedAt ?? Date.now(),
      lastTickAt: Date.now(),
      finishedAt: null,
    }))
  }

  function pause() {
    updateSession((current) => ({ ...advanceExamClock(current, Date.now()), status: 'paused', lastTickAt: null }))
  }

  function finish() {
    updateSession((current) => ({
      ...advanceExamClock(current, Date.now()),
      status: 'finished',
      lastTickAt: null,
      finishedAt: Date.now(),
    }))
  }

  function activateQuestion(index: number) {
    updateSession((current) => ({ ...advanceExamClock(current, Date.now()), activeQuestion: index }))
  }

  function toggleRubric(questionId: string, rubricId: string) {
    updateSession((current) => {
      const existing = current.checksByQuestion[questionId] ?? []
      const next = existing.includes(rubricId)
        ? existing.filter((item) => item !== rubricId)
        : [...existing, rubricId]

      return { ...current, checksByQuestion: { ...current.checksByQuestion, [questionId]: next } }
    })
  }

  function toggleError(questionId: string, reason: ExamErrorReason) {
    updateSession((current) => ({
      ...current,
      errorsByQuestion: {
        ...current.errorsByQuestion,
        [questionId]: current.errorsByQuestion[questionId] === reason ? undefined : reason,
      },
    }))
  }

  if (session.status === 'idle') {
    return (
      <section className="mt-10 border-t border-white/[0.08] pt-9" aria-label="计时训练">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#ad986a]">把一张试卷变成一次反馈</p>
        <h2 className="mt-4 text-2xl font-medium text-[#eee7d7]">计时训练</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#a5a297]">
          按题记录用时，拆解个人得分点，并在交卷后回到真正需要补的定义和推导。
        </p>
        <div className="mt-7 grid max-w-lg grid-cols-3 gap-6 border-y border-white/[0.07] py-5">
          <div>
            <p className="text-xl font-medium tabular-nums text-[#efe8d8]">{questions.length}</p>
            <p className="mt-1 text-xs text-[#96958c]">题目</p>
          </div>
          <div>
            <p className="text-xl font-medium tabular-nums text-[#efe8d8]">{suggestedMinutes}</p>
            <p className="mt-1 text-xs text-[#96958c]">建议分钟</p>
          </div>
          <div>
            <p className="text-xl font-medium tabular-nums text-[#efe8d8]">{maximumScore}</p>
            <p className="mt-1 text-xs text-[#96958c]">总分</p>
          </div>
        </div>
        <Button className="mt-8 bg-[#e7d6a7] text-[#25231c] hover:bg-[#f0e3c1]" onClick={startOrResume}>
          <CirclePlay className="mr-1 h-4 w-4" /> 开始答题
        </Button>
      </section>
    )
  }

  return (
    <section className="mt-9" aria-label="试卷计时训练工作区">
      <div className="flex flex-wrap items-center justify-between gap-5 border-y border-white/[0.08] py-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#98968c]">剩余时间</p>
            <p data-testid="exam-remaining" className="mt-1 font-mono text-2xl text-[#e8dcc0]">
              {formatDuration(remainingSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#98968c]">本题用时</p>
            <p data-testid="question-timer" className="mt-1 font-mono text-xl text-[#dfdbcf]">
              {formatDuration(session.secondsByQuestion[session.activeQuestion] ?? 0)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === 'running' ? (
            <Button variant="ghost" size="sm" onClick={pause}>
              <CirclePause className="mr-1 h-4 w-4" /> 暂停
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={startOrResume}>
              <CirclePlay className="mr-1 h-4 w-4" /> {session.status === 'finished' ? '继续复盘' : '继续'}
            </Button>
          )}
          {session.status !== 'finished' && (
            <Button size="sm" onClick={finish}>
              结束并复盘
            </Button>
          )}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-2" aria-label="题目导航">
        {questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            onClick={() => activateQuestion(index)}
            aria-pressed={index === session.activeQuestion}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm transition-colors ${
              index === session.activeQuestion
                ? 'bg-[#e7d6a7] text-[#25231c]'
                : 'bg-white/[0.035] text-[#b7b3a8] hover:bg-white/[0.08]'
            }`}
          >
            {index + 1}
            <span className="ml-1.5 text-[10px] opacity-70">{question.points} 分</span>
          </button>
        ))}
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-medium text-[#ece6d7]"><MathProse content={activeQuestion.title} /></h3>
            <span className="text-sm text-[#ac996e]">{questionScore(activeQuestion, session)} / {activeQuestion.points}</span>
          </div>
          <div className="mt-6">
            <Markdown content={activeQuestion.content} />
          </div>

          <section className="mt-11 border-t border-white/[0.075] pt-7" aria-label="得分点自评">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-medium text-[#e4dfd1]">得分点自评</h4>
              <p className="text-[11px] text-[#94928a]">个人复盘拆分，非原卷官方评分标准</p>
            </div>
            <div className="mt-5 space-y-3">
              {activeQuestion.rubric.map((item) => {
                const checked = (session.checksByQuestion[activeQuestion.id] ?? []).includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleRubric(activeQuestion.id, item.id)}
                    aria-pressed={checked}
                    className="flex w-full items-center justify-between gap-4 py-1.5 text-left text-sm"
                  >
                    <span className="inline-flex items-center gap-3">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          checked ? 'border-[#c7ad70] bg-[#c7ad70] text-[#151613]' : 'border-white/20'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className={checked ? 'text-[#ebe5d6]' : 'text-[#aaa79d]'}><MathProse content={item.label} /></span>
                    </span>
                    <span className="font-mono text-xs text-[#a99260]">{item.points} 分</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-9" aria-label="错因记录">
            <h4 className="text-sm font-medium text-[#e4dfd1]">如果卡住，问题出现在哪里？</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {ERROR_REASONS.map((reason) => {
                const selected = session.errorsByQuestion[activeQuestion.id] === reason.id
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => toggleError(activeQuestion.id, reason.id)}
                    aria-pressed={selected}
                    className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                      selected ? 'bg-[#c7ad70]/20 text-[#ead7a7]' : 'bg-white/[0.04] text-[#a5a297] hover:bg-white/[0.07]'
                    }`}
                  >
                    {reason.label}
                  </button>
                )
              })}
            </div>
          </section>
        </article>

        <aside className="space-y-8 lg:border-l lg:border-white/[0.07] lg:pl-6">
          <section>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#aa956a]">逐题用时</p>
            <div className="mt-4 space-y-3">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-[#aaa79d]">第 {index + 1} 题</span>
                  <span className="font-mono tabular-nums text-[#dbd5c7]">
                    {formatDuration(session.secondsByQuestion[index] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {(activeQuestion.articleIds.length > 0 || activeQuestion.labIds.length > 0) && (
            <section>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#aa956a]">卡住时回到这里</p>
              <div className="mt-4 space-y-3">
                {activeQuestion.articleIds.slice(0, 2).map((articleId) => {
                  const article = store.articles().find((item) => item.id === articleId)
                  return article ? (
                    <Link key={article.id} to={`/principles/${article.id}`} className="block text-xs leading-6 text-[#c7c1b4] hover:text-[#efe5cb]">
                      <MathProse content={article.title} />
                    </Link>
                  ) : null
                })}
                {activeQuestion.labIds.slice(0, 1).map((labId) => {
                  const lab = getLabMeta(labId as LabId)
                  return (
                    <Link key={lab.id} to={lab.href} className="inline-flex items-center gap-1 text-xs text-[#bba574]">
                      {lab.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      {session.status === 'finished' && (
        <ExamReview paper={paper} session={session} questions={questions} earnedScore={earnedScore} maximumScore={maximumScore} />
      )}

      <button
        type="button"
        onClick={() => updateSession(() => createExamSession(paper.id, questions.length))}
        className="mt-12 inline-flex items-center gap-1.5 text-xs text-[#8c8b82] hover:text-[#d8d4c7]"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 重新开始这套训练
      </button>
    </section>
  )
}

function ExamReview({
  paper,
  session,
  questions,
  earnedScore,
  maximumScore,
}: {
  paper: Paper
  session: ExamSession
  questions: ReturnType<typeof parsePaperQuestions>
  earnedScore: number
  maximumScore: number
}) {
  const reasons = questions
    .map((question) => session.errorsByQuestion[question.id])
    .filter((reason): reason is ExamErrorReason => Boolean(reason))
  const recoveryQuestions = questions.filter((question) => {
    const reason = session.errorsByQuestion[question.id]
    return reason === 'knowledge' || reason === 'logic'
  })
  const recoveryProblemIds = [...new Set(recoveryQuestions.flatMap((question) => question.problemIds))]
  const recoveryProblems = store.problems().filter((problem) => recoveryProblemIds.includes(problem.id)).slice(0, 3)

  return (
    <section className="mt-14 border-t border-white/[0.08] pt-9" aria-label="交卷复盘">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#ad986a]">复盘比总分更重要</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-medium text-[#ece6d7]"><MathProse content={paper.title} /></h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#a5a297]">
            <Clock3 className="h-4 w-4" /> 总用时 {formatDuration(session.secondsByQuestion.reduce((total, value) => total + value, 0))}
          </p>
        </div>
        <p className="font-mono text-3xl text-[#e7d6a7]">
          {earnedScore}<span className="text-base text-[#a5a297]"> / {maximumScore}</span>
        </p>
      </div>

      {reasons.length > 0 ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-4">
          {ERROR_REASONS.map((reason) => {
            const count = reasons.filter((item) => item === reason.id).length
            const percentage = Math.round((count / reasons.length) * 100)
            return (
              <div key={reason.id}>
                <p className="font-mono text-lg text-[#e6decf]">{percentage}%</p>
                <p className="mt-1 text-xs text-[#99968c]">{reason.label} · {count} 题</p>
              </div>
            )
          })}
          <p className="text-xs text-[#99968c] sm:col-span-4">统计仅基于你实际标记的 {reasons.length} 道题，不推断未标记题目。</p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[#a5a297]">还没有记录错因，因此暂时不能判断知识、计算或逻辑方面的薄弱环节。</p>
      )}

      {recoveryProblems.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium text-[#e4dfd1]">带着复盘结果，重新做一道相关题</p>
          <div className="mt-3 space-y-2">
            {recoveryProblems.map((problem) => (
              <Link key={problem.id} to={`/problems/${problem.id}`} className="flex items-center gap-2 text-sm text-[#baa474] hover:text-[#e7d6a7]">
                <MathProse content={problem.title} /> <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
