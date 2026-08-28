export type LabId =
  | 'derivative'
  | 'integral'
  | 'linear'
  | 'taylor'
  | 'probability'
  | 'ode'
  | 'plotter'

export interface LabGuidance {
  /** The mathematical object or relationship the learner should watch. */
  readonly observe: string
  /** The controls the learner should deliberately vary. */
  readonly change: string
  /** The invariant, limit, or caveat the learner should notice. */
  readonly notice: string
}

export interface MathLab {
  readonly id: LabId
  readonly label: string
  readonly title: string
  readonly description: string
  readonly subject: string
  readonly guidance: LabGuidance
}

export const MATH_LABS: readonly MathLab[] = [
  {
    id: 'derivative',
    label: '割线与切线',
    title: '导数：当割线成为切线',
    description: '亲手缩短两点之间的距离，观察平均变化率如何趋近瞬时变化率。',
    subject: '导数',
    guidance: {
      observe: '观察割线斜率怎样靠近同一点处的切线斜率。',
      change: '改变函数、观察点 $x_0$ 与增量 $h$。',
      notice: '关键是 $h\\to0$ 的极限过程；对 $\\ln x$ 还必须始终检查 $x>0$。',
    },
  },
  {
    id: 'integral',
    label: '黎曼和',
    title: '积分：从矩形逼近面积',
    description: '增加分割数，并比较左端点、右端点与中点取样如何逼近同一块面积。',
    subject: '函数',
    guidance: {
      observe: '观察黎曼矩形的带符号面积和怎样靠近精确积分。',
      change: '改变函数、积分区间、分割数与取样位置。',
      notice: '真正控制逼近的是分割网格变细，而不是某一种取样方式看起来更平滑。',
    },
  },
  {
    id: 'linear',
    label: '线性变换',
    title: '矩阵：让整个平面一起移动',
    description: '调整矩阵元素，切换直角坐标与极坐标单位圆，观察整张平面如何变形。',
    subject: '代数',
    guidance: {
      observe: '观察网格、单位圆、面积与方向在线性变换下如何一起变化。',
      change: '改变矩阵四个元素，并切换直角网格与极坐标单位圆。',
      notice: '行列式控制有向面积伸缩；只有满足 $A\\mathbf v=\\lambda\\mathbf v$ 的方向才保持不转向。',
    },
  },
  {
    id: 'taylor',
    label: '泰勒逼近',
    title: '泰勒：用局部信息重建曲线',
    description: '逐级提高多项式阶数，比较它与原函数之间的误差如何改变。',
    subject: '函数',
    guidance: {
      observe: '观察泰勒多项式在展开点附近如何贴近原函数，以及误差怎样向外增长。',
      change: '改变原函数、展开阶数与观察范围。',
      notice: '提高阶数改善的是局部匹配；有限阶可导并不自动保证级数处处收敛到原函数。',
    },
  },
  {
    id: 'probability',
    label: '中心极限定理',
    title: '概率：分布为什么走向钟形',
    description: '改变独立伯努利试验次数，比较标准化二项分布与标准正态密度。',
    subject: '概率论',
    guidance: {
      observe: '观察标准化二项分布的柱形轮廓怎样接近标准正态密度。',
      change: '改变试验次数 $n$ 与成功概率 $p$。',
      notice: '中心极限定理描述标准化后的分布逼近，不表示有限样本已经精确服从正态分布。',
    },
  },
  {
    id: 'ode',
    label: '方向场',
    title: '微分方程：每一点都有自己的方向',
    description: '比较七类方程的方向场、精确解与阻尼振子相图，观察不同初值和长期行为。',
    subject: '常微分方程',
    guidance: {
      observe: '观察方向场如何约束解轨线，以及不同初值的长期行为。',
      change: '改变方程类型、参数、初值，并切换方向场与相平面。',
      notice: '轨线必须处处沿方向场切向前进；一张有限窗口图不能代替存在唯一性或稳定性证明。',
    },
  },
  {
    id: 'plotter',
    label: '自由绘图',
    title: '函数图像实验室',
    description: '输入任意表达式与任意数量的实数参数，叠加曲线，并自由缩放和平移坐标系。',
    subject: '开放实验',
    guidance: {
      observe: '观察函数图像、零点、极值、交点和渐近行为如何随表达式变化。',
      change: '改变表达式、任意数量的实数参数以及坐标窗口。',
      notice: '图像用于提出猜想和检查边界；有限精度、有限视窗中的外观不是数学证明。',
    },
  },
]

export const DEFAULT_LAB: LabId = 'derivative'

export function getMathLab(id: string | null): MathLab {
  return MATH_LABS.find((lab) => lab.id === id) ?? MATH_LABS[0]
}

export function isLabId(id: string): id is LabId {
  return MATH_LABS.some((lab) => lab.id === id)
}
