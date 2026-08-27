import { store, uid } from './store'
import { getEuclidProposition } from './euclid'
import type { Article, Problem, Solution } from './types'
import type { User } from './types'
import { assertCanModerateReview } from './permissions'

export type LabId =
  | 'derivative'
  | 'integral'
  | 'linear'
  | 'taylor'
  | 'probability'
  | 'ode'
  | 'plotter'

export type KnowledgeStatus = 'unseen' | 'learning' | 'weak' | 'mastered' | 'review'

export interface KnowledgeNode {
  id: string
  label: string
  description: string
  prerequisiteIds: string[]
  articleIds: string[]
  labIds: LabId[]
}

export interface LearningHint {
  title: string
  content: string
}

export interface ProblemLearningProfile {
  problemId: string
  summary: string
  prerequisiteIds: string[]
  articleIds: string[]
  labIds: LabId[]
  hints: LearningHint[]
  variantIds: string[]
}

export interface ArticleLearningProfile {
  articleId: string
  knowledgeIds: string[]
  problemIds: string[]
  labIds: LabId[]
  framingQuestion: string
  abstraction: {
    intuition: string
    rigorous: string
    extension: string
  }
  conditionChecks: string[]
  counterexample?: string
}

export interface LabMeta {
  id: LabId
  label: string
  description: string
  href: string
}

export type AttemptOutcome = 'struggled' | 'solved' | 'review' | 'failed' | 'passed'

export interface LearningAttempt {
  id: string
  problemId: string
  outcome: AttemptOutcome
  knowledgeIds: string[]
  createdAt: number
}

export interface KnowledgeGap {
  node: KnowledgeNode
  problemIds: string[]
  struggleCount: number
  confidence: 'emerging' | 'repeated'
}

export interface LearningSnapshot {
  attempts: LearningAttempt[]
  statusByKnowledge: Record<string, KnowledgeStatus>
  totalAttempts: number
  practicedProblemIds: string[]
  masteredCount: number
  weakCount: number
  learningCount: number
  reviewCount: number
}

export type ProofVerification = 'unreviewed' | 'community_checked' | 'editor_checked' | 'rigorous'

export interface ProofReview {
  solutionId: string
  status: ProofVerification
  reviewerId: string
  reviewerName: string
  checkedAt: number
  checks: string[]
}

const STATUS_KEY = 'mf_learning_knowledge_status_v1'
const ATTEMPTS_KEY = 'mf_learning_attempts_v1'
const PROOF_REVIEWS_KEY = 'mf_proof_reviews_v1'

const LABS: Record<LabId, Omit<LabMeta, 'href'>> = {
  derivative: {
    id: 'derivative',
    label: '割线与导数',
    description: '移动差分步长，观察割线怎样接近切线。',
  },
  integral: {
    id: 'integral',
    label: '黎曼和与积分',
    description: '细化分割，比较矩形和与曲边面积。',
  },
  linear: {
    id: 'linear',
    label: '线性变换实验室',
    description: '拖动矩阵元素，观察网格、面积与不变方向。',
  },
  taylor: {
    id: 'taylor',
    label: '泰勒逼近实验室',
    description: '调整展开阶数，看局部多项式如何贴近原函数。',
  },
  probability: {
    id: 'probability',
    label: '概率与大数实验',
    description: '改变样本量，观察随机波动与分布变化。',
  },
  ode: {
    id: 'ode',
    label: '微分方程方向场',
    description: '改变初始条件，比较方向场中的解轨线。',
  },
  plotter: {
    id: 'plotter',
    label: '函数图像实验室',
    description: '绘制函数图像，从图形检查直觉和边界。',
  },
}

function node(
  id: string,
  label: string,
  description: string,
  prerequisiteIds: string[] = [],
  articleIds: string[] = [],
  labIds: LabId[] = [],
): KnowledgeNode {
  return { id, label, description, prerequisiteIds, articleIds, labIds }
}

