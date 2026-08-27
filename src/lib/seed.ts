import type { Article, Comment, Paper, Problem, Solution } from './types'

export const seedProblems: Problem[] = [
  {
    id: 'p1',
    title: '极限：Stolz 定理的应用',
    statement:
      '设数列 $\\{a_n\\}$ 满足 $a_1 = 1$，$a_{n+1} = a_n + \\dfrac{1}{a_n}$。\n\n**求：** $\\displaystyle\\lim_{n \\to \\infty} \\dfrac{a_n}{\\sqrt{n}}$。\n\n> 提示：先证明 $a_n \\to +\\infty$，再考虑 $a_n^2$ 的递推。',
    chapter: '极限',
    difficulty: '提高',
    competition: '全国大学生数学竞赛',
    tags: ['极限', 'Stolz 定理', '递推数列'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 9,
    authorId: 'admin',
  },
  {
    id: 'p2',
    title: '积分不等式：Cauchy–Schwarz 的妙用',
    statement:
      '设 $f(x)$ 在 $[0,1]$ 上连续可微，$f(0) = 0$。\n\n**证明：**\n$$\\int_0^1 f^2(x)\\,\\mathrm{d}x \\le \\frac{1}{2}\\int_0^1 \\bigl(f\'(x)\\bigr)^2\\,\\mathrm{d}x$$',
    chapter: '函数',
    difficulty: '冲刺',
    competition: '全国大学生数学竞赛',
    tags: ['积分不等式', 'Cauchy–Schwarz', '微积分基本定理'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 8,
    authorId: 'admin',
  },
  {
    id: 'p3',
    title: '矩阵：秩的分解不等式',
    statement:
      '设 $A$、$B$ 均为 $n$ 阶实方阵。\n\n**证明：**\n$$r(AB) \\ge r(A) + r(B) - n$$\n\n其中 $r(\\cdot)$ 表示矩阵的秩。',
    chapter: '代数',
    difficulty: '基础',
    competition: '考研数学',
    tags: ['矩阵的秩', 'Sylvester 不等式'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 7,
    authorId: 'admin',
  },
  {
    id: 'p4',
    title: '几何：椭圆焦点弦的最值',
    statement:
      '已知椭圆 $\\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2} = 1\\ (a > b > 0)$，过左焦点 $F_1$ 的直线交椭圆于 $P, Q$ 两点。\n\n**求：** 当直线斜率变化时，$|PQ|$ 的最大值与最小值。',
    chapter: '解析几何',
    difficulty: '基础',
    competition: '各省赛区预赛',
    tags: ['椭圆', '焦点弦', '极坐标'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 6,
    authorId: 'admin',
  },
  {
    id: 'p5',
    title: '组合：错位排列的计数',
    statement:
      '求 $n$ 个元素的错位排列数 $D_n$（即没有不动点的置换数）的显式公式，并证明：\n$$\\lim_{n\\to\\infty} \\frac{D_n}{n!} = \\frac{1}{e}$$',
    chapter: '组合数学',
    difficulty: '提高',
    competition: '全国大学生数学竞赛',
    tags: ['容斥原理', '错位排列', '生成函数'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 5,
    authorId: 'admin',
  },
  {
    id: 'p6',
    title: '数论：Wilson 定理及其逆命题',
    statement:
      '设 $p$ 为大于 $1$ 的正整数。\n\n**证明：** $p$ 为素数当且仅当\n$$(p-1)! \\equiv -1 \\pmod{p}$$',
    chapter: '数论',
    difficulty: '入门',
    competition: '丘成桐大学生数学竞赛',
    tags: ['Wilson 定理', '同余', '素数判定'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 4,
    authorId: 'admin',
  },
  {
    id: 'p7',
    title: '级数：正项级数敛散性判别',
    statement:
      '判别级数 $\\displaystyle\\sum_{n=3}^{\\infty} \\frac{1}{n \\ln n \\,(\\ln \\ln n)^p}$ 的敛散性（$p > 0$），并给出完整的积分判别论证。',
    chapter: '数列',
    difficulty: '入门',
    competition: '考研数学',
    tags: ['级数', '积分判别法'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 3,
    authorId: 'admin',
  },
  {
    id: 'p8',
    title: '概率：随机游动的首达时',
    statement:
      '质点从原点出发做一维对称随机游动，每步以概率 $\\frac12$ 向左或向右移动 $1$ 个单位。\n\n**求：** 首次到达 $+N$ 的期望步数，并判断它是否有限（设出发点为 $0$，$N$ 为正整数，且左侧没有吸收边界）。',
    chapter: '概率统计',
    difficulty: '冲刺',
    competition: '数学建模竞赛',
    tags: ['随机游动', '首达时', '鞅'],
    attachments: [],
    createdAt: Date.now() - 86400000 * 2,
    authorId: 'admin',
  },
]

export const seedSolutions: Solution[] = [
  {
    id: 's1',
    problemId: 'p1',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    content:
      '**第一步：证 $a_n \\to +\\infty$。**\n\n显然 $a_n$ 单调递增。若 $a_n$ 有上界，则极限 $L$ 满足 $L = L + \\frac1L$，矛盾。故 $a_n \\to +\\infty$。\n\n**第二步：考察平方的递推。**\n\n$$a_{n+1}^2 = a_n^2 + 2 + \\frac{1}{a_n^2}$$\n\n于是 $a_{n+1}^2 - a_n^2 \\to 2$（因为 $\\frac{1}{a_n^2} \\to 0$）。\n\n**第三步：应用 Stolz 定理。**\n\n对 $\\dfrac{a_n^2}{n}$ 用 Stolz 定理：\n$$\\lim_{n\\to\\infty} \\frac{a_n^2}{n} = \\lim_{n\\to\\infty} (a_{n+1}^2 - a_n^2) = 2$$\n\n因此\n$$\\boxed{\\lim_{n\\to\\infty} \\frac{a_n}{\\sqrt{n}} = \\sqrt{2}}$$',
    attachments: [],
    createdAt: Date.now() - 86400000 * 8,
    likes: 12,
  },
  {
    id: 's2',
    problemId: 'p1',
    authorId: 'u_demo',
    authorName: '竞赛汪',
    content:
      '另一种思路（连续化启发）：设 $a_n \\approx f(n)$，则 $f\' = \\frac1f$，解得 $f = \\sqrt{2x + C}$。\n\n这提示 $a_n \\sim \\sqrt{2n}$，再用 Stolz 严格化即可（见官方解法第二步）。\n\n**经验：** 递推 $a_{n+1} - a_n = g(a_n)$ 且 $g \\to 0$ 时，先猜 $a_n$ 的渐近主项，再用 $a_n^2$ 或 $a_n^k$ 构造望远镜。',
    attachments: [],
    createdAt: Date.now() - 86400000 * 7,
    likes: 8,
  },
  {
    id: 's3',
    problemId: 'p2',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    content:
      '由 $f(0)=0$ 与牛顿–莱布尼茨公式：\n$$f(x) = \\int_0^x f\'(t)\\,\\mathrm{d}t$$\n\n对右端用 Cauchy–Schwarz：\n$$f^2(x) \\le \\left(\\int_0^x 1^2\\,\\mathrm{d}t\\right)\\left(\\int_0^x (f\'(t))^2\\,\\mathrm{d}t\\right) = x \\int_0^x (f\'(t))^2\\,\\mathrm{d}t \\le x \\int_0^1 (f\')^2$$\n\n两边在 $[0,1]$ 上积分：\n$$\\int_0^1 f^2(x)\\,\\mathrm{d}x \\le \\left(\\int_0^1 x\\,\\mathrm{d}x\\right)\\left(\\int_0^1 (f\')^2\\right) = \\frac{1}{2}\\int_0^1 (f\')^2$$\n\n**审计备注：** 常数 $\\tfrac12$ 来自上述估计，并非由 $f(x)=x$ 取到；代入该函数时，两边分别为 $\\tfrac13$ 和 $\\tfrac12$。除零函数外，不能沿这条估计链取得等号。',
    attachments: [],
    createdAt: Date.now() - 86400000 * 6,
    likes: 15,
  },
  {
    id: 's4',
    problemId: 'p6',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    content:
      '**充分性（$p$ 素 $\\Rightarrow$ 同余成立）：** 模 $p$ 意义下，$1,2,\\dots,p-1$ 构成乘法群。除 $\\pm 1$ 外每个元素与其逆元配对相消，故\n$$(p-1)! \\equiv 1 \\cdot (p-1) \\equiv -1 \\pmod{p}$$\n\n**必要性（逆命题）：** 若 $p$ 为合数，取真因子 $d \\mid p$，$1 < d < p$。由假设 $(p-1)! \\equiv -1 \\pmod{p}$ 得 $(p-1)! \\equiv -1 \\pmod{d}$；但 $d \\le p-1$ 蕴含 $d \\mid (p-1)!$，即 $(p-1)! \\equiv 0 \\pmod{d}$，矛盾。\n\n故 $p$ 必为素数。$\\blacksquare$',
    attachments: [],
    createdAt: Date.now() - 86400000 * 3,
    likes: 6,
  },
]

export const seedComments: Comment[] = [
  {
    id: 'c1',
    targetId: 'p1',
    authorId: 'u_demo',
    authorName: '竞赛汪',
    content: '这题是经典 Stolz 应用，预赛考过类似变式，注意要先验证 $a_n \\to \\infty$ 的前提。',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'c2',
    targetId: 's3',
    authorId: 'u_demo',
    authorName: '竞赛汪',
    content: '这里要检查等号：取 $f=x$ 时，左边是 $\\tfrac13$，右边是 $\\tfrac12$，并不相等，因此不能用这个例子断言常数最优。',
    createdAt: Date.now() - 86400000 * 5,
  },
]

const seedArticlesBase: Article[] = [
  {
    id: 'a1',
    title: '泰勒公式：从以直代曲到一般逼近',
    summary: '不背公式，从如何用一个多项式逼近一个函数这一朴素问题出发，完整推出泰勒公式与余项。',
    topic: '导数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 6,
    content: `## 1. 起点：我们想干什么

微积分的核心思想只有一句话：**用简单的函数逼近复杂的函数**。最简单的函数是多项式，它只需要加减乘。

于是问题变成：给定 $f$ 在 $x_0$ 附近的信息，找一个多项式 $P(x)$，使得两者在 $x_0$ 附近尽可能像。讨论 $n$ 阶拉格朗日余项时，下面始终假设 $f$ 在相关闭区间上具有连续的 $n+1$ 阶导数；仅在一点存在若干阶导数，并不足以直接保证这种余项公式。

## 2. 一阶：切线，即以直代曲

像的最低要求是：函数值相同，变化率也相同，即

$$
P_1(x_0) = f(x_0), \\qquad P_1'(x_0) = f'(x_0).
$$

满足这两条的一次多项式是唯一的：

$$
P_1(x) = f(x_0) + f'(x_0)\\,(x - x_0).
$$

这就是切线。误差有多大？当 $f$ 在相关区间上二阶连续可导时，由柯西中值定理导出的拉格朗日余项可知，存在 $\\xi$ 介于 $x_0$ 与 $x$ 之间，使得

$$
f(x) - P_1(x) = \\frac{f''(\\xi)}{2}\\,(x-x_0)^2.
$$

由于该区间上的 $f''$ 有界，误差至多为 $O((x-x_0)^2)$。这是一切后续推理的原型。

## 3. 推广：匹配更多阶导数

一阶匹配了一阶导数，误差降了一阶。自然的猜想是：**匹配到 $n$ 阶导数，误差就是 $n+1$ 阶小量**。

设

$$
P_n(x) = \\sum_{k=0}^{n} c_k\\, (x - x_0)^k,
$$

并要求

$$
P_n^{(k)}(x_0) = f^{(k)}(x_0), \\qquad k = 0, 1, \\dots, n.
$$

对 $P_n$ 求 $k$ 阶导数后代入 $x_0$，可得

$$
P_n^{(k)}(x_0) = k!\\, c_k
\\quad\\Longrightarrow\\quad
c_k = \\frac{f^{(k)}(x_0)}{k!}.
$$

于是系数被唯一确定：

$$
\\boxed{\\,P_n(x) = \\sum_{k=0}^{n} \\frac{f^{(k)}(x_0)}{k!}\\,(x - x_0)^k\\,}
$$

注意：系数不是被规定的，而是被「逐阶匹配导数」这一要求唯一决定的。

## 4. 余项：误差的精确刻画

令 $R_n(x) = f(x) - P_n(x)$。反复应用柯西中值定理，可得拉格朗日余项

$$
R_n(x) = \\frac{f^{(n+1)}(\\xi)}{(n+1)!}\\,(x - x_0)^{n+1},
\\qquad \\xi \\text{ 介于 } x_0 \\text{ 与 } x \\text{ 之间}.
$$

## 5. 回看：第一性原理链条

1. **目的**：用多项式逼近函数；
2. **手段**：逐阶匹配导数；
3. **结果**：系数被唯一确定为 $\\dfrac{f^{(k)}(x_0)}{k!}$；
4. **代价**：误差由下一阶导数控制。

泰勒公式不是天降的公式，而是「逼近」这一朴素目的的必然产物。$\\blacksquare$`,
  },
  {
    id: 'a2',
    title: '柯西不等式：从内积的投影谈起',
    summary: '为什么内积的绝对值不超过模长之积？从投影不长于原向量这一几何事实推出代数形式。',
    topic: '代数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 4,
    content: `## 1. 几何直觉：投影不会变长

平面上，向量 $\\mathbf{u}$ 在 $\\mathbf{v}$ 方向上的投影长度是 $\\|\\mathbf{u}\\| \\, |\\cos\\theta|$，它当然不超过 $\\|\\mathbf{u}\\|$ 本身。

先单独处理 $\\mathbf{v}=\\mathbf0$：此时内积和右侧模长乘积都为零，不等式直接取等。以下假设 $\\mathbf{v}\\ne\\mathbf0$，这样除以 $\\langle\\mathbf{v},\\mathbf{v}\\rangle$ 才有意义。把投影写仔细一点，$\\mathbf{u}$ 在 $\\mathbf{v}$ 方向的投影系数为

$$
t = \\frac{\\langle \\mathbf{u}, \\mathbf{v} \\rangle}{\\langle \\mathbf{v}, \\mathbf{v} \\rangle}.
$$

「减去投影后剩下的分量长度非负」，即

$$
\\|\\mathbf{u} - t\\mathbf{v}\\|^2 \\ge 0.
$$

## 2. 展开：不等式自动现身

由内积的双线性性展开：

$$
0 \\le \\langle \\mathbf{u} - t\\mathbf{v},\\ \\mathbf{u} - t\\mathbf{v} \\rangle
= \\|\\mathbf{u}\\|^2 - 2t\\,\\langle \\mathbf{u},\\mathbf{v} \\rangle + t^2\\,\\|\\mathbf{v}\\|^2.
$$

代入 $t = \\dfrac{\\langle \\mathbf{u},\\mathbf{v} \\rangle}{\\|\\mathbf{v}\\|^2}$，整理得

$$
0 \\le \\|\\mathbf{u}\\|^2 - \\frac{\\langle \\mathbf{u},\\mathbf{v} \\rangle^2}{\\|\\mathbf{v}\\|^2}.
$$

即柯西–施瓦茨不等式：

$$
\\boxed{\\,\\langle \\mathbf{u}, \\mathbf{v} \\rangle^2 \\le \\|\\mathbf{u}\\|^2 \\, \\|\\mathbf{v}\\|^2\\,}
$$

当 $\\mathbf{v}\\ne\\mathbf0$ 时，等号成立当且仅当 $\\mathbf{u}=t\\,\\mathbf{v}$，此时剩余分量恰好为零；再合并零向量情形，完整结论是：等号成立当且仅当两向量线性相关。

## 3. 代数形式

对实数 $a_1, \\dots, a_n$ 与 $b_1, \\dots, b_n$，取标准内积

$$
\\langle \\mathbf{a}, \\mathbf{b} \\rangle = \\sum_{i=1}^{n} a_i b_i,
$$

即得

$$
\\left(\\sum_{i=1}^{n} a_i b_i\\right)^{\\!2}
\\le \\left(\\sum_{i=1}^{n} a_i^2\\right)\\left(\\sum_{i=1}^{n} b_i^2\\right).
$$

## 4. 方法提炼

整个推导只用了两件事：

1. **距离非负**，即 $\\|\\mathbf{w}\\|^2 \\ge 0$；
2. **正交分解**，即减去投影。

凡是能定义内积的空间，例如函数空间 $\\langle f,g\\rangle = \\int f g$、随机变量 $\\langle X,Y\\rangle = E[XY]$，同一段推理照搬成立。积分形式与协方差形式

$$
\\bigl|\\operatorname{Cov}(X,Y)\\bigr| \\le \\sqrt{\\operatorname{Var}(X)}\\,\\sqrt{\\operatorname{Var}(Y)}
$$

都来自同一个源头。$\\blacksquare$`,
  },
]
const seedArticlesMore: Article[] = [
  {
    id: 'a3',
    title: '极限的严格定义：把无限接近翻译成不等式',
    summary: '极限为什么非要用一串不等式来定义？从直觉说法的漏洞出发，一步步逼出标准定义。',
    topic: '极限',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 3,
    content: `## 1. 直觉说法的问题

「$n$ 越来越大时，$a_n$ 无限接近 $A$」——这句话听起来对，但无法检验。什么叫「越来越大」？什么叫「无限接近」？数学要证明命题，必须把这两个短语变成可以验证的语句。

## 2. 第一步翻译：接近就是距离小

$a_n$ 接近 $A$，自然用距离刻画：

$$
|a_n - A| \\text{ 很小}.
$$

「无限接近」的含义是：误差可以被压到任意小。也就是说，你随便给我一个正数 $\\varepsilon$，我都能做到

$$
|a_n - A| < \\varepsilon.
$$

## 3. 第二步翻译：无限是一种最终性质

注意数列前面有限项完全不影响极限，所以我们只要求「从某一项之后」满足上面的不等式。「从某项之后」的严格说法是：存在一个序号 $N$，使得所有 $n > N$ 都满足。

把两步拼起来，极限的定义被唯一地逼出来了：

$$
\\boxed{\\;\\forall\\, \\varepsilon > 0,\\ \\exists\\, N \\in \\mathbb{N},\\ \\forall\\, n > N:\\quad |a_n - A| < \\varepsilon\\;}
$$

此时记 $\\displaystyle \\lim_{n \\to \\infty} a_n = A$。

## 4. 用一个例子走完定义

验证 $\\displaystyle \\lim_{n \\to \\infty} \\frac{1}{n} = 0$。

任给 $\\varepsilon > 0$，要使得

$$
\\left|\\frac{1}{n} - 0\\right| = \\frac{1}{n} < \\varepsilon,
$$

只需 $n > \\dfrac{1}{\\varepsilon}$。于是取

$$
N = \\left\\lceil \\frac{1}{\\varepsilon} \\right\\rceil,
$$

则当 $n > N$ 时上述不等式成立。定义验证完毕。

## 5. 方法提炼

这个定义的构造只有两步：

1. **接近** $\\to$ 距离可以任意小（$\\varepsilon$ 任意给）；
2. **无限** $\\to$ 有限项之后永远成立（$N$ 必须存在）。

函数极限、连续、导数的定义都是这两步的复用。$\\blacksquare$`,
  },
  {
    id: 'a4',
    title: '行列式：从平行六面体的体积长出来的函数',
    summary: '行列式不是一堆数字的奇怪运算，而是被三条体积公理唯一确定的有向体积。',
    topic: '代数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 3,
    content: `## 1. 起点：什么是体积

$n$ 个向量 $\\mathbf{v}_1, \\dots, \\mathbf{v}_n$ 在 $\\mathbb{R}^n$ 中张成一个平行六面体。我们想定义它的**有向体积** $V(\\mathbf{v}_1, \\dots, \\mathbf{v}_n)$。

## 2. 体积必须满足的三条公理

凭几何直觉，体积函数必须满足：

1. **多重线性**：某条边放大 $\\lambda$ 倍，体积放大 $\\lambda$ 倍，即

$$
V(\\dots, \\lambda \\mathbf{v}_i, \\dots) = \\lambda\\, V(\\dots, \\mathbf{v}_i, \\dots);
$$

2. **交替性**：两条边重合则体积为零，即 $\\mathbf{v}_i = \\mathbf{v}_j$ 时

$$
V(\\mathbf{v}_1, \\dots, \\mathbf{v}_n) = 0;
$$

3. **规范性**：单位立方体体积为 $1$，即

$$
V(\\mathbf{e}_1, \\dots, \\mathbf{e}_n) = 1.
$$

## 3. 三条公理唯一确定体积函数

以 $n = 2$ 为例。由交替性，

$$
V(\\mathbf{u} + \\mathbf{v},\\ \\mathbf{u} + \\mathbf{v}) = 0,
$$

展开并利用多重线性性得

$$
V(\\mathbf{u}, \\mathbf{v}) + V(\\mathbf{v}, \\mathbf{u}) = 0
\\quad\\Longrightarrow\\quad
V(\\mathbf{v}, \\mathbf{u}) = -V(\\mathbf{u}, \\mathbf{v}).
$$

设 $\\mathbf{v}_1 = a\\,\\mathbf{e}_1 + b\\,\\mathbf{e}_2$，$\\mathbf{v}_2 = c\\,\\mathbf{e}_1 + d\\,\\mathbf{e}_2$，展开：

$$
V(\\mathbf{v}_1, \\mathbf{v}_2) = ad\\, V(\\mathbf{e}_1, \\mathbf{e}_2) + bc\\, V(\\mathbf{e}_2, \\mathbf{e}_1) = ad - bc.
$$

**没有任何选择的余地**——三条公理已经把这个数算死了。一般的 $n$ 阶情形给出

$$
\\boxed{\\;\\det A = \\sum_{\\sigma \\in S_n} \\operatorname{sgn}(\\sigma) \\prod_{i=1}^{n} a_{i,\\, \\sigma(i)}\\;}
$$

## 4. 回看

行列式的「奇怪定义」其实一点都不奇怪：它是**唯一**满足体积三条公理的函数。可逆性（$\\det A \\ne 0$ 等价于体积非零、即向量组不共面）、换行变号、倍加不变等性质，全都是体积公理的直接推论。$\\blacksquare$`,
  },
  {
    id: 'a5',
    title: '特征值与特征向量：寻找变换下的不变方向',
    summary: '矩阵作用在向量上通常会改变方向，但总有一些方向只被拉伸——找到它们，矩阵就被看透了。',
    topic: '代数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 3,
    content: `## 1. 起点：矩阵究竟做了什么

方阵 $A$ 把向量 $\\mathbf{x}$ 变成 $A\\mathbf{x}$：一般是旋转加伸缩的混合，方向变了，长度也变了。逐向量去分析太复杂。

**关键一问**：有没有一些特殊的方向，使得 $A$ 作用上去之后方向不变，只是伸缩？如果有，沿这些方向看，矩阵就像一个数一样简单。

## 2. 把问题写成方程

「方向不变，只是伸缩」翻译成方程就是

$$
A\\mathbf{v} = \\lambda \\mathbf{v}, \\qquad \\mathbf{v} \\ne \\mathbf{0}.
$$

移项得

$$
(A - \\lambda I)\\,\\mathbf{v} = \\mathbf{0}.
$$

## 3. 方程何时有非零解

齐次方程 $(A - \\lambda I)\\mathbf{v} = \\mathbf{0}$ 有非零解，当且仅当系数矩阵不可逆，即行列式为零：

$$
\\boxed{\\;\\det(A - \\lambda I) = 0\\;}
$$

这就是特征方程——它不是人为规定的，而是「存在不变方向」这一要求的**充要条件**。每个根 $\\lambda_i$ 是特征值，对应的非零解 $\\mathbf{v}_i$ 是特征向量。

## 4. 找到了有什么用

若有 $n$ 个线性无关的特征向量，以它们为基，$A$ 的作用变成逐坐标伸缩：

$$
A = P \\, \\Lambda \\, P^{-1}, \\qquad \\Lambda = \\operatorname{diag}(\\lambda_1, \\dots, \\lambda_n).
$$

于是矩阵的幂立刻可算：

$$
A^k = P \\, \\Lambda^k \\, P^{-1},
\\qquad \\Lambda^k = \\operatorname{diag}(\\lambda_1^k, \\dots, \\lambda_n^k).
$$

## 5. 方法提炼

1. **动机**：把复杂变换分解为若干独立方向上的伸缩；
2. **条件**：$A\\mathbf{v} = \\lambda \\mathbf{v}$ 有非零解；
3. **必然性**：$\\det(A - \\lambda I) = 0$ 被这个要求唯一逼出。

特征值理论在振动、主成分分析、马尔可夫链稳态中反复出现，原因都一样：它们都在寻找系统的不变方向。$\\blacksquare$`,
  },
  {
    id: 'a6',
    title: '定积分：曲边梯形面积的严格化',
    summary: '面积只能对直边形定义，曲边怎么办？分割、近似、取极限三步，逼出黎曼和与微积分基本定理。',
    topic: '函数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 3,
    content: `## 1. 起点：我们只会算直边形的面积

矩形面积是长乘宽。可 $y = f(x)$ 下方的曲边梯形，边是弯的，面积两个字甚至没有定义。

## 2. 三步构造：分割、近似、取极限

把 $[a, b]$ 切成 $n$ 段，分点 $a = x_0 < x_1 < \\dots < x_n = b$。每小段上曲边起伏不大，用矩形近似：

$$
\\text{面积} \\approx \\sum_{i=1}^{n} f(\\xi_i)\\, \\Delta x_i,
\\qquad \\xi_i \\in [x_{i-1}, x_i],\\ \\Delta x_i = x_i - x_{i-1}.
$$

分割越细，近似越准。若当 $\\max \\Delta x_i \\to 0$ 时极限存在且与取点方式无关，就把它**定义**为定积分：

$$
\\boxed{\\;\\int_a^b f(x)\\,\\mathrm{d}x = \\lim_{\\max \\Delta x_i \\to 0} \\sum_{i=1}^{n} f(\\xi_i)\\, \\Delta x_i\\;}
$$

## 3. 神奇的一幕：面积的导数是被积函数

定义面积函数

$$
A(x) = \\int_a^x f(t)\\,\\mathrm{d}t.
$$

考察它的增量：$A(x + h) - A(x)$ 是 $[x, x+h]$ 上小窄条的面积。由连续性，$f$ 在这小段上几乎等于 $f(x)$，故

$$
A(x+h) - A(x) \\approx f(x)\\, h
\\quad\\Longrightarrow\\quad
A'(x) = \\lim_{h \\to 0} \\frac{A(x+h) - A(x)}{h} = f(x).
$$

**求面积与求导数是互逆运算**——这就是微积分基本定理：

$$
\\int_a^b f(x)\\,\\mathrm{d}x = F(b) - F(a), \\qquad F' = f.
$$

## 4. 方法提炼

1. **不会算曲线** $\\to$ 用直线逼近；
2. **逼近** $\\to$ 取极限上升为定义；
3. **计算** $\\to$ 基本定理把极限问题还原为找原函数。

极限、导数、积分三者在这里闭环：微积分的大厦只有一块基石，就是取极限。$\\blacksquare$`,
  },
  {
    id: 'a7',
    title: '贝叶斯公式：用结果反推原因',
    summary: '已知结果，反推每种原因的可能性有多大。条件概率的定义直接长出贝叶斯公式。',
    topic: '概率论',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 2,
    content: `## 1. 起点：条件概率的定义

「已知 $B$ 发生的条件下 $A$ 的概率」是什么意思？$B$ 发生后，样本空间缩小为 $B$，$A$ 在其中占的比例是

$$
P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}.
$$

这不是定理，而是**定义**——它是「条件」二字唯一合理的翻译。

## 2. 一步变形：乘法公式

把定义交叉相乘：

$$
P(A \\cap B) = P(B)\\, P(A \\mid B) = P(A)\\, P(B \\mid A).
$$

注意右端给了 $P(A \\cap B)$ 的**两种写法**，这正是反推的杠杆。

## 3. 反推：贝叶斯公式

设原因有若干种 $A_1, \\dots, A_n$，构成样本空间的划分。由全概率公式，

$$
P(B) = \\sum_{i=1}^{n} P(A_i)\\, P(B \\mid A_i).
$$

结合乘法公式的两种写法，立即得到

$$
\\boxed{\\;P(A_k \\mid B) = \\frac{P(A_k)\\, P(B \\mid A_k)}{\\displaystyle\\sum_{i=1}^{n} P(A_i)\\, P(B \\mid A_i)}\\;}
$$

## 4. 一个反直觉的例子

某病患病率 $0.1\\%$，检测灵敏度 $99\\%$、特异度 $99\\%$。问检测阳性者真正患病的概率？

$$
P(\\text{病} \\mid +) = \\frac{0.001 \\times 0.99}{0.001 \\times 0.99 + 0.999 \\times 0.01} \\approx 0.09.
$$

阳性者中只有约 $9\\%$ 真患病——先验概率 $P(A_k)$ 太小时，再准的检测也会被假阳性淹没。

## 5. 方法提炼

贝叶斯公式没有新内容，它是条件概率定义 + 乘法公式 + 全概率公式的直接拼接。真正深刻的，是它回答的问题方向：**从结果更新对原因的信念**。$\\blacksquare$`,
  },
  {
    id: 'a8',
    title: '最大似然估计：让已经发生的结果最合理',
    summary: '参数未知怎么办？选择那个让眼前这组数据出现概率最大的参数。一个朴素原则推出整套估计方法。',
    topic: '数理统计',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 2,
    content: `## 1. 起点：一个朴素的判断标准

掷一枚不均匀的硬币 $10$ 次，出现 $7$ 次正面。正面概率 $p$ 是多少？

直觉回答是 $0.7$。凭什么？因为「已经发生的事情，应该是比较可能发生的事情」。把这翻成原则：**选取参数，使观测数据的概率最大**。

## 2. 把原则写成函数

设样本 $x_1, \\dots, x_n$ 独立同分布，概率（密度）为 $f(x \\mid \\theta)$。观测到眼前这组数据的联合概率是

$$
L(\\theta) = \\prod_{i=1}^{n} f(x_i \\mid \\theta).
$$

$L(\\theta)$ 称为似然函数。最大似然估计就是

$$
\\boxed{\\;\\hat{\\theta} = \\arg\\max_{\\theta}\\, L(\\theta)\\;}
$$

## 3. 回到硬币

设正面概率为 $p$，观测为 $7$ 正 $3$ 反，则

$$
L(p) = p^7 (1-p)^3.
$$

乘积求导麻烦，取对数（单调变换不改变最大值点）：

$$
\\ell(p) = \\ln L(p) = 7 \\ln p + 3 \\ln(1-p).
$$

对 $p$ 求导并令其为零：

$$
\\ell'(p) = \\frac{7}{p} - \\frac{3}{1-p} = 0
\\quad\\Longrightarrow\\quad
7(1-p) = 3p
\\quad\\Longrightarrow\\quad
\\hat{p} = \\frac{7}{10}.
$$

直觉答案 $0.7$ 被原则严格推出。

## 4. 方法提炼

1. **原则**：让已发生的结果概率最大；
2. **技术**：取对数把乘积变求和，再求导找驻点；
3. **本质**：估计量完全由数据与模型决定，没有人为裁量。

正态总体下，同一方法给出样本均值与样本方差；线性回归的最小二乘法，也正是高斯噪声假设下的最大似然。$\\blacksquare$`,
  },
  {
    id: 'a9',
    title: '一阶线性微分方程：积分因子从哪里来',
    summary: '积分因子不是天上掉下来的技巧，而是想让左端凑成乘积导数这一愿望的唯一答案。',
    topic: '常微分方程',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 2,
    content: `## 1. 起点：我们想解什么

一阶线性方程形如

$$
y' + p(x)\\, y = q(x).
$$

如果左端恰好是某个乘积的导数，两边直接积分就解完了。问题是：它不是。

## 2. 关键愿望：凑出乘积的导数

乘积求导公式是

$$
\\bigl(\\mu(x)\\, y\\bigr)' = \\mu\\, y' + \\mu'\\, y.
$$

对比原方程的左端 $y' + p\\,y$：只要两边同乘一个函数 $\\mu(x)$，使

$$
\\mu\\, y' + \\mu\\, p\\, y = \\mu\\, y' + \\mu'\\, y,
$$

左端就恰好变成 $(\\mu y)'$。比较 $y$ 的系数，$\\mu$ 必须满足

$$
\\mu' = \\mu\\, p(x).
$$

## 3. 解出积分因子

这是一个可分离变量的方程：

$$
\\frac{\\mathrm{d}\\mu}{\\mu} = p(x)\\, \\mathrm{d}x
\\quad\\Longrightarrow\\quad
\\ln |\\mu| = \\int p(x)\\, \\mathrm{d}x
\\quad\\Longrightarrow\\quad
\\boxed{\\;\\mu(x) = \\exp\\left(\\int p(x)\\, \\mathrm{d}x\\right)\\;}
$$

积分因子被「凑乘积导数」这一愿望**唯一逼出**。

## 4. 通解自动现身

乘以 $\\mu$ 后原方程变为

$$
\\bigl(\\mu(x)\\, y\\bigr)' = \\mu(x)\\, q(x),
$$

两边积分即得通解

$$
y = \\frac{1}{\\mu(x)} \\left( \\int \\mu(x)\\, q(x)\\, \\mathrm{d}x + C \\right).
$$

## 5. 方法提炼

常微分方程的许多「技巧」都是同一个模式：**先问希望左端长什么样，再反推需要乘上什么**。恰当方程的积分因子、二阶方程的降阶法，都是这一模式的翻版。$\\blacksquare$`,
  },
]
const seedArticlesNumGeo: Article[] = [
  {
    id: 'a10',
    title: '辗转相除法与裴蜀定理：最大公因数的全部秘密',
    summary: '从带余除法这一个操作出发，推出最大公因数的快速算法，以及它必能写成线性组合这一深刻事实。',
    topic: '数论',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 1,
    content: `## 1. 起点：找最大公因数

给定正整数 $a > b$，求 $\\gcd(a, b)$。最笨的办法是分解质因数——但大整数分解极慢。需要更好的办法。

## 2. 关键观察：公因子集合不变

带余除法给出

$$
a = bq + r, \\qquad 0 \\le r < b.
$$

**核心事实**：$a$ 与 $b$ 的公因子集合，和 $b$ 与 $r$ 的公因子集合完全相同。

- 若 $d \\mid a$ 且 $d \\mid b$，则 $d \\mid a - bq = r$；
- 若 $d \\mid b$ 且 $d \\mid r$，则 $d \\mid bq + r = a$。

公因子集合相同，最大者自然相同：

$$
\\boxed{\\;\\gcd(a, b) = \\gcd(b, r)\\;}
$$

## 3. 迭代即算法

右边的问题规模严格变小（$r < b$），于是反复应用，直到余数为 $0$：

$$
\\gcd(a, b) = \\gcd(b, r_1) = \\gcd(r_1, r_2) = \\dots = \\gcd(r_{k-1}, 0) = r_{k-1}.
$$

每次余数至少减半（可证 $r_{i+2} < r_i / 2$），步数是对数级的——这就是辗转相除法。

## 4. 回代：裴蜀定理

把每一步的余数倒推回 $a, b$ 的组合。以 $\\gcd(30, 12)$ 为例：

$$
30 = 12 \\times 2 + 6.
$$

直接读出

$$
6 = 30 - 12 \\times 2,
$$

即 $\\gcd$ 写成了 $a, b$ 的整系数线性组合。一般情形对辗转相除逐步回代，可得**裴蜀定理**：存在整数 $x, y$ 使

$$
\\boxed{\\;ax + by = \\gcd(a, b).\\;}
$$

## 5. 方法提炼

1. **一个操作**：带余除法；
2. **一个不变量**：公因子集合；
3. **一个副产品**：回代自动给出线性组合。

推论遍地都是：$p$ 为素数且 $p \\mid ab$ 则 $p \\mid a$ 或 $p \\mid b$（算术基本定理的基石）；$\\gcd(a, m) = 1$ 时 $a$ 在模 $m$ 下必有逆元（RSA 的前提）。$\\blacksquare$`,
  },
  {
    id: 'a11',
    title: '离心率：圆锥曲线的统一标尺',
    summary: '椭圆、抛物线、双曲线看似三种曲线，其实由同一个比值唯一区分——从焦点准线定义推出统一方程。',
    topic: '解析几何',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 1,
    content: `## 1. 起点：三种曲线能用一个定义吗

椭圆、抛物线、双曲线在教科书里各有一套定义。有没有一把统一的标尺？有：**到焦点的距离与到准线的距离之比**。

## 2. 统一定义

设焦点 $F$，准线 $\\ell$。平面上满足

$$
\\frac{|PF|}{\\operatorname{dist}(P, \\ell)} = e \\quad (e > 0 \\text{ 为常数})
$$

的点 $P$ 的轨迹称为圆锥曲线，$e$ 称为离心率。

## 3. 推出统一方程

取焦点为极点、极轴垂直于准线。设焦点到准线的距离对应的焦参数为 $p$。设 $P$ 的极坐标为 $(r, \\theta)$，其中 $r = |PF|$。由几何关系，

$$
\\operatorname{dist}(P, \\ell) = \\frac{p}{e} + r \\cos\\theta,
$$

代入定义 $r = e \\cdot \\operatorname{dist}(P, \\ell)$，解出 $r$：

$$
\\boxed{\\;r = \\frac{p}{1 - e\\cos\\theta}\\;}
$$

一个方程装下全部圆锥曲线。

## 4. 离心率如何区分三种曲线

- $0 < e < 1$：分母恒正，$r$ 有界，轨迹封闭——**椭圆**；
- $e = 1$：$\\theta \\to 0$ 时 $r \\to \\infty$，轨迹开放且只有一支——**抛物线**；
- $e > 1$：分母可为零，轨迹有两支——**双曲线**。

离心率量的是「曲线偏离封闭的程度」：$e \\to 0$ 时椭圆趋于圆，$e$ 越大开口越张。

## 5. 方法提炼

1. **统一定义**：一个比值 $e$ 取代三套定义；
2. **坐标选择**：以焦点为极点，方程立刻最简；
3. **参数意义**：$e$ 的取值范围与曲线类型一一对应。

开普勒第一定律说行星轨道是圆锥曲线，其离心率由能量唯一决定——同一把标尺，从考场延伸到星空。$\\blacksquare$`,
  },
]

const seedArticlesLearningLoop: Article[] = [
  {
    id: 'a12',
    title: 'Stolz 定理：差分比为什么决定数列商的极限',
    summary: '从离散望远镜求和出发，说明为什么局部增量之比能控制整体商，并逐一检查分母条件。',
    topic: '数列',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000,
    content: `## 1. 起点：整体比例能不能由一步变化决定

已知两个数列 $a_n$ 与 $b_n$。直接求 $a_n/b_n$ 的极限可能困难，但相邻两步的差分

$$
\\frac{a_{n+1}-a_n}{b_{n+1}-b_n}
$$

往往更简单。问题是：这种局部比例凭什么能代表整体比例？

## 2. 假设：哪些条件必须先摆在桌面上

设 $b_n$ **严格递增**，并且 $b_n\\to+\\infty$。如果

$$
\\lim_{n\\to\\infty}\\frac{a_{n+1}-a_n}{b_{n+1}-b_n}=L,
\\qquad L\\in\\mathbb R,
$$

那么我们希望证明 $a_n/b_n\\to L$。

严格递增保证每个差分 $b_{n+1}-b_n$ 都为正；趋于无穷保证起始项产生的有限误差最终被稀释。

## 3. 从差分不等式到望远镜求和

任取 $\\varepsilon>0$。由差分比收敛，存在 $N$，对所有 $k\\ge N$ 有

$$
L-\\varepsilon
<\\frac{a_{k+1}-a_k}{b_{k+1}-b_k}
<L+\\varepsilon.
$$

由于 $b_{k+1}-b_k>0$，不等号方向不会改变：

$$
(L-\\varepsilon)(b_{k+1}-b_k)
<a_{k+1}-a_k
<(L+\\varepsilon)(b_{k+1}-b_k).
$$

从 $k=N$ 加到 $n-1$，中间项依次相消：

$$
(L-\\varepsilon)(b_n-b_N)
<a_n-a_N
<(L+\\varepsilon)(b_n-b_N).
$$

这一步就是整个定理的核心：**整体差值是全部局部增量的和**。

## 4. 为什么初始项会消失

当 $n$ 足够大时，$b_n>0$。把上式除以 $b_n$：

$$
(L-\\varepsilon)\\left(1-\\frac{b_N}{b_n}\\right)+\\frac{a_N}{b_n}
<\\frac{a_n}{b_n}
<(L+\\varepsilon)\\left(1-\\frac{b_N}{b_n}\\right)+\\frac{a_N}{b_n}.
$$

由于 $b_n\\to+\\infty$，固定常数 $a_N/b_n$ 和 $b_N/b_n$ 都趋于零。于是

$$
L-\\varepsilon
\\le\\liminf_{n\\to\\infty}\\frac{a_n}{b_n}
\\le\\limsup_{n\\to\\infty}\\frac{a_n}{b_n}
\\le L+\\varepsilon.
$$

再让 $\\varepsilon\\downarrow0$，得到

$$
\\boxed{\\lim_{n\\to\\infty}\\frac{a_n}{b_n}=L.}
$$

## 5. 条件拿掉会发生什么

如果 $b_n$ 不趋于无穷，有限起始项就不一定被稀释。例如取 $a_n\\equiv1$ 与严格递增的 $b_n=2-\\frac1n$，差分比恒等于 $0$，但 $a_n/b_n\\to\\frac12\\ne0$。这说明即使保留严格单调性，去掉趋于无穷这一条件，结论仍可能失效。

因此，使用 Stolz 时不能只看到“差分好算”；必须先检查分母是否严格递增、是否趋于无穷，以及差分极限是否真的存在。$\\blacksquare$`,
  },
  {
    id: 'a13',
    title: '拉格朗日中值定理：平均变化率为什么会在某一点出现',
    summary: '从两端点的割线出发，减去这条直线，把平均变化率问题还原为 Rolle 定理。',
    topic: '导数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000,
    content: `## 1. 起点：整体速度在哪里变成瞬时速度

如果只知道 $f(a)$ 与 $f(b)$，我们可以计算整个区间的平均变化率：

$$
m=\\frac{f(b)-f(a)}{b-a}.
$$

真正的问题是：能否证明区间里至少有一个点，瞬时变化率恰好等于这个整体平均值？

## 2. 构造一条经过两个端点的割线

假设 $a<b$，$f$ 在闭区间 $[a,b]$ 上连续，并在开区间 $(a,b)$ 内可导。经过两个端点的直线是

$$
\\ell(x)=f(a)+\\frac{f(b)-f(a)}{b-a}(x-a).
$$

它的导数恒等于平均斜率 $m$。

## 3. 把目标改写成一个端点相等的问题

构造新函数

$$
g(x)=f(x)-\\ell(x).
$$

由于割线穿过两个端点，立即得到

$$
g(a)=0,
\\qquad
g(b)=0.
$$

因此，我们已经把“寻找斜率等于 $m$ 的点”改写成“寻找导数为零的点”。

## 4. 由 Rolle 定理完成最后一步

$g$ 仍在 $[a,b]$ 上连续、在 $(a,b)$ 内可导，而且端点取值相同。Rolle 定理给出某个 $\\xi\\in(a,b)$，满足

$$
g'(\\xi)=0.
$$

把 $g=f-\\ell$ 代回，就得到

$$
\\boxed{
f'(\\xi)=\\frac{f(b)-f(a)}{b-a}.
}
$$

推导链条因此非常具体：

$$
\\text{构造割线}
\\longrightarrow\\text{减去割线}
\\longrightarrow\\text{端点相等}
\\longrightarrow\\text{Rolle 定理}
\\longrightarrow\\text{中值结论}.
$$

## 5. 哪个条件不能省

仅有连续性还不够。取 $f(x)=|x|$，区间为 $[-1,1]$。割线斜率等于 $0$，但内部除 $0$ 之外的导数只有 $-1$ 与 $1$，而 $0$ 处不可导，因此不存在满足结论的点。

端点连续性同样不能偷偷省掉：令 $f(x)=x$ 对 $0\\le x<1$ 成立，但规定 $f(1)=2$。整体割线斜率为 $2$，内部导数却恒等于 $1$。

所以定理的优雅不在于公式本身，而在于每一个假设都为 Rolle 定理铺好了路。$\\blacksquare$`,
  },
  {
    id: 'a14',
    title: '随机游动首达时：几乎必然到达为什么不代表期望有限',
    summary: '先加上有限左边界，再用吸收概率和逐步放开的边界，区分几乎必然发生与期望时间无穷。',
    topic: '概率论',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000,
    content: `## 1. 起点：一定会发生，是否意味着平均等待有限

设对称随机游动从 $S_0=0$ 开始，每一步独立地以概率 $1/2$ 加一或减一。记首次到达 $+N$ 的时间为

$$
T_N=\\inf\\{n\\ge0:S_n=N\\},
\\qquad N\\ge1.
$$

直觉告诉我们，路径迟早会碰到 $N$。但“迟早”不等于“平均只需要有限步”。

## 2. 先把问题放进一个有限区间

额外放置一个左吸收边界 $-M$，并定义

$$
\\tau_M=T_N\\wedge T_{-M}.
$$

这是一个有限状态区间里的首次出界时间。它对应的两个基本量都可以通过一阶条件直接计算。

## 3. 到达右边界的概率

记 $q(k)$ 为从位置 $k$ 出发先到达 $N$ 的概率。它满足

$$
q(k)=\\frac{q(k-1)+q(k+1)}{2},
\\qquad
q(-M)=0,
\\quad
q(N)=1.
$$

满足这些条件的解是

$$
q(k)=\\frac{k+M}{M+N}.
$$

因此从原点出发时，

$$
\\mathbb P(T_N<T_{-M})=\\frac{M}{M+N}
\\xrightarrow[M\\to\\infty]{}1.
$$

由于事件 $\\{T_N<T_{-M}\\}$ 随 $M$ 增大而递增，并最终覆盖所有有限时间到达 $N$ 的路径，故

$$
\\mathbb P(T_N<\\infty)=1.
$$

## 4. 但有限区间的平均等待会不断长大

记 $u(k)=\\mathbb E_k[\\tau_M]$。逐步分析给出

$$
u(k)=1+\\frac{u(k-1)+u(k+1)}{2},
\\qquad
u(-M)=u(N)=0.
$$

可以直接代入检验，唯一解为

$$
u(k)=(k+M)(N-k).
$$

特别地，

$$
\\mathbb E_0[\\tau_M]=MN.
$$

而 $\\tau_M\\le T_N$，因此对每一个正整数 $M$ 都有

$$
\\mathbb E_0[T_N]\\ge MN.
$$

令 $M\\to\\infty$，得到

$$
\\boxed{\\mathbb E_0[T_N]=+\\infty.}
$$

## 5. 最容易被跳过的逻辑

停时几乎必然有限，并不自动意味着它具有有限期望；把鞅直接停在 $T_N$ 时，不能未经检查就套用可选停止定理。

这道题的真正结论是：

$$
\\mathbb P(T_N<\\infty)=1,
\\qquad
\\mathbb E[T_N]=\\infty.
$$

概率一的事件和有限平均等待，是两件不同的事。$\\blacksquare$`,
  },
]

export const seedArticles: Article[] = [
  ...seedArticlesBase,
  ...seedArticlesMore,
  ...seedArticlesNumGeo,
  ...seedArticlesLearningLoop,
]

export const seedPapers: Paper[] = [
  {
    id: 'paper1',
    title: '2025 全国大学生数学竞赛预赛·数学类模拟卷（A 卷）',
    competition: '全国大学生数学竞赛',
    year: 2025,
    description: '数学类预赛风格模拟卷：覆盖数学分析、高等代数、解析几何，共 6 题，建议用时 150 分钟。',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 2,
    attachments: [],
    content: `**说明**：本卷共 6 题，满分 100 分，建议用时 150 分钟。

## 一（15 分）

求极限

$$
\\lim_{n \\to \\infty} \\sum_{k=1}^{n} \\frac{k}{n^2 + k^2}.
$$

## 二（15 分）

设 $f(x)$ 在 $[0, 1]$ 上二阶可导，$f(0) = f(1) = 0$，且 $\\min\\limits_{x \\in [0,1]} f(x) = -1$。证明：存在 $\\xi \\in (0, 1)$，使得

$$
f''(\\xi) \\ge 8.
$$

## 三（15 分）

计算三重积分

$$
\\iiint_{\\Omega} \\left( x^2 + y^2 \\right) \\mathrm{d}V,
\\qquad \\Omega:\\ x^2 + y^2 + z^2 \\le 1,\\ z \\ge 0.
$$

## 四（20 分）

设 $A$ 为 $n$ 阶实对称矩阵，其特征值均为非负数。证明：

1. 存在实对称矩阵 $B$，使得 $A = B^2$；
2. 对任意 $\\mathbf{x} \\in \\mathbb{R}^n$，有 $\\mathbf{x}^{\\mathsf{T}} A \\mathbf{x} \\ge 0$。

## 五（15 分）

在空间中，求过点 $(1, 0, -1)$ 且与两直线

$$
L_1:\\ \\frac{x}{1} = \\frac{y-1}{2} = \\frac{z}{-1},
\\qquad
L_2:\\ \\frac{x-1}{0} = \\frac{y}{1} = \\frac{z+1}{1}
$$

都相交的直线方程。

## 六（20 分）

设 $a_n > 0$，级数 $\\displaystyle \\sum_{n=1}^{\\infty} a_n$ 发散。令 $S_n = a_1 + \\dots + a_n$。证明：级数

$$
\\sum_{n=1}^{\\infty} \\frac{a_n}{S_n}
$$

发散，而级数 $\\displaystyle \\sum_{n=1}^{\\infty} \\frac{a_n}{S_n^2}$ 收敛。`,
  },
  {
    id: 'paper2',
    title: '考研数学（一）冲刺套题·第一套',
    competition: '考研数学',
    year: 2026,
    description: '考研数学一风格套题：高等数学、线性代数、概率论与数理统计综合，共 5 题，附考点标注。',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 1,
    attachments: [],
    content: `**说明**：本套题共 5 题，每题 20 分，覆盖考研数学一核心考点。

## 一、极限与积分（20 分）

求

$$
\\lim_{x \\to 0} \\frac{\\displaystyle \\int_0^x \\left( e^{t^2} - 1 \\right) \\mathrm{d}t}{x^3}.
$$

**考点**：洛必达法则 + 变限积分求导。

## 二、多元函数（20 分）

设 $z = f(x, y)$ 由方程

$$
x^2 + y^2 + z^2 - 2xyz = 1
$$

在点 $(0, 0, 1)$ 附近确定的隐函数，求 $\\left. \\dfrac{\\partial^2 z}{\\partial x \\, \\partial y} \\right|_{(0,0)}$。

**考点**：隐函数求导、二阶混合偏导。

## 三、线性代数（20 分）

已知三阶矩阵 $A$ 的特征值为 $1, 2, 3$，对应的特征向量依次为

$$
\\boldsymbol{\\alpha}_1 = (1, 0, 0)^{\\mathsf{T}}, \\quad
\\boldsymbol{\\alpha}_2 = (1, 1, 0)^{\\mathsf{T}}, \\quad
\\boldsymbol{\\alpha}_3 = (1, 1, 1)^{\\mathsf{T}}.
$$

求 $A^3 \\boldsymbol{\\beta}$，其中 $\\boldsymbol{\\beta} = (1, 2, 3)^{\\mathsf{T}}$。

**考点**：特征分解、向量在特征基下的展开。

## 四、概率论（20 分）

设随机变量 $X \\sim N(0, 1)$，$Y = X^2$。求 $Y$ 的概率密度函数 $f_Y(y)$。

**考点**：随机变量函数的分布（分布函数法）。

## 五、数理统计（20 分）

设总体 $X$ 的概率密度为

$$
f(x; \\theta) = \\begin{cases} \\theta\\, x^{\\theta - 1}, & 0 < x < 1, \\\\ 0, & \\text{其他}, \\end{cases} \\qquad \\theta > 0.
$$

$X_1, \\dots, X_n$ 为简单随机样本，求 $\\theta$ 的最大似然估计量 $\\hat{\\theta}$。

**考点**：似然函数构造、对数求导。`,
  },
]
