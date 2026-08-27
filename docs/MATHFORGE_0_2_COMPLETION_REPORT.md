# MathForge 0.2 完成报告

> 报告基准：2026-08-27，本地工作区验收快照
> 本报告中的“完成”只表示附件约定的 **MathForge 0.2 本地前端试验范围** 已有对应实现和可复验依据，不表示数学内容已经审校，也不表示生产服务已经上线。

## 1. 状态口径

本报告只使用以下四种状态：

| 状态 | 含义 |
| --- | --- |
| **已完成** | 本地工程范围内已有实现、文档或自动校验依据。 |
| **部分完成** | 核心结构已经建立，但仍有明确未接线能力、原型边界或生产化缺口。 |
| **未完成** | 当前工作区没有完成该交付，不能用计划代替结果。 |
| **需Leo人工操作** | 必须由 Leo 作数学判断、账户/服务器操作或发布决定，自动化不能代替。 |

## 2. 不可误读的结论

1. **607 条《几何原本》内容全部仍是 `raw_machine`。** Catalog、卷索引、条目、Revision 和 SemanticBlock 均不得因为翻译覆盖完整、格式检查通过或页面可用而自动升级。
2. **Book I 的 Definitions、Postulates、Common Notions、I.1–I.10 与 I.47 只是人工编辑试验范围，当前尚未完成 Leo 的逐条人工数学审校。** 试验范围不是“已审核内容名单”。
3. 原始语料 `src/lib/euclid-data.json` 与 `src/lib/euclid-modern-zh.json` 未改写；分层数据由生成脚本派生。最近一次语料完整性校验记录的 SHA-256 分别为 `9e9e202b723cef031c3f18fd4dc7494c3e07ae3cf098a85f8a328ae5659ecced` 与 `8e0f68d52308cfa4e8187e0e37bf8aeba7c860623ca4470b2f1d7a184e0ed1ad`。
4. 可视化可信等级已经建立，但当前 `verified = 0`。`proposition_specific` 也不等于已核验；所有图仍需人工核对后才能进入 `verified`。
5. 账户、编辑记录、批注、评论和本地试验事件主要保存在浏览器。**localStorage 和前端身份不构成安全后端，也不构成生产级认证、授权、备份或多用户一致性保证。**
6. 公开投稿与附件上传保持冻结。任何未来开放都必须重新经过服务端权限、审核、文件安全和数据迁移设计，不能只翻转前端开关。

## 3. 附件 Phase 逐项映射

### Phase 0：总原则与范围冻结

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 不新增挑战赛、成长日记、AI、实验室、题库、上传等横向能力 | **已完成** | 0.2 改动集中在冻结、模型、可信语料、编辑原型、加载和质量门槛；未引入 AI provider 或聊天能力。 |
| 不擅自把机器数学内容标记为已审核 | **已完成** | 模型和工作流要求机器 Revision 从 `raw_machine` 开始，升级需要同版人工 Review 与人工角色动作。全库仍为 `raw_machine`。 |
| 不破坏原始数学数据 | **已完成** | 两份源 JSON 保留，派生数据写入 `public/content/euclid/`；校验脚本逐条比对正文并核对源文件哈希。 |

### Phase 1：基线审计

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 建立修改前基线审计 | **已完成** | `docs/MATHFORGE_0_2_BASELINE_AUDIT.md` 记录技术栈、路由、数据、存储、权限、上传、Euclid 加载、质量与预计改动。 |

### Phase 2：功能冻结与普通用户上传关闭

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 统一 Feature Flags | **已完成** | `src/config/features.ts` 集中管理投稿、附件、挑战、日记、AI 与开发态内部编辑。 |
| UI 层隐藏普通投稿和附件入口 | **已完成** | 列表、详情与导航根据统一开关隐藏入口，附件组件在冻结态拒绝选择文件。 |
| Router 层阻止手动访问投稿页面 | **已完成** | 投稿路由由 `FeatureRoute` 守卫，内部编辑路由由 `AdminRoute` 守卫。 |
| Data layer 阻止投稿与附件写入 | **已完成** | Store 写操作调用权限断言；附件还检查冻结状态与 MIME 白名单。此结论只覆盖当前前端数据层，不等于服务端安全。 |
| 发布语义改为显式审核状态机 | **已完成** | `draft → pending_review → revision_requested/approved/rejected → published/archived` 已有模型、权限与测试。公开投稿 UI 仍冻结。 |
| 显示本地原型提示 | **已完成** | 全站页脚明确说明账户、批注和学习数据只在当前浏览器保存。 |