const KNOWLEDGE_GRAPH: Record<string, KnowledgeNode> = Object.fromEntries(
  [
    node('sequence-limit', '数列极限', '用严格定义描述数列最终靠近的值。', [], ['a3'], ['plotter']),
    node('monotonicity', '单调性与有界性', '判断递推数列能否收敛或发散到无穷。', ['sequence-limit'], ['a3']),
    node('asymptotic-order', '渐近阶与等价无穷小', '比较量的增长速度，识别应当选择的归一化尺度。', ['sequence-limit'], ['a1'], ['taylor']),
    node('stolz', 'Stolz 定理', '在分母严格递增且趋于无穷时，把商的极限转成差分比。', ['sequence-limit', 'monotonicity'], ['a12'], ['derivative']),
    node('derivative', '导数与差商', '从平均变化率的极限得到瞬时变化率。', ['sequence-limit'], ['a1'], ['derivative']),
    node('rolle', 'Rolle 定理', '连续、内部可导且端点相等的函数具有驻点。', ['derivative'], ['a13'], ['derivative']),
    node('mean-value', '拉格朗日中值定理', '在正确的连续与可导条件下，瞬时变化率可以等于整体平均变化率。', ['rolle', 'derivative'], ['a13'], ['derivative']),
    node('taylor', '泰勒展开与余项', '用多项式逼近函数，并检查余项确实趋于零。', ['derivative', 'asymptotic-order'], ['a1'], ['taylor']),
    node('inner-product', '内积与投影', '把长度、夹角和正交投影视作同一种结构。', [], ['a2'], ['linear']),
    node('cauchy-schwarz', 'Cauchy–Schwarz 不等式', '内积的绝对值不超过两个向量长度的乘积。', ['inner-product'], ['a2'], ['linear']),
    node('riemann-integral', '黎曼和与定积分', '通过分割、求和和极限定义曲边面积。', ['sequence-limit'], ['a6'], ['integral']),
    node('fundamental-theorem', '微积分基本定理', '在适当正则条件下把积分与导数联系起来。', ['derivative', 'riemann-integral'], ['a6'], ['integral', 'derivative']),
    node('positive-series', '正项级数', '把收敛性还原为部分和数列是否有界。', ['sequence-limit', 'monotonicity'], ['a3']),
    node('integral-test', '积分判别法', '对最终正且单调的函数比较级数与反常积分。', ['positive-series', 'riemann-integral'], ['a6'], ['integral']),
    node('linear-map', '线性映射', '理解向量空间上的保持加法和数乘的变换。', [], ['a4', 'a5'], ['linear']),
    node('dimension', '维数公式', '利用秩—零化度公式分解定义域的维数。', ['linear-map'], ['a5'], ['linear']),
    node('matrix-rank', '矩阵的秩', '矩阵的秩等于对应线性映射像空间的维数。', ['linear-map', 'dimension'], ['a4'], ['linear']),
    node('determinant', '行列式与有向面积', '把行列式解释为线性变换的有向体积伸缩率。', ['linear-map'], ['a4'], ['linear']),
    node('eigenvector', '特征值与不变方向', '寻找在线性变换下方向保持不变的向量。', ['linear-map'], ['a5'], ['linear']),
    node('ellipse', '椭圆与焦点定义', '由到两个焦点距离之和为常数得到椭圆。', [], ['a11'], ['plotter']),
    node('polar-coordinate', '极坐标与焦点弦', '以焦点为极点，将弦长表示成角度的函数。', ['ellipse'], ['a11'], ['plotter']),
    node('inclusion-exclusion', '容斥原理', '通过交替加减重叠部分消除重复计数。', []),
    node('permutation', '排列与不动点', '把排列视为有限集合的双射，并识别其不动点。', []),
    node('power-series', '幂级数与指数函数', '从幂级数识别指数函数和截断误差。', ['positive-series'], ['a1'], ['taylor']),
    node('modular-arithmetic', '同余与模运算', '用整除关系定义同余，并在模整数下计算。', [], ['a10']),
    node('multiplicative-inverse', '模逆元', '利用互素条件判断乘法逆元是否存在。', ['modular-arithmetic', 'gcd'], ['a10']),
    node('primality', '素数与整除', '利用素数的整除性质建立有限域或反证。', ['modular-arithmetic'], ['a10']),
    node('gcd', '最大公因数与裴蜀定理', '通过带余除法和整数组合刻画最大公因数。', [], ['a10']),
    node('probability', '概率空间与期望', '区分事件概率、随机变量和期望是否有限。', [], ['a7'], ['probability']),
    node('conditional-probability', '条件概率', '在非零概率事件上重新归一化概率。', ['probability'], ['a7'], ['probability']),
    node('random-walk', '对称随机游动', '分析由独立对称步长累积得到的位置过程。', ['probability'], ['a14', 'a7'], ['probability']),
    node('stopping-time', '首达时与停时', '区分几乎必然到达和首达时间具有有限期望。', ['random-walk'], ['a14'], ['probability']),
    node('martingale', '鞅与可选停止条件', '使用停止定理之前检查有界停时或可积性假设。', ['conditional-probability', 'stopping-time'], ['a14'], ['probability']),
    node('likelihood', '似然函数', '固定观测样本，把联合概率看作参数的函数。', ['probability'], ['a8'], ['probability']),
    node('optimization', '一元最优化', '检查驻点、端点和参数空间后判断全局最优。', ['derivative'], ['a8'], ['plotter']),
    node('differential-equation', '一阶微分方程', '将变化率规律解释成方向场和初值轨线。', ['derivative'], ['a9'], ['ode']),
    node('integrating-factor', '积分因子', '构造乘积求导形式，把线性方程化成直接积分。', ['differential-equation', 'fundamental-theorem'], ['a9'], ['ode']),
  ].map((entry) => [entry.id, entry]),
)

