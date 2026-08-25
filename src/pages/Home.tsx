import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, FileStack, FunctionSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MathManifold from '@/components/MathManifold'

const CAPABILITIES = [
  { title: '严谨推导', desc: '定义、定理与证明', to: '/principles' },
  { title: '多解比较', desc: '同题不同思想', to: '/problems' },
  { title: '动态实验', desc: '让抽象结构可以被操纵', to: '/viz' },
  { title: '系统训练', desc: '题目、试卷与知识链', to: '/papers' },
]

const LEARNING_PATH = ['遇见问题', '找到知识缺口', '回到第一性原理', '动态观察', '重新解题', '变式检验']

const COLLECTIONS = [
  {
    icon: BookOpen,
    title: '从一道好题开始',
    desc: '题目不止通向答案，也通向它所依赖的定义、思想与证明。',
    label: '探索题库',
    to: '/problems',
  },
  {
    icon: Compass,
    title: '追问为什么成立',
    desc: '找到问题的起点，看见被省略的条件，沿着推导回到结论。',
    label: '阅读第一性原理',
    to: '/principles',
  },
  {
    icon: FunctionSquare,
    title: '把抽象放进实验',
    desc: '拖动参数、观察变化，让极限、线性变换和收敛过程变得可见。',
    label: '进入概念实验室',
    to: '/viz',
  },
  {
    icon: FileStack,
    title: '让理解经得起检验',
    desc: '通过试卷、变式和完整解答，确认掌握的究竟是答案还是方法。',
    label: '开始系统训练',
    to: '/papers',
  },
]

export default function Home() {
  return (
    <div>
      <section className="home-hero relative isolate overflow-hidden" aria-labelledby="home-hero-title">
        <MathManifold className="home-manifold pointer-events-none absolute" />

        <div className="home-hero-inner relative z-10 mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
          <div className="home-copy">
            <p className="home-eyebrow text-[12px] font-medium tracking-[0.22em] text-[#c7ad70]">
              为每一个追问本质的人
            </p>
            <h1 id="home-hero-title" className="home-hero-title mt-8 font-semibold leading-[1.13] text-[#f0e8d3]">
              数学，从这里开始
            </h1>
            <p className="mt-7 max-w-[30rem] text-[15px] leading-[2.05] text-[#b6b3a9] sm:text-[16px]">
              从一道题，到一条完整的推导。
              <br />
              让公式回到直觉，让理解先于记忆。
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3 sm:mt-11 sm:gap-4">
              <Button asChild size="lg" className="home-primary-cta h-12 rounded-[5px] px-6 text-[14px] font-medium">
                <Link to="/problems">
                  开始探索 <ArrowRight className="home-cta-arrow ml-1.5 h-[16px] w-[16px]" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="home-secondary-cta h-12 rounded-[5px] px-5 text-[14px] font-normal"
              >
                <Link to="/principles">阅读第一篇推导</Link>
              </Button>
            </div>
          </div>

          <nav className="home-capabilities grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-x-8" aria-label="MathForge 学习入口">
            {CAPABILITIES.map((item) => (
              <Link key={item.title} to={item.to} className="home-capability group block min-w-0">
                <p className="text-[14px] font-medium tracking-[0.045em] text-[#e4dfd1] transition-colors group-hover:text-[#f0e8d3]">
                  {item.title}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#898a83]">{item.desc}</p>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="home-learning-section pb-12 pt-24 sm:pb-20 sm:pt-32" aria-labelledby="home-learning-title">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="home-section-kicker">从问题出发</p>
            <h2 id="home-learning-title" className="mt-5 text-[1.8rem] font-medium tracking-[-0.045em] text-[#f0e8d3] sm:text-[2.25rem]">
              理解，从来不是一条捷径。
            </h2>
          </div>
          <p className="max-w-[21rem] text-[14px] leading-7 text-[#898a83]">
            从第一次困惑，到终于说清楚为什么。
          </p>
        </div>

        <ol className="home-learning-path mt-11 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-14 sm:grid-cols-3 lg:grid-cols-6">
          {LEARNING_PATH.map((step, index) => (
            <li key={step} className="home-path-step relative min-w-0">
              <span className="font-mono text-[11px] tabular-nums tracking-[0.16em] text-[#a99058]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 whitespace-nowrap text-[13px] text-[#d8d4c7]">{step}</p>
            </li>
          ))}
        </ol>

        <div className="home-collections mt-16 grid sm:mt-20 sm:grid-cols-2">
          {COLLECTIONS.map((collection, index) => (
            <Link key={collection.title} to={collection.to} className="home-collection group relative py-8 sm:py-10">
              <div className="flex items-center justify-between">
                <collection.icon className="h-[19px] w-[19px] text-[#c7ad70]" strokeWidth={1.55} />
                <span className="font-mono text-[10px] tabular-nums tracking-[0.15em] text-[#696a64]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-7 text-[16px] font-medium tracking-[0.02em] text-[#e9e4d6]">
                {collection.title}
              </h3>
              <p className="mt-3 max-w-[24rem] text-[13px] leading-7 text-[#96968d]">{collection.desc}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-[12px] text-[#baaa83]">
                {collection.label} <ArrowRight className="home-cta-arrow h-[14px] w-[14px]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-manifesto relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16">
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="home-section-kicker">认真理解的时间</p>
            <p className="mt-6 max-w-[36rem] text-[17px] leading-8 text-[#d8d4c7] sm:text-[20px] sm:leading-9">
              没有信息流，没有打卡，也没有焦虑。
              <br />
              只有题目、推导，和真正弄懂一件事。
            </p>
          </div>
          <Link to="/principles" className="group inline-flex items-center gap-2 text-[13px] text-[#baaa83] hover:text-[#f0e8d3]">
            从第一性原理开始 <ArrowRight className="home-cta-arrow h-[15px] w-[15px]" />
          </Link>
        </div>
      </section>
    </div>
  )
}
