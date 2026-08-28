# MathForge 0.3 完成报告

> 版本名称：**MathForge 0.3 — Open Learning Core**  
> 本地收口日期：2026-08-27  
> 结论：0.3 的本地产品重构、自动检查与本地生产构建已经完成；本报告不把“本地通过”写成“已经推送、CI 通过或已经部署”。

## 1. 验收基准

| 项目 | 证据 |
| --- | --- |
| 0.2 基线 commit | `cc2eeba6512e7a48a12e704f26d64dac32c9aa8c` |
| 0.3 最终实现 commit | `e6841ff4511e9aa48ea6f85880bdb1c2355ffab9` |
| 分支 | `main` |
| GitHub repository | `https://github.com/liqinglan0512/MathLearn` |
| Node.js / npm | `v24.16.0` / `12.0.2` |
| `package-lock.json` SHA-256 | `86B69EE8EE1780123F5BC8A2DB2A0460FF33DAC8A9BC83F381B25E383AE25E65` |

“最终实现 commit”指所有产品、代码、测试和基础文档已经合并的稳定本地提交。本完成报告及其校验器属于随后追加的验收证据；Git commit 不能在自身内容中自引用自己的最终 SHA，报告提交号应以本地 `git log -1` 为准。

## 2. 冻结决策复核

0.3 的唯一公开学习闭环是：

```text
Understand
→ Visualize
→ Practice
→ Contribute
```

本轮没有重新开放用户投稿，没有接入 AI，没有建立后端、数据库或 OAuth，没有恢复挑战、学习日记或社交网络，也没有删除《几何原本》语料和长期领域模型。

## 已完成

### 3.1 公开产品重新聚焦

- 主导航固定为：**理解数学 → 可视化 → 练习 → 工具 → GitHub**；
- GitHub 使用精确仓库地址 `https://github.com/liqinglan0512/MathLearn`；
- 首页保留深色、暖色、数学流形视觉，主叙事改为“从直觉出发，走向严格”；
- 首页 CTA 为开始学习、查看 GitHub、探索可视化，没有用少量内容数字制造规模感；
- 公开产品不再突出试卷、登录、注册、上传、社区或《几何原本》。

### 3.2 《几何原本》产品归档

- `FEATURES.euclidPublic=false`；
- 首页、主导航和普通学习目录均不展示 Euclid；
- 普通生产访问 Euclid 详情不会加载条目正文；
- `/internal/euclid` 与 `/internal/euclid/:id/edit` 保留内部恢复和编辑能力，并受内部管理员边界保护；
- Euclid 的批注与评论另受 `localDiscussionPrototype` 控制，未来恢复语料不会自动恢复社交功能；
- 原始语料、派生数据、provenance、source issues、dependency edges、编辑模型和测试均未删除。

归档完整性核验：

- 607 个 entry；
- 13 个卷索引；
- 621 个生成 JSON 文件；
- 7,152 个 SemanticBlock；
- 1,925 条显式 edge；
- 21 个 source issue。

这是产品入口下架，不是机密访问控制。知道精确静态路径的访问者仍可能读取 `public/content/euclid` 资源；若未来要求阻断静态读取，需要部署层能力和单独决策，不能用前端隐藏冒充访问控制。

### 3.3 Open Learning Core

- 建立 `LearningUnitDefinition` / `LearningUnit` schema；
- 将现有 `a1–a14` 的 14 篇正文建立为 `pilot` 学习单元；
- LearningUnit 只引用现有文章，不复制正文，也不虚构正式定义块；
- 前置概念、实际教授概念、后续概念、后续单元、实验和直接练习形成可查询关系；
- 直接练习只从 `ProblemConceptProfile.focusIds` 反向派生；
- `nextConceptIds` 不再把本单元已经教授的概念误称为后续概念；
- Taylor 与 GCD metadata 已按现有正文范围收窄，不把 p5、p6 过度声明为直接配套练习；
- `Problem → prerequisite / focus / extension concepts` 已为 8 道内置题建立保守角色模型；
- 试卷中的宽泛关键词自动推荐已经停用，避免把“正态分布”错误链接到贝叶斯文章或随机游动题。试卷、计时、评分点和未来人工映射字段仍保留。

### 3.4 七个数学实验室

现有七个实验室继续保留：导数、积分、线性变换、Taylor、概率、ODE、自由绘图。每个实验都明确显示：

