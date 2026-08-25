import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, FileStack, FunctionSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WebGLBlackHole from '@/components/WebGLBlackHole'
import { store } from '@/lib/store'

const FEATURES = [
  { icon: BookOpen, title: '高质量题库', desc: '按章节、难度、竞赛类型浏览与搜索，题题精挑细选。', to: '/problems' },
  { icon: FileStack, title: '整套试卷', desc: '完整试卷与套题，Markdown + LaTeX 排版，附原版 PDF。', to: '/papers' },
  { icon: Users, title: '社区解法', desc: '任何人都可以贡献解法，多种格式完整支持。', to: '/problems' },
  { icon: Compass, title: '第一性原理', desc: '每个公式和定理都有迹可循，从定义出发完整推导。', to: '/principles' },
  { icon: FunctionSquare, title: '交互可视化', desc: '函数图像实时参数控制，直观理解抽象概念。', to: '/viz' },
]

export default function Home() {
  const pCount = store.problems().length
  const sCount = store.solutions().length
  const aCount = store.articles().length
  const paperCount = store.papers().length

  return (
    <div>
      <section className="home-hero relative isolate flex items-center overflow-hidden">
        <WebGLBlackHole className="home-hero-canvas pointer-events-none absolute inset-0 h-full w-full" />
        <div className="home-hero-overlay pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-[40rem]">
            <p className="home-eyebrow text-[11px] font-medium uppercase tracking-[0.3em] text-indigo-200/85">
              为每一个追问本质的人
            </p>
            <h1 className="home-hero-title mt-7 whitespace-nowrap font-semibold leading-[1.14] text-[#ededf1]">
              数学，从这里开始
            </h1>
            <p className="mt-7 max-w-[30rem] text-[15px] leading-8 text-neutral-300/90 sm:text-base">
              从一道题，到一条完整的推导。
              <br />
              让公式回到直觉，让理解先于记忆。
            </p>

            <div className="mt-11 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-md bg-[#ededf1] px-6 text-[#0b0b10] hover:bg-[#dcdce5]">
                <Link to="/problems">
                  进入题库 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-md border-white/[0.13] bg-white/[0.035] px-5 text-neutral-200 hover:border-white/25 hover:bg-white/[0.07]"
              >
                <Link to="/principles">读一篇推导</Link>
              </Button>
            </div>

            <dl className="home-hero-stats mt-14 grid max-w-[32rem] grid-cols-2 gap-x-8 gap-y-6 border-t border-white/[0.09] pt-7 sm:grid-cols-4">
              <div>
                <dd className="text-xl font-medium tabular-nums tracking-tight text-neutral-100">{pCount}</dd>
                <dt className="mt-1 text-xs tracking-wide text-neutral-400">精选题目</dt>
              </div>
              <div>
                <dd className="text-xl font-medium tabular-nums tracking-tight text-neutral-100">{paperCount}</dd>
                <dt className="mt-1 text-xs tracking-wide text-neutral-400">完整试卷</dt>
              </div>
              <div>
                <dd className="text-xl font-medium tabular-nums tracking-tight text-neutral-100">{sCount}</dd>
                <dt className="mt-1 text-xs tracking-wide text-neutral-400">思路解法</dt>
              </div>
              <div>
                <dd className="text-xl font-medium tabular-nums tracking-tight text-neutral-100">{aCount}</dd>
                <dt className="mt-1 text-xs tracking-wide text-neutral-400">原理推导</dt>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="pb-14 pt-20 sm:pb-20 sm:pt-28" aria-labelledby="home-features-title">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 sm:mb-11">
          <div>
            <p className="text-[11px] uppercase tracking-[0.27em] text-indigo-200/80">从问题出发</p>
            <h2 id="home-features-title" className="mt-4 text-[1.65rem] font-medium tracking-tight text-neutral-100 sm:text-3xl">
              把复杂，重新变得清晰。
            </h2>
          </div>
          <p className="max-w-[19rem] text-sm leading-7 text-neutral-400">
            不止知道答案，更知道它为什么成立。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="home-feature glass group relative min-h-[190px] rounded-xl p-7 last:lg:col-span-2"
            >
              <div className="flex items-center justify-between">
                <feature.icon className="h-5 w-5 text-indigo-200/85" strokeWidth={1.6} />
                <span className="text-[11px] tabular-nums tracking-[0.18em] text-neutral-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-8 text-[15px] font-medium tracking-wide text-neutral-100">{feature.title}</h3>
              <p className="mt-2 max-w-[25rem] text-[13px] leading-6 text-neutral-400">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-manifesto glass overflow-hidden rounded-xl px-7 py-12 sm:px-12 sm:py-16">
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-indigo-200/80">Less, but better</p>
            <p className="mt-5 max-w-[36rem] text-[17px] leading-8 text-neutral-200 sm:text-xl sm:leading-9">
              没有信息流，没有打卡，也没有焦虑。
              <br />
              只有题目、解法、推导，和认真理解的时间。
            </p>
          </div>
          <Link
            to="/principles"
            className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-neutral-100"
          >
            从第一性原理开始 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