const PROBLEM_PROFILES: Record<string, ProblemLearningProfile> = {
  p1: {
    problemId: 'p1',
    summary: '把递推数列的增长尺度归一化，再用 Stolz 将商的极限转为差分比。',
    prerequisiteIds: ['sequence-limit', 'monotonicity', 'asymptotic-order', 'stolz'],
    articleIds: ['a12', 'a3', 'a1', 'a9'],
    labIds: ['derivative', 'ode'],
    hints: [
      { title: '提示一 · 先检查趋势', content: '由 $a_{n+1}-a_n=1/a_n>0$ 判断单调性；若存在有限极限，将其代入递推会得到什么？' },
      { title: '提示二 · 改换观察对象', content: '直接处理 $a_n/\\sqrt n$ 不够自然。试着展开 $a_{n+1}^2-a_n^2$。' },
      { title: '关键观察', content: '$a_{n+1}^2-a_n^2=2+1/a_n^2$，而 $a_n\\to+\\infty$，所以平方增量趋于 $2$。' },
      { title: '证明骨架', content: '验证分母 $n$ 严格递增且趋于无穷后，对 $a_n^2/n$ 使用 Stolz；最后利用 $a_n>0$ 开平方。完整细节见下方解法。' },
    ],
    variantIds: ['p7'],
  },
  p2: {
    problemId: 'p2',
    summary: '从边界条件恢复函数，再把积分形式的 Cauchy–Schwarz 用于导数。',
    prerequisiteIds: ['inner-product', 'cauchy-schwarz', 'riemann-integral', 'fundamental-theorem'],
    articleIds: ['a2', 'a6', 'a13'],
    labIds: ['linear', 'integral'],
    hints: [
      { title: '提示一 · 边界条件有什么用', content: '利用 $f(0)=0$ 和微积分基本定理，把 $f(x)$ 改写成 $\\int_0^x f^{\\prime}(t)\\,\\mathrm dt$。' },
      { title: '提示二 · 找到两条被配对的函数', content: '对函数 $1$ 与 $f^{\\prime}$ 在区间 $[0,x]$ 上使用 Cauchy–Schwarz。' },
      { title: '关键观察', content: '$f(x)^2\\le x\\int_0^x(f^{\\prime}(t))^2\\,\\mathrm dt\\le x\\int_0^1(f^{\\prime}(t))^2\\,\\mathrm dt$。' },
      { title: '证明骨架', content: '再对 $x\\in[0,1]$ 积分，利用 $\\int_0^1x\\,\\mathrm dx=1/2$。上界成立不等于已证明常数最优。' },
    ],
    variantIds: ['p7'],
  },
  p3: {
    problemId: 'p3',
    summary: '把矩阵乘积看成映射复合，用核空间与像空间的维数公式估计秩。',
    prerequisiteIds: ['linear-map', 'dimension', 'matrix-rank'],
    articleIds: ['a4', 'a5'],
    labIds: ['linear'],
    hints: [
      { title: '提示一 · 让矩阵变成映射', content: '把 $A$ 与 $B$ 看成 $\\mathbb R^n$ 上的线性映射；$AB$ 是先 $B$ 后 $A$ 的复合。' },
      { title: '提示二 · 缩小定义域', content: '考察限制映射 $A|_{\\operatorname{im}B}:\\operatorname{im}B\\to\\mathbb R^n$。' },
      { title: '关键观察', content: '该限制映射的像是 $\\operatorname{im}(AB)$，其核包含在 $\\ker A$ 中。' },
      { title: '证明骨架', content: '对限制映射使用秩—零化度公式，并代入 $\\dim\\ker A=n-r(A)$。' },
    ],
    variantIds: [],
  },
  p4: {
    problemId: 'p4',
    summary: '以焦点为极点表示弦长，追踪直线方向变化时的几何极值。',
    prerequisiteIds: ['ellipse', 'polar-coordinate'],
    articleIds: ['a11'],
    labIds: ['plotter'],
    hints: [
      { title: '提示一 · 换一个原点', content: '与其从标准坐标方程代入直线，不如考虑以给定焦点为极点的极坐标。' },
      { title: '提示二 · 利用相反方向', content: '焦点弦两端对应方向 $\\theta$ 和 $\\theta+\\pi$，分别写出两端到焦点的距离。' },
      { title: '关键观察', content: '把两段极径相加，弦长会化成只依赖 $\\cos^2\\theta$ 的表达式。' },
      { title: '证明骨架', content: '在 $0\\le\\cos^2\\theta\\le1$ 上判断表达式单调性，并检查主轴与垂直主轴方向。' },
    ],
    variantIds: [],
  },
  p5: {
    problemId: 'p5',
    summary: '对“至少一个不动点”使用容斥，再把交替和识别为指数函数的部分和。',
    prerequisiteIds: ['permutation', 'inclusion-exclusion', 'power-series'],
    articleIds: ['a1'],
    labIds: ['taylor'],
    hints: [
      { title: '提示一 · 先数反面', content: '设 $A_i$ 表示第 $i$ 个元素被固定，错位排列就是所有 $A_i$ 的补集交。' },
      { title: '提示二 · 对称性简化计数', content: '固定任意 $k$ 个指定元素以后，其余 $n-k$ 个元素有多少种排列？' },
      { title: '关键观察', content: '容斥得到 $D_n=n!\\sum_{k=0}^n(-1)^k/k!$。' },
      { title: '证明骨架', content: '把有限和认作 $e^{-1}$ 的泰勒部分和，并说明余项趋于零。' },
    ],
    variantIds: ['p7'],
  },
  p6: {
    problemId: 'p6',
    summary: '在素数模意义下配对乘法逆元，再用真因子反证 Wilson 定理的逆命题。',
    prerequisiteIds: ['modular-arithmetic', 'gcd', 'multiplicative-inverse', 'primality'],
    articleIds: ['a10'],
    labIds: ['plotter'],
    hints: [
      { title: '提示一 · 哪些数可以配对', content: '当 $p$ 是素数时，$1,\\ldots,p-1$ 都存在唯一的模 $p$ 乘法逆元。' },
      { title: '提示二 · 谁和自己配对', content: '解 $x^2\\equiv1\\pmod p$，找出不需要与不同元素配对的剩余类。' },
      { title: '关键观察', content: '除 $1$ 与 $-1$ 外，其他剩余类两两逆元配对，所以阶乘同余于 $-1$。' },
      { title: '证明骨架', content: '反过来，若存在真因子 $d\\mid p$，则 $d\\mid(p-1)!$；把假设同余式模 $d$ 得到矛盾。' },
    ],
    variantIds: [],
  },
  p7: {
    problemId: 'p7',
    summary: '检查对数表达式的定义域与最终单调性，再连续两次换元比较反常积分。',
    prerequisiteIds: ['sequence-limit', 'monotonicity', 'positive-series', 'riemann-integral', 'integral-test'],
    articleIds: ['a3', 'a6'],
    labIds: ['integral', 'plotter'],
    hints: [
      { title: '提示一 · 先确认题目有定义', content: '实数 $p$ 不一定是整数；要确保 $\\ln\\ln n>0$。有限个起始项不会改变级数敛散性。' },
      { title: '提示二 · 为什么能用积分判别', content: '确认对应函数从某一点起始终为正并单调递减，再与反常积分比较。' },
      { title: '关键观察', content: '依次令 $u=\\ln x$、$v=\\ln u$，积分化为 $\\int v^{-p}\\,\\mathrm dv$。' },
      { title: '证明骨架', content: '由 $p$-积分判别得到：$p>1$ 收敛，$0<p\\le1$ 发散。' },
    ],
    variantIds: ['p1', 'p2', 'p5'],
  },
  p8: {
    problemId: 'p8',
    summary: '区分“几乎必然到达”和“平均等待有限”，检查停止定理的可积性前提。',
    prerequisiteIds: ['probability', 'conditional-probability', 'random-walk', 'stopping-time', 'martingale'],
    articleIds: ['a14', 'a7'],
    labIds: ['probability'],
    hints: [
      { title: '提示一 · 命中概率不是期望', content: '一维对称随机游动几乎必然到达 $+N$，但这不能推出首达时间的期望有限。' },
      { title: '提示二 · 先设一道人造下边界', content: '引入 $-M$ 与 $N$ 两个吸收边界，先研究有限区间内的首次退出时间。' },
      { title: '关键观察', content: '从 $0$ 出发的对称游动在区间 $[-M,N]$ 内的期望退出时间等于 $MN$。' },
      { title: '证明骨架', content: '令 $M\\to\\infty$。截断退出时间单调趋向首次达到 $+N$ 的时间，由单调收敛得其期望为 $+\\infty$。' },
    ],
    variantIds: [],
  },
}

