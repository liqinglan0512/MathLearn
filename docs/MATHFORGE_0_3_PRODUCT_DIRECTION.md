# MathForge 0.3 产品方向

版本名称：**MathForge 0.3 — Open Learning Core**

> 本文定义 0.3 的产品方向与边界，不是完成报告。实现状态必须以代码、测试、浏览器 QA 和 `MATHFORGE_0_3_COMPLETION_REPORT.md` 的最终证据为准。

## 1. 定位

MathForge 的目标是成为一个以真正理解数学为中心、通过 GitHub 开放协作的数学学习平台：

> An open-source mathematics learning platform focused on understanding mathematics from intuition, definitions, structure and rigorous reasoning.

产品价值不再由题目数、资源数、用户上传数或社区活跃度衡量，而由 **Understanding Quality** 衡量：内容是否帮助学习者从问题和直觉走向定义、结构、证明、反例、可视化与检验理解。

这里的“open-source”是产品目标。当前仓库尚未建立由 Leo 确认的代码许可证与数学内容许可证；在许可证落实前，对外表述应使用“公开源码、通过 GitHub 开放协作”或明确说明许可证待确认，不能把公开可见的源码自动等同于已经完成法律意义上的开源许可。

## 2. 从 0.2 到 0.3

MathForge 0.2 建立了可信工程基础：TypeScript、ESLint、Vitest、构建和 CI，Revision / SemanticBlock / Edge / Annotation / Review / Visibility 等领域模型，内容审核边界，以及《几何原本》的按需加载、依赖图与内部编辑试验。

这些成果不是需要推翻的旧系统。0.3 调整的是公开产品重心：

| 0.2 主要试验方向 | 0.3 公开产品方向 |
| --- | --- |
| 数学社区与内容管理的长期基础 | 简单、清楚的学习者体验 |
| 《几何原本》验证内容模型 | 少量高质量 Open Learning Core 学习单元 |
| 题库、文章、实验室等并列模块 | 理解 → 看见 → 练习 → 贡献 |
| 网站内投稿与审核的远期设想 | GitHub Issue / PR / Review / history |

0.2 的复杂领域模型继续保留在内部；公开界面不需要暴露全部工作流复杂度。

## 3. 核心学习闭环

0.3 的产品逻辑为：

```text
Understand
  → Visualize
  → Practice
  → Contribute
```

- **Understand：** 从问题、直觉和基本对象出发，走向定义、推导和严格性；
- **Visualize：** 操作数学对象，观察参数、关系、不变量和极限过程；
- **Practice：** 用少量练习检验理解，而不是机械刷题；
- **Contribute：** 通过 GitHub 改进解释、数学错误、可视化、测试和文档。

若一个新功能不能明显服务这四件事，本轮不开发。

## 4. 信息架构

公开导航的产品语义为：

1. **理解数学**：核心学习内容；
2. **可视化**：服务概念理解的数学实验；
3. **练习**：检验理解；
4. **工具**：公式编辑、基础计算与辅助工具；
5. **GitHub**：唯一正式贡献入口。

名称可根据现有 UI 做小幅调整，但不能重新把题库、社区或 Euclid 设为网站中心。

### 4.1 理解数学

“第一性原理”不只是一个页面名称，而是正式学习内容的写作方法。学习单元可以逐步扩展以下结构，不要求本轮一次填满：

1. 问题从哪里来；
2. 为什么需要这个概念；
3. 直觉是什么；
4. 从基本对象构造定义；
5. 正式定义；
6. 为什么定义必须这样写；
7. 推导或证明；
8. 条件为什么不可少；
9. 反例；
10. 可视化；
11. 典型应用；
12. 检验理解；
13. 更高层推广；
14. 前置与后续知识。

### 4.2 可视化

优先整理现有导数、黎曼和、线性变换、Taylor、概率、ODE 等成熟实验，不以数量为目标。每个实验至少回答：

- 你正在观察什么；
- 可以改变什么参数；
- 应注意什么结构或不变量；
- 该图形能说明什么、不能证明什么。

### 4.3 练习

题库继续保留，但定位为“检验理解”。0.3 先建立或整理以下关系，不批量补题：

```text
LearningUnit → Practice
Problem → prerequisite concepts
```

### 4.4 工具

公式编辑、基础计算和数学辅助工具继续保留，但不占据首页主叙事，也不冒充学习内容。

## 5. LearningUnit

0.3 建立可扩展的 LearningUnit metadata，用于连接理解、可视化和练习。建议字段包括：

```text
id
title
field
level
prerequisites
nextConcepts
intuition
formalDefinition
visualizationIds
practiceIds
status
```

首批候选可从极限、无穷小、导数、积分、向量、线性变换、矩阵、行列式、特征值、随机变量、期望等现有可靠内容中选择。数量不是验收条件；不得为了达到 10–20 个而批量生成正文。

