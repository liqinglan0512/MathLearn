import type { Article, Comment, Problem, Solution } from './types'

export const seedProblems: Problem[] = [
  {
    id: 'p1',
    title: '极限：Stolz 定理的应用',
    statement:
      '设数列 $\\{a_n\\}$ 满足 $a_1 = 1$，$a_{n+1} = a_n + \\dfrac{1}{a_n}$。\n\n**求：** $\\displaystyle\\lim_{n \\to \\infty} \\dfrac{a_n}{\\sqrt{n}}$。\n\n> 提示：先证明 $a_n \\to +\\infty$，再考虑 $a_n^2$ 的递推。',
    chapter: '数学分析',
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
    chapter: '数学分析',
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
    chapter: '高等代数',
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
      '判别级数 $\\displaystyle\\sum_{n=2}^{\\infty} \\frac{1}{n \\ln n \\,(\\ln \\ln n)^p}$ 的敛散性（$p > 0$），并给出完整的积分判别论证。',
    chapter: '数学分析',
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
      '质点从原点出发做一维对称随机游动，每步以概率 $\\frac12$ 向左或向右移动 $1$ 个单位。\n\n**求：** 首次到达 $+N$ 的期望步数（设出发点为 $0$，$N$ 为正整数）。',
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
      '由 $f(0)=0$ 与牛顿–莱布尼茨公式：\n$$f(x) = \\int_0^x f\'(t)\\,\\mathrm{d}t$$\n\n对右端用 Cauchy–Schwarz：\n$$f^2(x) \\le \\left(\\int_0^x 1^2\\,\\mathrm{d}t\\right)\\left(\\int_0^x (f\'(t))^2\\,\\mathrm{d}t\\right) = x \\int_0^x (f\'(t))^2\\,\\mathrm{d}t \\le x \\int_0^1 (f\')^2$$\n\n两边在 $[0,1]$ 上积分：\n$$\\int_0^1 f^2(x)\\,\\mathrm{d}x \\le \\left(\\int_0^1 x\\,\\mathrm{d}x\\right)\\left(\\int_0^1 (f\')^2\\right) = \\frac{1}{2}\\int_0^1 (f\')^2$$\n\n等号成立条件留给读者思考（提示：考察 $f = cx$ 并检查边界）。',
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
    content: '常数 1/2 是最优的吗？我试了下 $f=x$，两边相等，确实取到。',
    createdAt: Date.now() - 86400000 * 5,
  },
]