const ARTICLE_PROFILES: Record<string, ArticleLearningProfile> = {
  a1: {
    articleId: 'a1',
    knowledgeIds: ['derivative', 'asymptotic-order', 'taylor'],
    problemIds: ['p1', 'p5'],
    labIds: ['taylor', 'derivative'],
    framingQuestion: '如果不知道泰勒公式，只能利用一点附近的导数，怎样逐步构造最贴近原函数的多项式？',
    abstraction: {
      intuition: '先让直线在一点与曲线相切，再加入二次、三次修正。',
      rigorous: '逐阶匹配导数，并用余项表达式说明近似误差的控制条件。',
      extension: '推广到多元泰勒公式、解析函数与 Banach 空间中的 Fréchet 导数。',
    },
    conditionChecks: ['明确展开点与可导阶数。', '不能把有限阶可导误认为泰勒级数收敛到原函数。'],
    counterexample: '在 $x>0$ 取 $f(x)=e^{-1/x^2}$，并令 $f(0)=0$：原点各阶导数均为零，但函数不恒为零。',
  },
  a2: {
    articleId: 'a2',
    knowledgeIds: ['inner-product', 'cauchy-schwarz'],
    problemIds: ['p2'],
    labIds: ['linear'],
    framingQuestion: '为什么一个向量在另一方向上的投影长度，永远不会超过它自身的长度？',
    abstraction: {
      intuition: '把内积理解为一个向量在另一个方向上的有符号投影。',
      rigorous: '通过 $\\langle u-tv,u-tv\\rangle\\ge0$ 或正交投影证明不等式及等号条件。',
      extension: '推广至复内积空间、$L^2$ 空间和 Hilbert 空间。',
    },
    conditionChecks: ['先确认使用的是正定内积。', '分别讨论零向量与两向量线性相关时的等号情形。'],
    counterexample: '若把正定内积换成不定双线性型，Cauchy–Schwarz 的通常结论未必成立。',
  },
  a3: {
    articleId: 'a3',
    knowledgeIds: ['sequence-limit', 'monotonicity'],
    problemIds: ['p1', 'p7'],
    labIds: ['derivative', 'plotter'],
    framingQuestion: '“无限接近”听起来直观，但怎样用完全可核查的不等式表达它？',
    abstraction: {
      intuition: '先给出任意窄的目标误差带，再寻找进入误差带的充分条件。',
      rigorous: '固定量词顺序：对任意误差 $\\varepsilon>0$，存在阈值使后续项全部满足要求。',
      extension: '将同一思想推广到度量空间、拓扑空间以及一致收敛。',
    },
    conditionChecks: ['量词顺序不能互换。', '阈值可以依赖误差，但不能依赖已经越过阈值的项。'],
    counterexample: '$(-1)^n$ 始终有界，却无法最终进入任何半径小于 $1$ 的单一误差带。',
  },
  a4: {
    articleId: 'a4',
    knowledgeIds: ['linear-map', 'determinant', 'matrix-rank'],
    problemIds: ['p3'],
    labIds: ['linear'],
    framingQuestion: '什么样的函数能够只根据线性变换，准确描述面积或体积被拉伸了多少？',
    abstraction: {
      intuition: '观察单位方格在线性变换下变成的平行四边形。',
      rigorous: '由多重线性、交替性和单位归一化唯一刻画行列式。',
      extension: '引入外代数、体积形式与流形上的变量替换。',
    },
    conditionChecks: ['区分有向面积和普通面积。', '零行列式意味着降维，而不是简单的“面积很小”。'],
    counterexample: '反射变换保持普通面积，却会把有向面积符号反转。',
  },
  a5: {
    articleId: 'a5',
    knowledgeIds: ['linear-map', 'dimension', 'eigenvector'],
    problemIds: ['p3'],
    labIds: ['linear'],
    framingQuestion: '一个线性变换通常会改变方向，有没有向量经过变换后仍留在原来的直线上？',
    abstraction: {
      intuition: '在变形网格中寻找只被拉伸或反向、不发生转向的方向。',
      rigorous: '解 $(A-\\lambda I)v=0$，并区分代数重数与几何重数。',
      extension: '推广到谱定理、Jordan 标准形和无限维算子的谱。',
    },
    conditionChecks: ['特征向量必须非零。', '并非每个实矩阵都有实特征向量，也并非每个矩阵都可对角化。'],
    counterexample: '平面上的 $90^\\circ$ 旋转矩阵没有实特征方向。',
  },
  a6: {
    articleId: 'a6',
    knowledgeIds: ['riemann-integral', 'fundamental-theorem', 'integral-test'],
    problemIds: ['p2', 'p7'],
    labIds: ['integral', 'derivative'],
    framingQuestion: '直边矩形的面积容易计算，怎样从它们出发严格定义曲边图形的面积？',
    abstraction: {
      intuition: '把区间切成小段，用细矩形近似曲线下方的面积。',
      rigorous: '通过带标记分割的黎曼和定义积分，再检查微积分基本定理的条件。',
      extension: '推广到 Lebesgue 积分、测度论及流形上的积分。',
    },
    conditionChecks: ['分割网格直径必须趋于零。', '牛顿–莱布尼茨公式的使用需要对应的正则性条件。'],
    counterexample: '狄利克雷函数在每个子区间都同时取到 $0$ 和 $1$，其黎曼上下和不会收敛到同一值。',
  },
  a7: {
    articleId: 'a7',
    knowledgeIds: ['probability', 'conditional-probability'],
    problemIds: ['p8'],
    labIds: ['probability'],
    framingQuestion: '观察到结果之后，如何反过来重新分配不同原因的可能性？',
    abstraction: {
      intuition: '先画出原因与结果的联合频数，再只保留已经观察到的结果。',
      rigorous: '从 $P(A\\mid B)=P(A\\cap B)/P(B)$ 推出贝叶斯公式。',
      extension: '推广到连续密度、贝叶斯网络和先验—后验更新。',
    },
    conditionChecks: ['条件事件的概率必须大于零。', '后验概率依赖先验，不能只比较似然。'],
    counterexample: '即使检测准确率很高，在基础患病率极低时，阳性者的真实患病概率仍可能很低。',
  },
  a8: {
    articleId: 'a8',
    knowledgeIds: ['probability', 'likelihood', 'optimization'],
    problemIds: ['p8'],
    labIds: ['probability', 'plotter'],
    framingQuestion: '既然参数无法直接看到，能否选择最能解释当前观测样本的参数？',
    abstraction: {
      intuition: '把已经发生的数据视为证据，比较不同参数使这些数据出现的程度。',
      rigorous: '写出联合似然、对数似然和参数空间，并检查驻点与边界。',
      extension: '研究一致性、Fisher 信息、渐近正态性与正则化估计。',
    },
    conditionChecks: ['似然不是参数的概率分布。', '驻点不自动保证全局最大，支持集可能依赖参数。'],
    counterexample: '均匀分布 $U(0,\\theta)$ 的最大似然估计出现在参数空间边界，不能单靠求导找到。',
  },
  a9: {
    articleId: 'a9',
    knowledgeIds: ['derivative', 'differential-equation', 'integrating-factor'],
    problemIds: ['p1'],
    labIds: ['ode', 'derivative'],
    framingQuestion: '面对 $y^{\\prime}+p(x)y=q(x)$，怎样把左边改写成某个乘积的一次导数？',
    abstraction: {
      intuition: '为方程乘上一个尚未确定的函数，让乘积求导法则倒过来成立。',
      rigorous: '令 $\\mu^{\\prime}=p\\mu$，得到 $\\mu=e^{\\int p}$，并在定义区间上积分。',
      extension: '推广到线性方程组、基本解矩阵和常数变易法。',
    },
    conditionChecks: ['系数函数需要在所讨论区间满足相应连续条件。', '积分常数和初值都必须回代验证。'],
    counterexample: '若系数在区间内部出现奇点，就不能未经检查地把两侧解合并为同一个全局解。',
  },
  a10: {
    articleId: 'a10',
    knowledgeIds: ['gcd', 'modular-arithmetic', 'multiplicative-inverse'],
    problemIds: ['p6'],
    labIds: ['plotter'],
    framingQuestion: '为什么反复做带余除法，不仅能找到最大公因数，还能把它写成两个整数的线性组合？',
    abstraction: {
      intuition: '每次用余数替代较大的数，共同约数却没有变化。',
      rigorous: '证明 $\\gcd(a,b)=\\gcd(b,a\\bmod b)$，再倒回替换得到裴蜀系数。',
      extension: '推广到欧几里得整环、多项式环和模逆元算法。',
    },
    conditionChecks: ['带余除法的除数必须非零。', '模逆元存在当且仅当对应两个整数互素。'],
    counterexample: '$2$ 在模 $4$ 意义下没有乘法逆元，因为 $\\gcd(2,4)\\ne1$。',
  },
  a11: {
    articleId: 'a11',
    knowledgeIds: ['ellipse', 'polar-coordinate'],
    problemIds: ['p4'],
    labIds: ['plotter'],
    framingQuestion: '椭圆、抛物线和双曲线能否从同一个几何定义中同时长出来？',
    abstraction: {
      intuition: '比较一个点到固定焦点与到固定准线的距离。',
      rigorous: '从焦点—准线比值出发，推导极坐标方程并按离心率分类。',
      extension: '联系射影几何、二次型分类与天体轨道的圆锥曲线。',
    },
    conditionChecks: ['距离非负，准线选择会影响坐标表达但不改变几何类型。', '分别检查 $e<1$、$e=1$ 与 $e>1$。'],
    counterexample: '仅看方程形式而忽略二次型判别式，可能把旋转坐标下的同一条曲线误判为不同类型。',
  },
  a12: {
    articleId: 'a12',
    knowledgeIds: ['sequence-limit', 'monotonicity', 'asymptotic-order', 'stolz'],
    problemIds: ['p1', 'p7'],
    labIds: ['derivative', 'plotter'],
    framingQuestion: '为什么每一步的离散增量之比最终稳定下来，就能控制整个数列商的极限？',
    abstraction: {
      intuition: '把总体比值看成许多局部增量比的加权平均。',
      rigorous: '利用分母严格递增、趋于无穷和尾部增量估计，证明 Stolz–Cesàro 定理。',
      extension: '讨论 Cesàro 平均、Toeplitz 引理以及与洛必达法则的离散对应。',
    },
    conditionChecks: ['分母必须严格递增且趋于正无穷。', '先证明差分比极限存在，再讨论有限个初始项的影响。'],
    counterexample: '若分母不趋于无穷，初始项不会自动被归一化消去，差分比的极限不足以决定原数列商。',
  },
  a13: {
    articleId: 'a13',
    knowledgeIds: ['sequence-limit', 'derivative', 'rolle', 'mean-value'],
    problemIds: ['p1', 'p2'],
    labIds: ['derivative', 'plotter'],
    framingQuestion: '只知道两个端点，能否证明中间某点的瞬时变化率恰好等于整体平均变化率？',
    abstraction: {
      intuition: '画出连接两个端点的割线，寻找与它平行的切线。',
      rigorous: '构造“原函数减去割线”的辅助函数，利用端点相等和 Rolle 定理得到结论。',
      extension: '推广到柯西中值定理、积分中值定理以及 Banach 空间中的均值估计。',
    },
    conditionChecks: ['函数必须在闭区间上连续。', '函数必须在开区间内可导；端点可导不是必要条件。'],
    counterexample: '$f(x)=|x|$ 在 $[-1,1]$ 上连续，但在 $0$ 不可导；平均斜率为 $0$，却没有导数等于 $0$ 的内部点。',
  },
  a14: {
    articleId: 'a14',
    knowledgeIds: ['probability', 'random-walk', 'stopping-time', 'martingale'],
    problemIds: ['p8'],
    labIds: ['probability'],
    framingQuestion: '既然一维对称随机游动几乎必然达到目标，为什么平均等待时间仍然可能是无穷？',
    abstraction: {
      intuition: '大多数轨线很快返回，但极少数漫长游走足以把平均等待时间拖到无穷。',
      rigorous: '引入上下吸收边界，求得有限区间期望退出时间 $MN$，再用单调收敛令下边界远去。',
      extension: '联系更新理论、零常返马尔可夫链和可选停止定理的可积性条件。',
    },
    conditionChecks: ['几乎必然有限不等于期望有限。', '对无界停时使用可选停止定理前，必须单独验证其适用条件。'],
    counterexample: '对称随机游动首次达到 $+1$ 的时间几乎必然有限，但它的期望等于 $+\\infty$。',
  },
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Learning aids remain optional when browser storage is unavailable or full.
  }
}