### Phase 3：工程清理

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| `.gitignore` 与仓库卫生 | **已完成** | 自动检查禁止提交依赖、构建、覆盖率、浏览器 profile、调试输出和本地任务状态。 |
| 删除废弃黑洞实现 | **已完成** | 旧 `BlackHole` / `WebGLBlackHole` 源文件已移除，卫生脚本检查其不会回流。 |
| Package 元数据 | **已完成** | 包名为 `mathforge` 且保持 `private: true`，没有擅自配置 npm 发布。 |
| README | **已完成** | 已说明定位、阶段、技术栈、命令、目录、localStorage、投稿冻结、Euclid 试验状态与安全边界。 |

### Phase 4：工程质量门槛

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| lint 0 errors | **已完成** | 本地质量门槛包含 ESLint；最终命令结果见 `docs/TEST_REPORT.md`。 |
| dev/build/lint/typecheck/test scripts | **已完成** | `package.json` 已提供这些命令，并增加数学标记、仓库卫生与 0.2 contract 检查。 |
| 模型、锚点、依赖、权限自动测试 | **已完成** | Vitest 覆盖 Revision、Visibility、Review、Edge、Annotation anchor、权限、编辑存储、Euclid repository、可视化 attestation、数学渲染与本地事件。 |
| CI 配置 | **部分完成** | `.github/workflows/ci.yml` 已配置 `npm ci`、typecheck、lint、test、数学标记、仓库卫生、0.2 contracts 和 build；尚未通过本轮 GitHub 推送触发远端 CI。 |

### Phase 5：性能与加载架构

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 主要页面 route-level lazy loading | **已完成** | 登录、题库、试卷、第一性原理、详情、实验室、工具和内部编辑按路由拆分；首页与共享 Layout 保持入口必需代码。 |
| 首页不加载整部 Euclid | **已完成** | Euclid 语料不再通过应用 seed 进入首页依赖链。 |
| Catalog → Book index → Entry 分级加载 | **已完成** | 生成 1 个 catalog、13 个卷索引和 607 个单条 payload；repository 只 fetch 所请求资源并做运行时校验。 |
| 本地浏览器请求链 | **已完成** | 真实 Chromium/CDP 记录：首页无 Euclid 请求；目录只取 catalog；选择 Book I 只取 `01.index.json`；I.47 与 I.Def.1 各只取自身 entry。 |
| 构建与加载基线文档 | **已完成** | 修改前后体积、初始入口、Euclid 路由与最大 chunk 记录在 `docs/PERFORMANCE_BASELINE_0_2.md`；数据 payload 体积另由 Euclid 校验脚本输出。 |

### Phase 6：核心数据模型

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| ContentItem / Revision / SemanticBlock | **已完成** | 正式内容使用不可变 Revision，SemanticBlock ID 与展示顺序解耦，旧版不被覆盖。 |
| Edge 与 provenance | **已完成** | 支持约定关系类型，并区分 `explicit_source_reference` 与 `editorial_inference`。 |
| Annotation / Issue | **部分完成** | 领域模型包含类型、状态和 revision/block/version/range/quote/context 锚点；当前阅读页主要实现本地划线讨论，完整 Issue 审核流尚未接入 UI 与后端。 |
| Review | **已完成** | 结构覆盖五维审核、审核人、Revision 与时间；只允许当前 Revision，最后一份结论有效，后续 `needs_changes` 会阻止沿用旧通过结果发布。 |
| Visibility | **已完成** | 支持 private/restricted/public，restricted 要求明确且不重复的用户白名单。当前仍是前端模型，不是服务端访问控制。 |

### Phase 7：《几何原本》状态系统

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| `raw_machine → editor_draft → math_reviewed → published` | **已完成** | 转换有角色、理由、同版 Review 和事件链约束；不能跳级。 |
| 状态与 Revision 绑定 | **已完成** | 每个 Revision 有独立 workflow；发布只指向通过事件链的当前 Revision，本地历史另绑定静态语料 Revision ID 与内容哈希。 |
| 机器内容不自动升级 | **已完成** | 数据生成、hydrate 与工作流均拒绝把机器稿自动当作编辑稿、已审校或已发布内容；machine v1 必须先追加 human-origin editor_draft。 |
| 全库内容现状 | **需Leo人工操作** | 607 条均为 `raw_machine`。自动化不能替 Leo 完成数学判断。 |