export const seedArticles: Article[] = [
  {
    id: 'a1',
    title: '泰勒公式：从"以直代曲"到一般逼近',
    summary: '不背公式，从"如何用多项式逼近一个函数"这一朴素问题出发，完整推出泰勒公式与余项。',
    topic: '数学分析',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 6,
    content: `## 1. 起点：我们想干什么？

微积分的核心思想只有一句话：**用简单的函数逼近复杂的函数**。最简单的函数是多项式——只会做加减乘。

于是问题变成：给定 $f(x)$ 在 $x_0$ 附近的信息，找一个多项式 $P(x)$ 使得它们在 $x_0$ 附近"尽可能像"。

## 2. 一阶：切线（以直代曲）

"像"的最低要求：函数值相同，变化率也相同。

$$P_1(x_0) = f(x_0), \\qquad P_1'(x_0) = f'(x_0)$$

满足这两条的一次多项式是唯一的：

$$P_1(x) = f(x_0) + f'(x_0)(x - x_0)$$

这就是切线。误差有多大？由拉格朗日中值定理，

$$f(x) - P_1(x) = \\frac{f''(\\xi)}{2}(x-x_0)^2$$

误差是**二阶小量**——这是一切后续推理的原型。

## 3. 推广：匹配更多阶导数

一阶匹配了一阶导数，误差降一阶。自然的猜想：**匹配到 $n$ 阶导数，误差就是 $n+1$ 阶小量**。

设 $P_n(x) = \\sum_{k=0}^{n} c_k (x - x_0)^k$。要求 $P_n^{(k)}(x_0) = f^{(k)}(x_0)$ 对 $k = 0, 1, \\dots, n$ 成立。

对 $P_n$ 求 $k$ 次导后代入 $x_0$：

$$P_n^{(k)}(x_0) = k!\\, c_k \\implies c_k = \\frac{f^{(k)}(x_0)}{k!}$$

于是我们**不得不**得到：

$$\\boxed{P_n(x) = \\sum_{k=0}^{n} \\frac{f^{(k)}(x_0)}{k!} (x - x_0)^k}$$

注意：系数不是被"规定"的，而是被"匹配导数"这一要求**唯一决定**的。

## 4. 余项：误差的精确刻画

令 $R_n(x) = f(x) - P_n(x)$。反复应用柯西中值定理（或用带积分余项的推导）可得拉格朗日余项：

$$R_n(x) = \\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x - x_0)^{n+1}, \\quad \\xi \\text{ 介于 } x_0 \\text{ 与 } x \\text{ 之间}$$

## 5. 回看：第一性原理链条

1. **目的**：用多项式逼近函数；
2. **手段**：逐阶匹配导数；
3. **结果**：系数被唯一确定为 $\\frac{f^{(k)}(x_0)}{k!}$；
4. **代价**：误差由下一阶导数控制。

泰勒公式不是天降的公式，而是"逼近"这一朴素目的的必然产物。$\\blacksquare$`,
  },
  {
    id: 'a2',
    title: '柯西不等式：从内积的投影谈起',
    summary: '为什么 |⟨u,v⟩| ≤ ‖u‖‖v‖？从"投影长度不超过原长度"这一几何事实推出代数形式。',
    topic: '高等代数',
    authorId: 'admin',
    authorName: 'MathForge 官方',
    createdAt: Date.now() - 86400000 * 4,
    content: `## 1. 几何直觉：投影不会变长

平面上，向量 $\\mathbf{u}$ 在 $\\mathbf{v}$ 方向上的投影长度是 $|\\mathbf{u}|\\cos\\theta$，它当然不超过 $|\\mathbf{u}|$ 本身。

把这个平凡的事实写仔细一点。$\\mathbf{u}$ 在 $\\mathbf{v}$ 方向的投影系数为

$$t = \\frac{\\langle \\mathbf{u}, \\mathbf{v} \\rangle}{\\langle \\mathbf{v}, \\mathbf{v} \\rangle}$$

"减去投影后剩下的分量长度非负"，即

$$\\|\\mathbf{u} - t\\mathbf{v}\\|^2 \\ge 0$$

## 2. 展开：不等式自动现身

$$0 \\le \\langle \\mathbf{u} - t\\mathbf{v},\\ \\mathbf{u} - t\\mathbf{v} \\rangle = \\|\\mathbf{u}\\|^2 - 2t\\langle \\mathbf{u},\\mathbf{v} \\rangle + t^2 \\|\\mathbf{v}\\|^2$$

代入 $t = \\frac{\\langle \\mathbf{u},\\mathbf{v} \\rangle}{\\|\\mathbf{v}\\|^2}$：

$$0 \\le \\|\\mathbf{u}\\|^2 - \\frac{\\langle \\mathbf{u},\\mathbf{v} \\rangle^2}{\\|\\mathbf{v}\\|^2}$$

整理即得柯西–施瓦茨不等式：

$$\\boxed{\\langle \\mathbf{u}, \\mathbf{v} \\rangle^2 \\le \\|\\mathbf{u}\\|^2 \\, \\|\\mathbf{v}\\|^2}$$

等号成立 $\\iff \\mathbf{u} = t\\mathbf{v}$，即两向量共线——"剩余分量"恰好为零。

## 3. 代数形式

对实数 $a_1,\\dots,a_n$ 与 $b_1,\\dots,b_n$，取标准内积 $\\langle \\mathbf{a}, \\mathbf{b} \\rangle = \\sum a_i b_i$：

$$\\left(\\sum_{i=1}^{n} a_i b_i\\right)^2 \\le \\left(\\sum_{i=1}^{n} a_i^2\\right)\\left(\\sum_{i=1}^{n} b_i^2\\right)$$

## 4. 方法提炼

整个推导只用了两件事：

1. **距离非负**（$\\|w\\|^2 \\ge 0$）；
2. **正交分解**（减去投影）。

凡是能定义内积的空间——函数空间（$\\langle f,g\\rangle = \\int fg$）、随机变量（$\\langle X,Y\\rangle = E[XY]$）——同一段推理照搬成立，这就是积分形式与协方差形式 $|Cov(X,Y)| \\le \\sqrt{Var\\,X}\\sqrt{Var\\,Y}$ 的共同来源。$\\blacksquare$`,
  },
]
