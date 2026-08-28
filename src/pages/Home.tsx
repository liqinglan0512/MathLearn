import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, Compass, FunctionSquare, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MathManifold from '@/components/MathManifold'
import { GITHUB_REPOSITORY_URL, OPEN_LEARNING_LOOP } from '@/config/product'

const CAPABILITIES = [
  { title: '理解', desc: '直觉、定义与严格推理', to: '/principles', external: false },
  { title: '可视化', desc: '亲手改变参数，看见结构', to: '/viz', external: false },
  { title: '练习', desc: '用少量好题检验理解', to: '/problems', external: false },
  { title: '开源', desc: '通过 GitHub 一起改进', to: GITHUB_REPOSITORY_URL, external: true },
]

const COLLECTIONS = [
  {
    icon: BookOpen,
    title: '理解一个数学概念',
    desc: '从问题的起点出发，让直觉、定义、条件与证明一步步长出来。',
    label: '开始学习',
    to: '/principles',
    external: false,
  },
  {
    icon: Compass,
    title: '亲手看见它',
    desc: '改变参数、拖动对象，观察抽象关系在图形和运动中保持什么。',
    label: '探索可视化',
    to: '/viz',
    external: false,
  },
  {
    icon: FunctionSquare,
    title: '用练习检验理解',
    desc: '题目不是终点；它用来暴露知识缺口，并把你带回相应概念。',
    label: '进入练习',
    to: '/problems',
    external: false,
  },
  {
    icon: Github,
    title: '一起把解释变得更好',
    desc: '报告数学错误、提出解释改进，或通过 Pull Request 贡献代码与内容。',
    label: '在 GitHub 上贡献',
    to: GITHUB_REPOSITORY_URL,
    external: true,
  },
]

function Destination({
  to,
  external,
  className,
  children,
}: {
  to: string
  external: boolean
  className: string
  children: ReactNode
}) {
  return external
    ? <a href={to} target="_blank" rel="noreferrer" className={className}>{children}</a>
    : <Link to={to} className={className}>{children}</Link>
}

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
              从直觉出发，走向严格。
              <br />
              让公式回到它产生的地方。
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3 sm:mt-11 sm:gap-4">
              <Button asChild size="lg" className="home-primary-cta h-12 rounded-[5px] px-6 text-[14px] font-medium">
                <Link to="/principles">
                  开始学习 <ArrowRight className="home-cta-arrow ml-1.5 h-[16px] w-[16px]" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="home-secondary-cta h-12 rounded-[5px] px-5 text-[14px] font-normal"
              >
                <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                  <Github className="h-4 w-4" />查看 GitHub
                </a>
              </Button>
              <Link to="/viz" className="inline-flex h-12 items-center gap-1.5 px-2 text-[13px] text-[#a9a397] hover:text-[#e8dfca]">
                探索可视化<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <nav className="home-capabilities grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-x-8" aria-label="MathForge 学习入口">
            {CAPABILITIES.map((item) => (
              <Destination key={item.title} to={item.to} external={item.external} className="home-capability group block min-w-0">
                <p className="text-[14px] font-medium tracking-[0.045em] text-[#e4dfd1] transition-colors group-hover:text-[#f0e8d3]">
                  {item.title}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#898a83]">{item.desc}</p>
              </Destination>
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
          <p className="max-w-[21rem] text-[14px] leading-7 text-[#898a83]">从第一次困惑，到能够解释、观察并检验它。</p>
        </div>

        <ol className="home-learning-path mt-11 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-14 lg:grid-cols-4">
          {OPEN_LEARNING_LOOP.map((step, index) => (
            <li key={step.id} className="home-path-step relative min-w-0">
              <span className="font-mono text-[11px] tabular-nums tracking-[0.16em] text-[#a99058]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 whitespace-nowrap text-[13px] text-[#d8d4c7]">{step.label}</p>
              <p className="mt-2 max-w-[13rem] text-[11px] leading-5 text-[#85867f]">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="home-collections mt-16 grid sm:mt-20 sm:grid-cols-2">
          {COLLECTIONS.map((collection, index) => (
            <Destination key={collection.title} to={collection.to} external={collection.external}
              className="home-collection group relative block py-8 sm:py-10">
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
            </Destination>
          ))}
        </div>
      </section>

      <section className="home-manifesto relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16">
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="home-section-kicker">认真理解的时间</p>
            <p className="mt-6 max-w-[36rem] text-[17px] leading-8 text-[#d8d4c7] sm:text-[20px] sm:leading-9">
              不用信息流制造焦虑，也不靠答案替代理解。
              <br />
              从一个概念开始，认真看清它为什么成立。
            </p>
          </div>
          <Link to="/principles" className="group inline-flex items-center gap-2 text-[13px] text-[#baaa83] hover:text-[#f0e8d3]">
            从理解数学开始 <ArrowRight className="home-cta-arrow h-[15px] w-[15px]" />
          </Link>
        </div>
      </section>
    </div>
  )
}