建立 schema 或候选 metadata 不等于正式发布学习单元。任何正式发布仍需 Leo 决定，并保留来源、Revision 与人工数学审核边界。

## 6. 《几何原本》归档策略

《几何原本》从正式公开产品入口下架，但不删除、不改写、不做破坏性迁移。它是用于验证 MathForge 内容模型的 experimental / archived corpus，不再属于当前公开学习课程。

必须保留：

- Euclid 原始 JSON 与现代中文派生源；
- 607 条派生 entry；
- 7,152 个 SemanticBlock；
- dependency edges、source issues 与 provenance；
- Revision、Review、Annotation、Visualization trust 等模型；
- Euclid repository、内部编辑原型、生成/核验脚本和测试；
- 恢复内部归档访问和未来重新评估的能力。

公开产品默认应满足：

- 主导航没有 Euclid 入口；
- 首页不展示 Euclid；
- 普通学习目录不展示 Euclid；
- 生产环境没有可发现的公开 Euclid 学习路径；
- 内部归档入口受明确 feature flag 与开发/内部边界控制；
- 不再承诺公开发布或继续批量修订 607 条机器内容。

“下架”不表示数学内容已经错误，也不表示历史工程无价值；它只表示 0.3 将有限资源用于少量高质量学习入口。

## 7. GitHub 贡献路径

当前正式贡献流程只有：

```text
Issue
→ Fork / Branch
→ Pull Request
→ Code Review
→ Git history
```

用户可以通过 GitHub 报告数学错误、改进解释、请求可视化、报告 Bug 或建议学习单元。网站内普通投稿、附件与直接发布继续关闭。

PR 合并不自动等于数学审核、`math_reviewed`、正式学习单元发布或 `verified` 可视化。具体要求见根目录 `CONTRIBUTING.md`。

## 8. 冻结与非目标

0.3 明确不开发：

- 普通用户题目、文章、PDF、图片或附件上传；
- AI 解题、AI tutor、自动证明、AI 审核或 AI provider；
- 每周挑战赛、成长日记、排行榜、粉丝、点赞、信息流和私信；
- 复杂账户系统、OAuth、服务器后端或数据库；
- 大规模数学正文生成；
- 为追求包体积而进行激进依赖重构；
- 对 Euclid 原始语料的删除、覆盖或自动发布。

未来可能恢复的模型和代码应通过 feature flag、路由和产品文档归档，不通过删除历史来“简化”。

## 9. 账户与本地原型边界

当前账户、批注、评论、学习记录和内部编辑历史主要保存在浏览器 localStorage。它们可以支持本地原型，但不是：

- 云端账户；
- 生产级认证或授权；
- 多用户一致性系统；
- 可靠备份；
- 防篡改审计。

公开 UI 不应突出注册或登录，也不能让用户误以为数据会跨设备同步。保留的身份或管理员能力必须清楚标记为 `LOCAL PROTOTYPE` 或 internal development capability。

## 10. UI 原则

整体关键词：克制、理性、深邃、温暖、安静。

- 保留深色、暖色/象牙色与数学流形视觉；
- 不恢复黑洞、星空、Web3 粒子、蓝紫霓虹或满屏公式；
- 用 spacing、typography 和 hierarchy 代替 Card、边框、阴影与 glass 泛滥；
- 阅读页优先数学正文、公式留白和清楚的 Definition / Theorem / Proof / Example 层级；
- 可视化让图形成为主角，控制区保持克制；
- GitHub 入口明确但不过度抢眼；
- 首页 CTA 不超过三个，优先“开始学习”“查看 GitHub”“探索可视化”。

## 11. 工程与安全边界

0.3 继续保留 0.2 的质量门，不降低测试标准：

```text
typecheck
→ lint
→ test
→ LaTeX validation
→ repository hygiene
→ product contracts
→ production build
```

依赖漏洞使用点时间审计和最小升级方式处理；不得运行破坏性的 `npm audit fix --force`。当前分诊见 `docs/DEPENDENCY_SECURITY_TRIAGE.md`。

自动测试能够验证 schema、状态、路由和公式结构，不能证明数学内容正确，也不能代替人工发布决定。

## 12. 0.3 验收语义

第一次进入网站的用户应在十秒内理解：

> 这是一个帮助我真正理解数学、并能通过 GitHub 共同改善的学习平台。

用户不应误以为它是资料下载站、竞赛刷题站、AI 解题站、《几何原本》在线全集或社交网络。

完成报告必须分别列出：已完成、部分完成、未完成、需要 Leo 决策，并给出最终 commit、CI、测试、构建、浏览器 QA 和部署证据。0.2 的旧测试数字和发布数字不能未经重跑直接沿用。

以下事项始终保留给 Leo 决定：

- 软件与数学内容许可证；
- 第三方/历史语料权利口径；
- 是否正式发布某个新学习单元；
- 是否改变数学结论或合并有争议的内容；
- 是否引入外部服务、开放投稿或永久删除功能；
- 私密安全报告渠道。