function customNodeId(label: string): string {
  return `custom:${label}`
}

function relatedArticleIds(problem: Problem): string[] {
  const text = `${problem.title} ${problem.tags.join(' ')}`.toLowerCase()
  return store.articles()
    .filter((article) => {
      if (article.topic === problem.chapter) return true
      return problem.tags.some((tag) => article.title.toLowerCase().includes(tag.toLowerCase())) || text.includes(article.topic.toLowerCase())
    })
    .slice(0, 3)
    .map((article) => article.id)
}

function relatedLabs(problem: Problem): LabId[] {
  const text = `${problem.chapter} ${problem.title} ${problem.tags.join(' ')}`
  if (/概率|统计|随机|似然/.test(text)) return ['probability']
  if (/矩阵|代数|线性|特征|行列/.test(text)) return ['linear']
  if (/微分方程/.test(text)) return ['ode']
  if (/积分|级数/.test(text)) return ['integral']
  if (/泰勒|展开/.test(text)) return ['taylor']
  if (/导数|微分|极限/.test(text)) return ['derivative']
  return ['plotter']
}

export function getProblemLearningProfile(problem: Problem): ProblemLearningProfile {
  const known = PROBLEM_PROFILES[problem.id]
  if (known) return known

  return {
    problemId: problem.id,
    summary: problem.tags.length > 0
      ? `围绕${problem.tags.slice(0, 3).join('、')}，从定义与适用条件出发建立解题路径。`
      : `从${problem.chapter}的基本定义、适用条件与关键构造出发分析这道题。`,
    prerequisiteIds: problem.tags.map(customNodeId),
    articleIds: relatedArticleIds(problem),
    labIds: relatedLabs(problem),
    hints: [
      { title: '提示一 · 重述已知条件', content: '把题目里的定义、边界条件和待证结论分别列出来。' },
      { title: '提示二 · 核对定理前提', content: '先判断打算使用的定理是否满足全部适用条件。' },
      { title: '关键观察', content: '尝试构造中间量、特殊情形或反例，缩小真正需要证明的步骤。' },
    ],
    variantIds: store.problems()
      .filter((candidate) => candidate.id !== problem.id && candidate.tags.some((tag) => problem.tags.includes(tag)))
      .slice(0, 3)
      .map((candidate) => candidate.id),
  }
}