- 你正在观察什么；
- 改变哪个参数；
- 应该注意什么数学结构或边界。

实验与学习单元的关系来自 LearningUnit；多单元实验另有明确的主学习入口。线性变换实验现在优先关联行列式单元，不再错误优先跳到 Cauchy–Schwarz；概率实验没有冒充已有随机游动文章解释中心极限定理。

### 3.5 公开贡献与本地原型边界

- GitHub Issue / Pull Request / Code Review / Git history 是唯一正式贡献路径；
- `CONTRIBUTING.md` 已说明 What / Why / How verified，以及数学结论、条件、证明和来源的额外要求；
- 未经人工核验的 AI 批量数学内容不得合并；
- PR 合并不等于数学审核、正式发布或 `verified`；
- 普通用户上传、附件和直接发布仍有 UI、路由与数据层冻结；
- 登录、注册直达页保留未来恢复能力，但醒目标注 `LOCAL IDENTITY PROTOTYPE`、不创建云端账户，并提醒不要使用真实密码；
- 生产主导航不展示登录或注册；公开文章和题目不展示本地评论、点赞或划线批注。

### 3.6 文档与自动契约

已建立或更新：

- `README.md`；
- `CONTRIBUTING.md`；
- `docs/MATHFORGE_0_3_PRODUCT_DIRECTION.md`；
- `docs/DEPENDENCY_SECURITY_TRIAGE.md`；
- 本完成报告。

`check:contracts` 会运行产品策略测试，并核对导航、GitHub URL、冻结 feature、Euclid 归档和恢复入口、LearningUnit 关系、历史 0.2 完成文档及本 0.3 完成报告。

## 部分完成

### 4.1 学习内容仍是 pilot

- 14 个 LearningUnit 是现有正文的学习索引，不是 14 个新正式出版单元；
- 并非每个单元都已经填满“问题、直觉、正式定义、证明、反例、可视化、练习、推广”等 14 层；
- `formalDefinitionBlockId` 仍为空，因为本轮没有虚构已经审核的正式定义块；
- 自动测试能证明引用和数据关系一致，不能证明数学正文正确；
- 任何单元从 `pilot` 进入正式课程仍需人工数学审核和 Leo 的发布决定。

### 4.2 关系模型仍有迁移债

- LearningUnit 和 ProblemConceptProfile 是新的公开核心关系；
- 旧 Article/Profile/KnowledgeNode 中仍有历史 `articleIds`、`problemIds`、`labIds` 字段，用于兼容本地旧内容和未来迁移；
- 当前公开核心已避免使用这些旧字段生成已知错误链接，但还没有进行破坏性 schema 清理；
- 试卷题目关系字段保留，但在人工校验映射出现前返回空关系。

### 4.3 本地账户与讨论不是生产社区

账户、学习状态、内部编辑、批注和评论模型继续存在，但主要依赖浏览器 localStorage。它们不提供云端身份、跨设备同步、可靠备份、生产授权或防篡改审计。

### 4.4 依赖安全只完成分诊

- 完整 `npm audit --json`：10 high、1 moderate、1 low，共 12；
- `npm audit --omit=dev --json`：1 high，为 Recharts 依赖树中的 `lodash`；
- 当前源码和生产构建没有 Recharts/lodash 的可达调用，但这不是“漏洞不存在”的声明；
- 本轮没有升级依赖，没有运行 `npm audit fix`，也没有运行 `npm audit fix --force`；
- 建议的兼容升级和风险已记录，但升级后 audit 是否为零尚未验证。

### 4.5 版本与浏览器覆盖

- 产品方向已完成 0.3 收口，但 `package.json` 的 npm package version 仍为历史占位值 `0.0.0`；
- 浏览器 QA 使用本机 Chrome 的桌面视口和 390 × 844 移动模拟，不等于真实 iOS、Android、Safari 和多设备矩阵。

## 未完成

- **未推送 GitHub**：本轮没有执行 `git push`；
- **CI 未运行 0.3 commit**：因为尚未推送，远端 GitHub Actions 没有本轮 commit 的运行记录或 URL；
- **未部署 0.3**：没有发布到云服务器，也没有线上 URL、服务器版本或部署后 smoke test；
- 未建立后端、数据库、OAuth、云端账户或生产 UGC；
- 未接入任何 AI provider、AI 解题、AI tutor、自动证明或 AI 审核；
- 未恢复挑战赛、学习日记、排行榜、点赞、信息流或私信；
- 未正式发布新的数学学习单元；
- 未完成依赖升级或漏洞清零；
- 未为软件、数学正文和历史语料擅自添加许可证。

