export type LabId =
  | 'derivative'
  | 'integral'
  | 'linear'
  | 'taylor'
  | 'probability'
  | 'ode'
  | 'plotter'

export interface MathLab {
  id: LabId
  label: string
  title: string
  description: string
  subject: string
  articleId?: string
}

export const MATH_LABS: readonly MathLab[] = [
  {
    id: 'derivative',
    label: '割线与切线',
    title: '导数：当割线成为切线',
    description: '亲手缩短两点之间的距离，观察平均变化率如何趋近瞬时变化率。',
    subject: '导数',
    articleId: 'a13',
  },
  {
    id: 'integral',
    label: '黎曼和',
    title: '积分：从矩形逼近面积',
    description: '增加分割数，并比较左端点、右端点与中点取样如何逼近同一块面积。',
    subject: '函数',
    articleId: 'a6',
  },
  {
    id: 'linear',
    label: '线性变换',
    title: '矩阵：让整个平面一起移动',
    description: '调整矩阵元素，切换直角坐标与极坐标单位圆，观察整张平面如何变形。',
    subject: '代数',
    articleId: 'a4',
  },
  {
    id: 'taylor',
    label: '泰勒逼近',
    title: '泰勒：用局部信息重建曲线',
    description: '逐级提高多项式阶数，比较它与原函数之间的误差如何改变。',
    subject: '函数',
    articleId: 'a1',
  },
  {
    id: 'probability',
    label: '中心极限定理',
    title: '概率：分布为什么走向钟形',
    description: '改变独立伯努利试验次数，比较标准化二项分布与标准正态密度。',
    subject: '概率论',
    articleId: 'a14',
  },
  {
    id: 'ode',
    label: '方向场',
    title: '微分方程：每一点都有自己的方向',
    description: '比较七类方程的方向场、精确解与阻尼振子相图，观察不同初值和长期行为。',
    subject: '常微分方程',
    articleId: 'a9',
  },
  {
    id: 'plotter',
    label: '自由绘图',
    title: '函数图像实验室',
    description: '输入任意表达式与任意数量的实数参数，叠加曲线，并自由缩放和平移坐标系。',
    subject: '开放实验',
  },
]

export const DEFAULT_LAB: LabId = 'derivative'

export function getMathLab(id: string | null): MathLab {
  return MATH_LABS.find((lab) => lab.id === id) ?? MATH_LABS[0]
}