export function getArticleLearningProfile(article: Article): ArticleLearningProfile {
  const known = ARTICLE_PROFILES[article.id]
  if (known) return known

  const euclid = getEuclidProposition(article.id)
  if (euclid) {
    const isProposition = euclid.kind === 'proposition'
    const foundations = euclid.dependencies.length > 0
      ? `只使用原文实际引用的 ${euclid.dependencies.length} 条前置定义、公设、公理或命题，并逐段核对引用是否足以支持当前结论。`
      : isProposition
        ? '逐段辨认构造、已知条件与结论；原文没有明确列出的前提不能被假定已经完成证明。'
        : '分清定义、明确采用的公设与需要另行证明的命题，不把演绎起点伪装成定理。'

    const conditionChecks = euclid.sourceMissing
      ? ['官方底本只保留了空记录；没有可靠正文时，不补写或假装恢复原始定义。']
      : [
          isProposition
            ? '区分作图中给定的条件、已经引用的结论，以及图形看起来成立但仍需要说明的性质。'
            : '先核对这条内容在体系中属于定义、公设还是公理，再判断它能被如何引用。',
          '历史原文的论证与现代公理体系并不完全一致；出现隐含前提时，需要明确指出。',
        ]

    if (euclid.id === 'euclid-1-1') {
      conditionChecks.push('两圆交点的存在并未由欧几里得列出的基础公设单独保证；现代严密证明需要补充连续性或交点公理。')
    }
    if (euclid.id === 'euclid-1-47') {
      conditionChecks.push('勾股结论以直角三角形为前提；用相似三角形或坐标法给出替代证明时，也必须分别交代所依赖的现代结果。')
    }

    return {
      articleId: article.id,
      knowledgeIds: [],
      problemIds: [],
      labIds: [],
      framingQuestion: euclid.sourceMissing
        ? '权威底本为何保留了这一条编号，却没有留下可以核对的定义正文？'
        : isProposition
          ? `不把“${euclid.title}”当作已知结论，只从定义、作图公设与此前已经建立的结果出发，怎样一步一步得到它？`
          : `为什么“${euclid.title}”需要被明确写入演绎体系，它又为后续哪些命题提供基础？`,
      abstraction: {
        intuition: euclid.sourceMissing
          ? '首先辨认来源缺口，不把版本中的空记录当作已经复原的数学内容。'
          : `先拖动对应图形，辨认“${euclid.title}”描述的对象、保持不变的关系与真正需要解释的问题。`,
        rigorous: foundations,
        extension: isProposition
          ? '沿着双向证明依赖图回溯前置结论，再检查后来哪些命题继续建立在这一结论之上。'
          : '追踪这条演绎起点在后续证明中的实际使用，并比较古典几何与现代公理化表述。',
      },
      conditionChecks,
    }
  }

  const relatedProblems = store.problems().filter((problem) => problem.chapter === article.topic)
  const knowledgeIds = [...new Set(relatedProblems.flatMap((problem) => getProblemLearningProfile(problem).prerequisiteIds))].slice(0, 4)
  const labIds = [...new Set(relatedProblems.flatMap((problem) => getProblemLearningProfile(problem).labIds))].slice(0, 2)

  return {
    articleId: article.id,
    knowledgeIds,
    problemIds: relatedProblems.slice(0, 3).map((problem) => problem.id),
    labIds: labIds.length > 0 ? labIds : ['plotter'],
    framingQuestion: '如果暂时忘记现成结论，我们能从哪些定义与直觉重新把它推导出来？',
    abstraction: {
      intuition: article.summary,
      rigorous: '逐条写清定义、定理假设和每一步逻辑推导。',
      extension: '思考哪些条件可以削弱，以及结论能否推广到更一般的结构。',
    },
    conditionChecks: ['先确认所有对象定义良好。', '单独核对关键定理的适用条件与边界情况。'],
  }
}

