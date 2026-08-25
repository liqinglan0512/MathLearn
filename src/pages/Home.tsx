import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, FunctionSquare, Layers, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { store } from '@/lib/store'

const FEATURES = [
  { icon: BookOpen, title: '高质量题库', desc: '按章节、难度、竞赛类型浏览与搜索，题题精挑细选。' },
  { icon: Users, title: '社区解法', desc: '任何人都可以贡献解法，Markdown + LaTeX 完整支持。' },
  { icon: Compass, title: '第一性原理', desc: '每个公式和定理都有迹可循，从定义出发完整推导。' },
  { icon: FunctionSquare, title: '交互可视化', desc: '函数图像实时参数控制，直观理解抽象概念。' },
]

export default function Home() {
  const pCount = store.problems().length
  const sCount = store.solutions().length
  const aCount = store.articles().length

  return (
    <div>
      <section className="py-16 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-600">
          面向中国大学生数学竞赛备赛者
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          数学，从第一性原理<span className="text-indigo-600">重新推导</span>一遍。
        </h1>
        <p className="mt-5 max-w-xl text-neutral-500">
          题库共享 · 社区解法 · 长文推导 · 强交互可视化。极简、低门槛，手机和电脑都好用。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/problems">
              进入题库 <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/principles">读一篇推导</Link>
          </Button>
        </div>
        <div className="mt-10 flex gap-8 text-sm text-neutral-500">
          <span>
            <strong className="text-lg font-semibold text-neutral-900">{pCount}</strong> 道题目
          </span>
          <span>
            <strong className="text-lg font-semibold text-neutral-900">{sCount}</strong> 份解法
          </span>
          <span>
            <strong className="text-lg font-semibold text-neutral-900">{aCount}</strong> 篇推导
          </span>
        </div>
      </section>

      <section className="grid gap-4 border-t border-neutral-100 py-12 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-neutral-200 p-6">
            <f.icon className="h-5 w-5 text-indigo-600" />
            <h3 className="mt-3 font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm text-neutral-500">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-neutral-950 px-6 py-10 text-white sm:px-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400">
          <Layers className="h-4 w-4" /> Less is more
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          没有信息流、没有打卡、没有焦虑。只有题目、解法、推导和图像——
          备赛需要的全部，仅此而已。
        </p>
      </section>
    </div>
  )
}