### Phase 8：内部编辑后台

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 英文/历史底本、机器草稿、正式中文三栏 | **已完成** | 宽屏三栏、窄屏切换；机器稿只读，正式中文按 block 编辑。 |
| 修改说明、block 状态、新 Revision、历史 | **已完成** | 保存要求修改说明，保留永久 block ID，并追加本地 Revision 历史；同源标签页写事务由 Web Locks 串行化，陈旧基线和未保存正文上的审核动作会被拒绝；缺少锁能力时保持只读。 |
| 独立 Review 与发布动作 | **已完成** | 保存不发布；审核维度、理由和角色动作分开，异常只 flag、不自动改写。 |
| 生产级编辑后台 | **部分完成** | 当前只在开发模式向本地管理员原型账户开放，数据在 localStorage；没有服务端锁、并发编辑、备份、真实审计身份或生产 RBAC。 |

### Phase 9：可视化可信等级

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 四级可信模型和标签 | **已完成** | `none / concept_illustration / proposition_specific / verified` 已进入数据、UI 与校验。 |
| 防止通用图冒充命题构造 | **已完成** | 通用图标为“相关概念示意”；I.47 使用专用直角三角形 renderer；I.48 因旧图预设直角结论，已降为 `concept-triangle` 概念图；未知 renderer 不再渲染。 |
| `verified` 凭据约束 | **已完成** | 必须有 review ID、审核人、审核时间、当前内容哈希，并且 renderer revision 精确匹配中立的当前 renderer manifest；裸声明、未知 renderer 或旧 revision 均被 schema 拒绝或在展示层安全降级。 |
| 人工核验命题交互构造 | **需Leo人工操作** | 当前统计为 `none=142`、`concept_illustration=462`、`proposition_specific=3`、`verified=0`。 |

### Phase 10：正式试验范围

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 锁定 Book I 试验清单 | **已完成** | 试验范围为 Book I Definitions、Postulates、Common Notions、I.1–I.10、I.47；工程没有声称全面人工修订 607 条。 |
| 逐条人工数学与来源审核 | **需Leo人工操作** | 上述清单当前仍只是试验范围，尚未完成人工数学审校，也未发布。 |

### Phase 11：封闭测试基础

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| 六类匿名本地事件模型 | **已完成** | 已定义 opened/followed/returned/created/resolved/self-explanation 六种结构，并限制本地最多 1,000 条。 |
| 阅读页事件接线 | **部分完成** | 当前已接 `opened_proposition`、`followed_dependency`、`returned_from_dependency`；`created_annotation`、`resolved_annotation`、`self_explanation_submitted` 尚未完整接入交互。 |
| 隐私上传 | **已完成** | 事件只写本地，不上传真实用户隐私。它不是 analytics 平台。 |

### Phase 12–14：安全、禁止事项与执行纪律

| 验收项 | 状态 | 当前依据与边界 |
| --- | --- | --- |
| Public file upload disabled | **已完成** | UI、路由、数据层均冻结；HTML/SVG/ZIP/任意 MIME 不在允许范围。 |
| Markdown 不启用 raw HTML | **已完成** | 渲染链只使用 math 与 KaTeX 插件，没有启用 `rehype-raw`。 |
| 无 AI 自动审核/自动发布/破坏性迁移 | **已完成** | 工作流保留人工最终判断，损坏或未知本地数据不会被自动当作已发布正文。 |
| 每阶段质量复核 | **部分完成** | 最终本地 `npm run check` 与核心 Chromium QA 已通过；远端 CI、部署和公网 QA 仍未完成。 |

### Phase 15：要求文档

| 文档 | 状态 |
| --- | --- |
| `MATHFORGE_0_2_BASELINE_AUDIT.md` | **已完成** |
| `MATHFORGE_0_2_ARCHITECTURE.md` | **已完成** |
| `CONTENT_MODEL.md` | **已完成** |
| `EDITORIAL_WORKFLOW.md` | **已完成** |
| `PERMISSION_MODEL.md` | **已完成** |
| `PERFORMANCE_BASELINE_0_2.md` | **已完成** |
| `TEST_REPORT.md` | **已完成** |
| `MATHFORGE_0_2_COMPLETION_REPORT.md` | **已完成** |

`node scripts/verify-completion-docs.mjs` 检查八份文档存在，并检查本报告是否明确写出最关键的信任和发布边界；它不把整段自然语言锁死为固定模板。

## 4. 最终验收标准映射

