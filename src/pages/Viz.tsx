import { ArrowRight, BookOpen, Compass } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { ConceptLab } from '@/components/labs/ConceptLabs'
import { FunctionPlotter } from '@/components/labs/FunctionPlotter'
import { MathProse } from '@/components/reading/MathProse'
import { MATH_LABS, getMathLab } from '@/lib/labs'
import { getLearningUnitsForVisualization, getPrimaryLearningUnitForVisualization } from '@/lib/learning-units'

export default function Viz() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeLab = getMathLab(searchParams.get('lab'))
  const relatedUnits = getLearningUnitsForVisualization(activeLab.id)
  const relatedUnit = getPrimaryLearningUnitForVisualization(activeLab.id)
  const directPracticeId = [...new Set(relatedUnits.flatMap((unit) => unit.practiceIds))][0]
  const relatedPracticeQuery = activeLab.subject.replace(/论$/, '')

  function selectLab(id: string) {
    const updated = new URLSearchParams(searchParams)
    updated.set('lab', id)
    setSearchParams(updated, { preventScrollReset: true })
  }

  return (
    <div className="py-9 sm:py-12">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#c7ad70]">
          <Compass className="h-3.5 w-3.5" />数学概念实验室
        </p>
        <h1 className="mt-3 text-[1.8rem] font-semibold leading-tight tracking-[-0.045em] text-[#f0e8d3] sm:text-[2.4rem]">
          <MathProse content={activeLab.title} />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9a69a] sm:text-[15px]"><MathProse content={activeLab.description} /></p>
      </header>

      <section className="mt-7 grid gap-5 border-y border-white/[0.065] py-5 sm:grid-cols-3" aria-label="实验观察提示">
        {[
          { label: '你正在观察什么', content: activeLab.guidance.observe },
          { label: '改变哪个参数', content: activeLab.guidance.change },
          { label: '应该注意什么', content: activeLab.guidance.notice },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[10px] tracking-[0.16em] text-[#a58f60]">{item.label}</p>
            <p className="mt-2 text-[12px] leading-6 text-[#9d9a91]"><MathProse content={item.content} /></p>
          </div>
        ))}
      </section>

      <nav
        aria-label="数学实验类别"
        className="mt-7 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2"
      >
        {MATH_LABS.map((lab) => {
          const selected = lab.id === activeLab.id
          return (
            <button
              key={lab.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectLab(lab.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs transition-colors sm:px-4 sm:text-[13px] ${
                selected
                  ? 'bg-[#c7ad70]/15 text-[#ead5a5]'
                  : 'bg-white/[0.035] text-[#96968d] hover:bg-white/[0.065] hover:text-[#ded9cd]'
              }`}
            >
              <MathProse content={lab.label} />
            </button>
          )
        })}
      </nav>

      <div className="mt-6 sm:mt-8">
        {activeLab.id === 'plotter' ? <FunctionPlotter /> : <ConceptLab key={activeLab.id} id={activeLab.id} />}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-white/[0.065] pt-6 sm:mt-14">
        {relatedUnit && (
          <Link
            to={`/principles/${relatedUnit.articleId}`}
            className="inline-flex items-center gap-2 text-sm text-[#d9c596] transition-colors hover:text-[#f0e8d3]"
          >
            <BookOpen className="h-4 w-4" />理解相关概念
          </Link>
        )}
        <Link
          to={directPracticeId ? `/problems/${directPracticeId}` : `/problems?q=${encodeURIComponent(relatedPracticeQuery)}`}
          className="inline-flex items-center gap-2 text-sm text-[#a6a397] transition-colors hover:text-[#e4ded0]"
        >
          {directPracticeId ? '做一题检验理解' : '搜索相关练习'}<ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-xs text-[#76776f]">双击滑块或数值可以恢复默认值</span>
      </footer>
    </div>
  )
}