export function getKnowledgeNode(id: string): KnowledgeNode | undefined {
  if (id.startsWith('custom:')) {
    const label = id.slice('custom:'.length)
    return node(id, label, `回到“${label}”的定义、例子与适用条件。`)
  }
  return KNOWLEDGE_GRAPH[id]
}

export function getKnowledgeNodes(ids: readonly string[]): KnowledgeNode[] {
  return ids.map(getKnowledgeNode).filter((entry): entry is KnowledgeNode => entry !== undefined)
}

export function getLabMeta(id: LabId): LabMeta {
  return { ...LABS[id], href: `/viz?lab=${id}` }
}

export function getKnowledgeStatus(id: string): KnowledgeStatus {
  return readJson<Record<string, KnowledgeStatus>>(STATUS_KEY, {})[id] ?? 'unseen'
}

export function setKnowledgeStatus(id: string, status: KnowledgeStatus): void {
  const statuses = readJson<Record<string, KnowledgeStatus>>(STATUS_KEY, {})
  statuses[id] = status
  writeJson(STATUS_KEY, statuses)
}

export function recordProblemAttempt(problemId: string, outcome: AttemptOutcome): LearningAttempt | undefined {
  const problem = store.problems().find((candidate) => candidate.id === problemId)
  if (!problem) return undefined

  const attempt: LearningAttempt = {
    id: uid(),
    problemId,
    outcome,
    knowledgeIds: getProblemLearningProfile(problem).prerequisiteIds,
    createdAt: Date.now(),
  }
  const attempts = readJson<LearningAttempt[]>(ATTEMPTS_KEY, [])
  writeJson(ATTEMPTS_KEY, [...attempts, attempt].slice(-300))

  for (const knowledgeId of attempt.knowledgeIds) {
    const current = getKnowledgeStatus(knowledgeId)
    if (outcome === 'struggled' || outcome === 'failed') {
      const relatedProblems = new Set(
        [...attempts, attempt]
          .filter((entry) => (entry.outcome === 'struggled' || entry.outcome === 'failed') && entry.knowledgeIds.includes(knowledgeId))
          .map((entry) => entry.problemId),
      )
      if (relatedProblems.size >= 2) setKnowledgeStatus(knowledgeId, 'weak')
      else if (current === 'unseen') setKnowledgeStatus(knowledgeId, 'learning')
    } else if (outcome === 'solved' || outcome === 'passed') {
      if (current === 'weak') setKnowledgeStatus(knowledgeId, 'review')
      else if (current === 'unseen') setKnowledgeStatus(knowledgeId, 'learning')
    } else if (current === 'unseen') {
      setKnowledgeStatus(knowledgeId, 'learning')
    }
  }

  return attempt
}

