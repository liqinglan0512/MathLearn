# MathForge Post-Release Backlog

## 2026-09-06 maintenance tracking

MathForge v0.3.x is in **MAINTENANCE MODE**. The issues below track verified follow-up work; creating them does not authorize implementation. The historical observations below remain point-in-time records.

| Issue | Scope |
| --- | --- |
| [#1](https://github.com/liqinglan0512/MathLearn/issues/1) | Approved domain and isolated HTTPS deployment |
| [#2](https://github.com/liqinglan0512/MathLearn/issues/2) | Deployment, identity verification and rollback runbook |
| [#3](https://github.com/liqinglan0512/MathLearn/issues/3) | External production smoke automation |
| [#4](https://github.com/liqinglan0512/MathLearn/issues/4) | Isolated deployment guard and nginx regression coverage |
| [#5](https://github.com/liqinglan0512/MathLearn/issues/5) | Development dependency advisory triage |
| [#6](https://github.com/liqinglan0512/MathLearn/issues/6) | Measured first-load performance baseline |
| [#7](https://github.com/liqinglan0512/MathLearn/issues/7) | Evidence-based unused dependency audit |
| [#8](https://github.com/liqinglan0512/MathLearn/issues/8) | Explicit Tools KaTeX trust policy |
| [#9](https://github.com/liqinglan0512/MathLearn/issues/9) | Contributor licensing guidance consistency |

B4b has been rechecked against the live GitHub API: the repository description now matches the frozen product scope, so no duplicate issue was opened. README and CONTRIBUTING already document the Issue/PR workflow. No specific unresolved responsive or accessibility defect was established, so none was invented. `/papers` navigation and Euclid re-publication remain product decisions rather than implementation tasks.

本文件只记录**以后可能考虑**的事项。其中没有任何一项在本轮实现，也没有任何一项构成 0.3.0 的发布阻塞。

写在这里不等于已经批准。每一项在动工前都需要单独的产品决策。

---

## 一、审计中发现、但本轮刻意不做的事

### B1. `/papers` 未进入主导航
`/papers` 与 `/papers/:id` 是可用的公开路由（试卷与套题、逐题计时与复盘），但不在 `PUBLIC_NAVIGATION` 里，只能通过直接 URL 或题目详情页进入。

功能本身工作正常、没有误导性入口，所以本轮既不删除也不新增导航——两者都是产品决策，不是修 bug。

**以后**：要么把它接入主导航并当作正式模块维护，要么明确降级为实验入口。

### B2. devDependencies 的 13 条依赖告警
`npm audit` 报告 13 条（9 high / 2 moderate / 2 low），**全部位于 devDependencies**：vite、rollup、postcss、eslint 工具链、babel、js-yaml、minimatch、picomatch、nanoid、flatted、ajv、brace-expansion、humanfs。

`npm audit --omit=dev` 为 **0 vulnerabilities**——浏览器实际下载的产物不含任何已知告警依赖。这些是构建期工具链问题，触发条件是攻击者能控制构建输入。

**以后**：跟随上游做定向小版本升级，并考虑在 CI 加 `npm audit --omit=dev --audit-level=high` 作为生产依赖门槛。是否把完整 dev audit 设为阻断门需权衡误报成本。

### B3. vendor chunk 834 kB
`vendor-*.js` 约 834 kB（gzip 258 kB），超过 Vite 的 500 kB 警告线。首页可交互，但慢网络下首屏成本偏高。

本轮不做代码分割重构——属于「无明确收益的重构」，且有回归风险。

**以后**：按路由拆分 Radix/KaTeX，或把 KaTeX 改为按需加载。做之前应先量测真实首屏指标，不要凭感觉拆。

### B4. 未使用的依赖清理
`recharts` 本轮已移除（它是唯一的生产依赖告警来源）。`package.json` 中可能还有其他从未 import 的包（多个 Radix 组件、`embla-carousel-react`、`input-otp`、`vaul`、`cmdk`、`react-day-picker` 等来自初始模板）。

**以后**：做一次系统性的未使用依赖审计。本轮只移除了有安全影响的那一个，其余属于体积优化，不是发布阻塞。

### B4b. GitHub 仓库描述需同步
仓库描述仍写着「题库共享 + 社区解法」，而这两项能力已被 feature flag 关闭。正确文案已记录在 `RELEASE_READINESS_REPORT.md` 第 9 节，需所有者在 GitHub 设置中替换。

**以后**：把「仓库描述与 README / feature flag 一致」纳入发布检查单。它在仓库私有时不可见，容易被整轮审计漏掉——本轮就是在转 Public 之后才发现的。

### B5. 《几何原本》机器译稿仍为 `raw_machine`
607 条派生内容与 7152 个 SemanticBlock 保留在仓库中，现代中文渲染仍标记 `raw_machine`，未经独立数学审校。它已从公开课程下架，仅保留开发环境的内部入口。

**以后**：要么组织真正的数学审校再重新上线，要么彻底改为指向 Perseus / GitHub 的外部资源跳转。不要在没有审校能力时重新扩大内容维护范围。

---

## 二、明确不做（除非产品定位改变）

以下是本轮冻结决策的直接推论，记录在此以免以后重复讨论：

- **AI 解题 / AI 助手** —— `aiAssistant` flag 保持 false；
- **Leo AI 集成** —— 保持独立，不合并；
- **Leo Tree 集成** —— 不做知识图谱、账户、数据层整合；
- **挑战赛 / 排行榜** —— `challenge` flag 保持 false；
- **社区与社交** —— `social` flag 保持 false；
- **站内公开投稿** —— `publicContribution` 保持 false，贡献路径只有 GitHub PR；
- **附件上传** —— `attachmentUpload` 保持 false；
- **学习日记** —— `learningJournal` 保持 false。

以上每一项在代码里都有对应的 feature flag 和策略测试（`tests/public-product-policy.test.ts`）。如果将来要开启，必须同时更新 flag、测试和 README，不能只改 flag。

---

## 三、如果将来要做真正的账户系统

当前的 `localIdentityPrototype` **不能**作为起点：

- 密码以明文存入 `localStorage`；
- 没有服务端校验、没有找回、没有跨设备同步；
- 没有速率限制、没有会话过期。

它只是本地开发用的占位实现，生产构建中已被 `FeatureRoute` 完全拦截。真做账户系统时应当整体替换，而不是在它上面增量开发。