| 附件验收标准 | 状态 | 说明 |
| --- | --- | --- |
| 普通用户不能上传附件 | **已完成** | 三层冻结；仅为当前前端原型范围。 |
| 普通用户不能绕过 UI 直接发布 | **已完成** | Router 与数据写入均有守卫；localStorage 可被浏览器所有者篡改，因此不构成安全后端。 |
| 正式内容支持审核状态 | **已完成** | Publication 与 Euclid 状态机分离并有事件历史。 |
| lint = 0 errors | **已完成** | 见测试报告。 |
| typecheck pass | **已完成** | 见测试报告。 |
| test pass | **已完成** | 见测试报告。 |
| build pass | **已完成** | 见测试报告。 |
| CI 建立 | **部分完成** | Workflow 已建立；远端运行等待推送。 |
| 首页不再预加载整部 Euclid | **已完成** | 首屏不依赖 607 条正文。 |
| Euclid 按需加载 | **已完成** | Catalog → 卷索引 → 单条正文。 |
| Content / Revision / Block / Edge / Annotation / Review / Visibility 模型 | **已完成** | 模型与自动测试存在；部分 UI/后端能力仍见边界章节。 |
| raw machine translation 不等于 published | **已完成** | 全库 607 条仍为 `raw_machine`。 |
| editor backend 可按 block 编辑 | **部分完成** | 本地内部编辑原型已可用；“backend”目前不是服务端。 |
| revision history 可追踪 | **已完成** | 本地追加式 Revision 与 workflow event history。 |
| explicit reference 与 editorial inference 分离 | **已完成** | 数据模型、Euclid 边与 UI 文案明确区分。 |
| visualization trust level 建立 | **已完成** | 当前 `verified=0`。 |
| README 完成 | **已完成** | 已替换默认模板并写明 0.2 边界。 |
| 无 node_modules / profile / debug garbage 进入源码包 | **已完成** | `.gitignore`、卫生脚本和测试共同检查。 |

## 5. 四个关键实现边界

### 5.1 划线评论与 Annotation anchor

**已完成：** 阅读页划线讨论绑定稳定 `blockId`、内容 `version`、`start/end`、`quote`、`prefix/suffix`。轻微改文后会先尝试精确位置，再依赖引文与上下文重新定位；无法可靠定位时显示为旧版本讨论，而不是静默错贴。

**部分完成：** 当前讨论存于 localStorage。完整 Annotation / Issue 类型和状态已经进入领域模型，但“确认、解决、重复、拒绝”等审核流尚未成为服务端协作系统；跨设备同步、并发冲突、反垃圾和身份可信均未实现。

### 5.2 证明依赖图

**已完成：** 607 条派生 payload 包含显式 outgoing/incoming edge、依赖与反向依赖，并保留边 provenance。阅读页提供“本证明依赖”和“哪些条目使用本结论”双向导航；源数据异常不会被偷偷修掉，而以 `source_issue` 披露。无法可靠落到单一步骤的组合引用会明确显示为“条目级引用尚未定位”，不会伪造 proof-block 定位。

**部分完成：** 当前是可信的图数据与双向列表导航，不是完整的可缩放图谱画布。编辑推断边已有模型，但没有生产级图编辑器、合并审计和服务端持久化。

### 5.3 内部编辑器

**已完成：** 可按永久 block ID 对照底本与机器稿编辑正式中文、添加修改说明、追加 Revision、查看历史、保存多维 Review、标记来源/疑似误译，并通过独立动作推进状态。页面展示审核绑定的 Revision；有未保存正文时禁止审核，底本绑定变化时停止覆盖并等待人工迁移。

**部分完成：** 它是开发模式、本地管理员、单浏览器试验工具。前端 `isAdmin` 和本地事件记录不能证明真实操作者身份；只有同源标签页 Web Locks，没有生产数据库、签名审计、服务端/跨设备并发锁或灾备。

### 5.4 本地试验事件

**已完成：** 六类事件结构与防损坏读取、容量上限、清理和测试已建立，且不上传隐私。

**部分完成：** 页面目前只接线打开命题、进入依赖、从依赖返回三类事件；创建/解决批注和自我解释仍只是模型能力。事件可被本机用户修改，不能当作可信统计或研究数据。

## 6. 《几何原本》数据与信任状态

最近一次分层语料校验结果：

| 项目 | 结果 |
| --- | ---: |
| 卷 | 13 |
| 条目 | 607 |
| 派生文件 | 621（1 catalog + 13 indexes + 607 entries） |
| 稳定语义块 | 7,152 |
| 显式依赖边 | 1,925 |
| 已披露 source issue | 21 |
| `raw_machine` 条目 | 607 |
| `verified` 可视化 | 0 |

两处必须保留的源问题也在校验中锁定：X.28 的自引用/条目内引理引用保留并标记，VI.Def.5 的上游底本缺失保留并披露。自动化不替原典作猜测性修复。