export function diagnoseKnowledgeGaps(): KnowledgeGap[] {
  const attempts = readJson<LearningAttempt[]>(ATTEMPTS_KEY, [])
  const grouped = new Map<string, { count: number; problems: Set<string> }>()

  for (const attempt of attempts) {
    if (attempt.outcome !== 'struggled' && attempt.outcome !== 'failed') continue
    for (const knowledgeId of attempt.knowledgeIds) {
      const entry = grouped.get(knowledgeId) ?? { count: 0, problems: new Set<string>() }
      entry.count += 1
      entry.problems.add(attempt.problemId)
      grouped.set(knowledgeId, entry)
    }
  }

  return [...grouped.entries()]
    .map(([knowledgeId, entry]) => {
      const knowledge = getKnowledgeNode(knowledgeId)
      if (!knowledge) return undefined
      return {
        node: knowledge,
        problemIds: [...entry.problems],
        struggleCount: entry.count,
        confidence: entry.problems.size >= 2 ? 'repeated' : 'emerging',
      } satisfies KnowledgeGap
    })
    .filter((entry): entry is KnowledgeGap => entry !== undefined)
    .sort((left, right) => right.problemIds.length - left.problemIds.length || right.struggleCount - left.struggleCount)
}

export function getLearningSnapshot(): LearningSnapshot {
  const attempts = readJson<LearningAttempt[]>(ATTEMPTS_KEY, [])
  const statusByKnowledge = readJson<Record<string, KnowledgeStatus>>(STATUS_KEY, {})
  const statuses = Object.values(statusByKnowledge)

  return {
    attempts,
    statusByKnowledge,
    totalAttempts: attempts.length,
    practicedProblemIds: [...new Set(attempts.map((attempt) => attempt.problemId))],
    masteredCount: statuses.filter((status) => status === 'mastered').length,
    weakCount: statuses.filter((status) => status === 'weak').length,
    learningCount: statuses.filter((status) => status === 'learning').length,
    reviewCount: statuses.filter((status) => status === 'review').length,
  }
}

export function getProofReview(solutionId: string): ProofReview | undefined {
  return readJson<Record<string, ProofReview>>(PROOF_REVIEWS_KEY, {})[solutionId]
}

export function recordProofReview(review: ProofReview, actor: Pick<User, 'id' | 'isAdmin'> | null): void {
  assertCanModerateReview(actor)
  const reviews = readJson<Record<string, ProofReview>>(PROOF_REVIEWS_KEY, {})
  reviews[review.solutionId] = review
  writeJson(PROOF_REVIEWS_KEY, reviews)
}

export function describeSolutionApproach(solution: Solution): string {
  const content = solution.content
  if (/连续化启发|另一种思路/.test(content)) return '连续化启发'
  if (/反证|矛盾/.test(content) && /逆命题|充分性/.test(content)) return '逆元配对与反证'
  if (/Cauchy|内积|投影/.test(content)) return '积分与内积法'
  if (/Stolz/.test(content)) return '离散差商与 Stolz'
  if (/几何|图形/.test(content)) return '几何思路'
  if (/构造/.test(content)) return '构造法'
  return '独立推导'
}