这些事项有些是本轮有意不做的产品边界，并不等同于遗留缺陷。

## 需要 Leo 决策

1. **软件许可证**：代码是否采用 MIT、Apache-2.0 或其他许可证；
2. **数学内容许可证**：原创解释、题目、证明和图示如何授权；
3. **历史语料权利**：《几何原本》英文底本、历史中译、现代翻译与派生 JSON 的来源和再分发口径；
4. **正式学习单元**：哪些 pilot 最先进入人工数学审核和正式发布；
5. **依赖修复时机**：是否按安全分诊报告建立独立兼容升级 PR；
6. **私密安全渠道**：公开 Issue 之外是否建立 private vulnerability reporting；
7. **包版本口径**：何时将 npm package version 从 `0.0.0` 对齐到产品版本；
8. **发布授权**：何时推送、触发 CI，以及是否部署到云服务器。

## 7. 自动质量证据

本地完整质量命令：

```text
npm run check
```

最终结果：

| 质量门 | 结果 |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS，0 error |
| Vitest | PASS，16 个 test file / 100 项 test |
| LaTeX | PASS，569 个公式 / 0 error |
| Repository hygiene | PASS |
| Product / feature / Euclid / completion contracts | PASS |
| Production build | PASS，2,130 modules transformed |

构建仍报告一个非失败警告：`vendor` JavaScript chunk 约 834.55 kB，超过 Vite 默认 500 kB 提示线。本轮禁止为包体积进行激进依赖重构，因此只记录，不伪装成已解决。

## 8. 本地浏览器 QA

环境：本地 production preview `http://127.0.0.1:4175`，Chrome；同时检查桌面与 390 × 844 移动视口。

| 场景 | 结果 |
| --- | --- |
| `/` | 主标题、三项 CTA、五项导航与 GitHub 地址正确；无登录、注册或 Euclid 入口 |
| `/principles` | 显示 14 个 pilot LearningUnit；不加载 Euclid catalog 或 entry resource |
| `/principles/euclid-1-47` | 匿名生产访问显示内部不可用；不加载 Euclid 正文和 entry JSON |
| `/viz?lab=probability` | 七个实验 tab 和三类观察提示存在；没有错误的随机游动学习文章链接 |
| 实验 → `/problems?q=概率` | 查询参数可见，能筛出概率相关题目 |
| `/principles/a3` | `\varepsilon > 0` 以 KaTeX 公式渲染，无原始 `$...$` 或 `\varepsilon` 泄漏 |
| `/principles/a13` | 前置知识只显示导数与差商，没有把本单元中值定理当成自身前置 |
| `/problems/p8` | 关联随机游动学习单元；生产界面无评论和点赞 |
| `/login` | 直达页明确标注本地身份原型、非云端账户和真实密码警告 |
| 移动首页、文章、可视化 | 菜单只有五项公开导航；无水平溢出；长公式以 KaTeX 正常显示 |

浏览器 QA 证明本机构建在这些路径上的行为，不是远端 CI 或云服务器证据。

## 9. 发布证据状态

| 阶段 | 状态 | 可提供证据 |
| --- | --- | --- |
| 本地实现 | 已完成 | `e6841ff4511e9aa48ea6f85880bdb1c2355ffab9` |
| 本地完整检查 | 已完成 | 本报告第 7 节 |
| 本地生产浏览器 QA | 已完成 | 本报告第 8 节 |
| GitHub push | 未完成 | 无远端 0.3 commit |
| GitHub Actions CI | 未完成 | 无本轮 run URL |
| 云服务器部署 | 未完成 | 无线上版本、部署日志或部署后 smoke test |

因此当前准确状态是：**MathForge 0.3 本地工程收口完成，尚未形成远端发布。**

## 10. 证据边界

- 本轮没有修改现有文章正文或数学结论；变化集中在产品公开面、关系 metadata、实验指导、冻结开关、测试和文档；
- `pilot`、`math_reviewed`、`verified` 和正式发布是不同状态，不能由测试通过互相替代；
- 本报告记录点时间事实。依赖 advisory、浏览器行为和远端状态会变化，未来发布前必须重新验证。