I.47 的现代解释、替代证明和常见错误保留为带稳定 ID、Revision 与 provenance 的站内补充草稿；它们逐块显示 `raw_machine` 和“未经人工数学审核”，参考链接也明确不属于 Heath 原文依赖图。

## 7. 已知风险

1. **localStorage limitation：** 清理浏览器、换设备、无痕模式或配额异常都可能造成数据丢失；同源标签页写入由 Web Locks 串行化，锁内字节复核不冒充原子 CAS，且仍没有云备份、数据库事务、跨设备协调或自动冲突合并。
2. **authentication prototype：** 密码、会话和 `isAdmin` 属于前端原型数据；不是安全认证，不能保护真正的生产后台。
3. **unpublished machine content：** 607 条中文仍可能有语言、条件或证明错误，页面可阅读不等于可出版。
4. **migration risks：** 编辑存储有 schema 版本和保守读取，但没有生产数据迁移、回滚演练与备份恢复流程。
5. **security limitations：** 关闭入口能防止当前应用正常路径写入，但不能代替服务端鉴权、速率限制、内容净化、审计日志和文件隔离。
6. **visualization risk：** `concept_illustration` 与 `proposition_specific` 都可能与命题构造不完全一致，当前没有一项达到 `verified`。
7. **source provenance risk：** 自动提取依赖仍包含已披露的 source issue；这些问题必须由编辑核对原始出处。

## 8. Leo 人工工作项

| 人工事项 | 状态 | 完成条件 |
| --- | --- | --- |
| 审校 Book I 试验范围 | **需Leo人工操作** | 逐条核对英文/历史文本、现代中文、条件、证明步骤、引用与图；保存人工 Review。 |
| 批准 `math_reviewed` | **需Leo人工操作** | 同一 Revision 的五个审核维度均有可追溯人工结论，且不存在未处理的关键问题。 |
| 批准发布 | **需Leo人工操作** | 人工确认当前 Revision、来源、依赖和可视化后，单独执行发布动作。 |
| 核验交互图 | **需Leo人工操作** | 图的自由度、约束、构造顺序与命题逐项对应后，才可考虑 `verified`。 |
| 决定生产身份与后端 | **需Leo人工操作** | 选择服务端认证、数据库、备份、审计和权限方案；不得沿用本地密码模型。 |
| GitHub 凭据、服务器与域名操作 | **需Leo人工操作** | 确认目标仓库/分支、服务器目录、进程管理、TLS、备份和回滚窗口。 |

## 9. 发布状态行（后续执行后直接替换本节三行）

<!-- RELEASE_STATUS_START -->
- **GitHub 推送：未完成（待后续替换）** — 当前报告只确认本地工作区；尚未记录目标 commit、远端分支与 CI 结果。
- **云服务器部署：未完成（待后续替换）** — 尚未记录服务器构建产物、发布目录、进程/静态服务状态与回滚点。
- **线上 QA：未完成（待后续替换）** — 尚未在公网环境核对路由懒加载、607 条按需请求、权限冻结、阅读/批注、移动端与缓存行为。
<!-- RELEASE_STATUS_END -->

替换这些状态时必须附可复验依据，例如 commit SHA、CI URL、部署时间、线上 URL、健康检查和 QA 清单；不能只把“未完成”改成“已完成”。

发布完成后的三行必须使用下列完整字段（替换尖括号内容，不保留示例值）：

```text
- **GitHub 推送：已完成** — commit SHA: <7至40位哈希>；GitHub Actions: https://github.com/<owner>/<repo>/actions/runs/<run-id>；CI: PASS。
- **云服务器部署：已完成** — 部署时间: <YYYY-MM-DD HH:MM:SS+时区>；线上 URL: <http(s) URL>；发布目录: <路径或 artifact>；回滚点: <可恢复版本>；健康检查: PASS (<HTTP 状态>)。
- **线上 QA：已完成** — QA 时间: <YYYY-MM-DD HH:MM:SS+时区>；测试 URL: <http(s) URL>；QA 清单: PASS（<已验证项目>）。
```

## 10. 本地复验入口

```text
npm run typecheck
npm run lint
npm run test
npm run check:latex
npm run check:hygiene
npm run check:contracts
npm run build
npm run check
```

2026-08-27 最终本地聚合检查退出码为 0：11 个测试文件、78 项测试通过；运行时内容共 569 个公式通过 KaTeX 校验；typecheck、全量 lint、787 个仓库候选文件卫生检查、四项 contract 与生产构建均通过。核心浏览器 QA 结果见 `docs/TEST_REPORT.md`。

最终判断应同时看命令结果、八份文档和本报告的人工工作项。工程检查通过不等于数学审核通过，数学审核通过也不等于部署完成。
