import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, FileStack, FunctionSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BlackHole from '@/components/BlackHole'
import { store } from '@/lib/store'

const FEATURES = [
  { icon: BookOpen, title: '高质量题库', desc: '按章节、难度、竞赛类型浏览与搜索，题题精挑细选。' },
  { icon: FileStack, title: '整套试卷', desc: '完整试卷与套题，Markdown + LaTeX 排版，附原版 PDF。' },
  { icon: Users, title: '社区解法', desc: '任何人都可以贡献解法，多种格式完整支持。' },
  { icon: Compass, title: '第一性原理', desc: '每个公式和定理都有迹可循，从定义出发完整推导。' },
  { icon: FunctionSquare, title: '交互可视化', desc: '函数图像实时参数控制，直观理解抽象概念。' },
]

export default function Home() {
  const pCount = store.problems().length
  const sCount = store.solutions().length
  const aCount = store.articles().length
  const paperCount = store.papers().length

  return (
    <div>
      {/* Hero：黑洞吸积盘作为氛围背景 */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <BlackHole className="pointer-events-none absolute -right-24 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 opacity-80 sm:block" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/70 to-transparent" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-indigo-300/90">
            面向中国大学生数学竞赛备赛者
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-neutral-100 sm:text-5xl">
            数学，从这里开始
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed text-neutral-400">
            题库共享 · 整套试卷 · 社区解法 · 第一性原理推导 · 交互可视化。
            极简、低门槛，手机和电脑都好用。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/problems">
                进入题库 <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10">
              <Link to="/principles">读一篇推导</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-neutral-500">
            <span><strong className="text-lg font-semibold text-neutral-100">{pCount}</strong> 道题目</span>
            <span><strong className="text-lg font-semibold text-neutral-100">{paperCount}</strong> 套试卷</span>
            <span><strong className="text-lg font-semibold text-neutral-100">{sCount}</strong> 份解法</span>
            <span><strong className="text-lg font-semibold text-neutral-100">{aCount}</strong> 篇推导</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-white/[0.06] py-14 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-lg p-6">
            <f.icon className="h-5 w-5 text-indigo-300" />
            <h3 className="mt-3 font-medium text-neutral-100">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-lg px-6 py-10 sm:px-10">
        <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Less is more</div>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-300">
          没有信息流、没有打卡、没有焦虑。只有题目、解法、推导和图像——
          备赛需要的全部，仅此而已。
        </p>
      </section>
    </div>
  )
}
