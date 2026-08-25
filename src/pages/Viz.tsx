import { ArrowRight, BookOpen, Compass } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { ConceptLab } from '@/components/labs/ConceptLabs'
import { FunctionPlotter } from '@/components/labs/FunctionPlotter'
import { MATH_LABS, getMathLab } from '@/lib/labs'

export default function Viz() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeLab = getMathLab(searchParams.get('lab'))

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
          {activeLab.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9a69a] sm:text-[15px]">{activeLab.description}</p>
      </header>

      <nav
        aria-label="数学实验类别"
        className="mt-8 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-9 sm:gap-2"
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
              {lab.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-6 sm:mt-8">
        {activeLab.id === 'plotter' ? <FunctionPlotter /> : <ConceptLab key={activeLab.id} id={activeLab.id} />}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-white/[0.065] pt-6 sm:mt-14">
        {activeLab.articleId && (
          <Link
            to={`/principles/${activeLab.articleId}`}
            className="inline-flex items-center gap-2 text-sm text-[#d9c596] transition-colors hover:text-[#f0e8d3]"
          >
            <BookOpen className="h-4 w-4" />阅读相关第一性原理
          </Link>
        )}
        <Link
          to={`/problems?q=${encodeURIComponent(activeLab.subject)}`}
          className="inline-flex items-center gap-2 text-sm text-[#a6a397] transition-colors hover:text-[#e4ded0]"
        >
          练习相关题目<ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-xs text-[#76776f]">双击滑块或数值可以恢复默认值</span>
      </footer>
    </div>
  )
}
