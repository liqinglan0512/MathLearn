# MathForge 0.2 编辑与发布工作流

> 当前工作流用于本地开发环境中的《几何原本》编辑试验。它能阻止正常 UI 和领域函数中的误操作，并用 Web Locks 协调同源标签页写入；但没有服务端身份、数据库审计、跨设备多人协作锁或防篡改签名，不能作为生产出版系统的安全证明。

## 1. 入口与适用范围

内部编辑页路由为 `/internal/euclid/:id/edit`。它只有在以下两个客户端条件同时满足时显示：

1. Vite 开发模式使 `adminContentManagement` 为 true；
2. 当前 localStorage 用户记录的 `isAdmin` 为 true。

生产构建默认关闭该入口。当前普通公开投稿、解法投稿、试卷上传、推导投稿和附件上传也全部关闭。

## 2. 从静态条目到本地 v1

编辑器先通过 `EuclidRepository.loadEntry(id)` 读取并校验静态 entry，然后调用 `EditorialStore.initializeEuclidEntry`。首次初始化会创建：

- private `ContentItem`；
- machine-origin Revision v1；
- `euclidStatus: raw_machine`；
- publication `draft`；
- 保留原 entry 的 stable block ID 与 order；
- 绑定静态底本的 `revisionId + contentHash`；
- 无 Review、无审核事件、无发布指针。

重复打开同一条目时，只有本地 `sourceBinding` 与当前静态 payload 完全一致才返回已有历史。旧记录缺少绑定或底本已变化时会 fail closed：不覆盖、不重播种、不把旧中文叠到新英文上，必须人工迁移。

## 3. 三栏编辑

当前内部编辑器区分：

| 栏 | 内容 | 是否可编辑 |
|---|---|---|
| 来源 | Heath 英文、历史中译或来源缺口表面 | 否 |
| 机器 | 机器中文、历史文本机器解释或来源提示 | 否 |
| 正式中文 | 将保存为人工 Revision 的块正文 | 是 |

编辑者可以逐块核对来源与机器稿。每块仍使用原永久 ID，例如 statement、construction.1、proof.1；保存不能以数组位置重建身份。

“疑似误译”“待数学审核”是辅助 flag，存于独立 localStorage key。它们不等同于 Review，不会自动改变 `raw_machine`、`editor_draft` 或 publication 状态。

## 4. 保存人工稿

保存动作调用 `appendEditorDraft`，要求：

- actor 为 human；
- actor 含 editor 或 admin 角色；
- `changeSummary` 非空；
- 页面打开时的 `expectedPreviousRevisionId` 仍是当前最新版本；
- 全部永久 block ID 与 kind 得到保留；
- 语义块数据通过唯一 ID、唯一 order、非空正文等校验；
- 不能把块直接写为 `math_reviewed` 或 `published`。

保存结果是新 Revision：

```text
v1 raw_machine
  └─ v2 editor_draft
       └─ v3 editor_draft
```

旧版保持可按 version 读取。保存本身不会提交审核、批准、确认数学审核或发布。

编辑器会追踪 dirty 状态：正文未保存时禁用 Review 和所有状态操作，并明确显示这些操作将绑定的 Revision ID。数据层也检查预期前序版本；另一个标签页先追加 Revision 后，陈旧页面不能静默覆盖历史。

## 5. 五维人工 Review

Review 必须由 human editor、math_reviewer 或 admin 创建，并包含非空摘要。五个维度为：

- 数学正确性；
- 严谨性；
- 完整性；
- 清晰度；
- 来源核验。

Review 只能绑定当前 Revision。记录保持追加式，同一 Revision 的最后一份 Review 是当前有效结论：后续 `needs_changes` 会撤销更早的通过。当前完成规则是五项全部 `passed`，不是“多数通过”，`not_applicable` 也不计为完整。

保存 Review 不会自动改变状态。编辑器需要继续执行显式的“提交审核”“批准 Revision”“确认 math_reviewed”“发布”等动作。

一旦 Revision 曾达到 `math_reviewed`、approved 或 published，不能再在同一版本上直接追加 `needs_changes` 或未完成 Review；判定依据包括不可变 workflow 事件历史，不能通过先退回状态绕过。发现新问题时必须：approved 先退回 `revision_requested`，published 先归档；随后编辑并保存新的 `editor_draft`，把否决 Review 绑定到新 Revision。这样旧版保留其历史审核事实，新版承载新问题，不会出现“最新 Review 否决，但页面仍称旧版本已数学审核”的矛盾。

## 6. 发布生命周期

| 当前状态 | 允许目标 | 动作 | 允许角色 |
|---|---|---|---|
| `draft` | `pending_review` | submit_for_review | contributor/editor/admin |
| `draft` | `archived` | archive | publisher/admin |
| `pending_review` | `revision_requested` | request_revision | editor/math_reviewer/admin |
| `pending_review` | `approved` | approve | editor/math_reviewer/admin |
| `pending_review` | `rejected` | reject | editor/math_reviewer/admin |
| `pending_review` | `archived` | archive | publisher/admin |
| `revision_requested` | `pending_review` | submit_for_review | contributor/editor/admin |
| `revision_requested` | `archived` | archive | publisher/admin |
| `approved` | `published` | publish | publisher/admin |
| `approved` | `revision_requested` | request_revision | editor/math_reviewer/admin |
| `approved` | `archived` | archive | publisher/admin |
| `published` | `archived` | archive | publisher/admin |
| `rejected` | `archived` | archive | publisher/admin |

每次状态变化必须记录永久 event ID、Revision ID、前后状态、actor、时间和非空理由。系统 actor 一律不能执行这些人工工作流动作。

## 7. Euclid 状态与发布门槛

Euclid 的人工状态路径只有：

```text
raw_machine --人工编辑保存--> editor_draft
editor_draft --数学审核确认--> math_reviewed
math_reviewed --发布动作--> published
```

当前门槛为：

1. `approved` 前，必须存在同一 Revision 的完整五维 Review；
2. `math_reviewed` 前，`EditorialStore` 再次要求同一 Revision 的完整五维 Review；
3. `published` 前，publication 必须处于 approved，Euclid 状态必须是 math_reviewed，且最新 Review 仍须完整通过；
4. 发布时 publication 和 Euclid 状态在同一个事件中共同进入 published；
5. 非归档的 publication 状态变更只允许作用于当前 Revision；内部 UI 也只操作最新 Revision。

因此以下路径均会被拒绝：

- machine/system 自动审核或发布；
- `raw_machine → math_reviewed` 跳级；
- `pending_review → published` 跳级；
- 没有完整 Review 就批准或确认数学审核；
- 使用旧 Revision 的 Review 批准新 Revision；
- 对历史 Revision 新增 Review 或推进 Euclid/publication 状态；
- 在已 `math_reviewed`、approved 或 published 的同一 Revision 上追加 `needs_changes`；必须先退回/归档并建立新 Revision；
- 把 machine v1 原地升级为 editor_draft、批准或发布；
- 保存编辑稿时直接写 published。

## 8. 角色模型的真实含义

领域工作流定义 reader、contributor、editor、math_reviewer、publisher、admin 六种角色，并在纯函数中检查动作对应角色。

但是当前 EuclidEditor 只要取得客户端 `user`，就构造含 admin、editor、math_reviewer、publisher 的 WorkflowActor；外围 `AdminRoute` 依赖同一个可篡改的 `user.isAdmin`。这适合单人本地试验，不形成职责分离，也不能证明审核者与发布者是不同的人。

在生产系统中，至少需要服务端签发身份、服务端角色映射、动作再次授权、不可变审计记录，并按政策决定是否强制编辑/数学审核/发布三人分离。

## 9. 公开投稿冻结

0.2 当前不允许普通用户提交题目、解法、试卷或第一性原理文章，也不允许附件上传。冻结同时落实在：

- 导航和页面按钮可见性；
- 投稿路由 `FeatureRoute`；
- `store.addProblem/addSolution/addArticle/addPaper` 数据入口；
- 附件权限与 MIME 白名单检查。

这是产品一致性保护，不是攻击面防护。前端 bundle、localStorage 和函数调用都处于用户控制之下；真正公开部署前仍需服务端拒绝未经授权的写请求。

## 10. 本地存储与损坏处理

编辑数据使用 `mf_editorial_store_v1`，每条 entry 保存：

- ContentItem；
- 静态底本 `sourceBinding`；
- 全部 Revision；
- 每个 Revision 的 workflow 与事件；
- 全部 Review。

读取时会重放并核验事件链。每次修改先取得按 storage key 命名的同源 Web Locks 独占锁，再在锁内重新读取、构建、完整 hydrate 校验并写回。两个遵守该协议的标签页不能同时基于同一个旧 Revision 成功保存；后取得锁的一方会看到更新后的基线并被拒绝。浏览器不支持 Web Locks 时，写操作 fail closed，不回退到不可靠的 localStorage check-then-set。

锁内仍会比较事务开始时的原始字节，以发现不遵守锁协议的外部改写；该检查不是原子 CAS，也不是数据库事务。若出现非法 JSON、未知 schema、Revision 断链、伪造状态、无 Review 的 approved/published、已审核状态与最新否决 Review 冲突、公开指针不一致等情况：

- `inspect()` 返回 `ok: false`、安全空 entries 和显式 corruption error；
- 普通读取抛错；
- 原始 localStorage 字节保持不变；
- 阅读器不把该数据当作本地已发布内容。

这是一种 fail-closed 的客户端读取策略，不意味着数据无法被删除或替换。

## 11. 回滚操作规程

当前没有覆盖式回滚，也不应添加覆盖式回滚。恢复旧文案应遵循：

1. 使用 `getRevisionByVersion` 读取目标历史版本；
2. 将其块正文复制为一个新的 editor_draft；
3. 保留 stable block ID 和 order；
4. 在 `changeSummary` 中说明恢复来源与理由；
5. 对新 Revision 重新走 Review、批准、数学审核和发布。

归档当前已发布 Revision 时，存储会寻找更早且仍为 published 的 Revision 作为公开回退；若没有，则内容恢复 private。当前编辑 UI 尚未提供完整的历史恢复向导，操作前应导出备份并通过测试或脚本核验状态。

## 12. schema 迁移规程

当前策略是“未知版本不自动迁移”。未来 v2 至少应：

1. 先原样导出 `mf_editorial_store_v1`；
2. 使用新 key 写入迁移结果，不原地覆盖 v1；
3. 核对 entry 数、Revision 数、版本链、block ID/order、Review、事件 ID 与 published 指针；
4. 对迁移结果运行同一套 hydrate/事件重放校验；
5. 保留可回退到 v1 的路径；
6. 只有验证成功后才让新代码读取 v2。

不能以“解析失败就重新播种”处理编辑历史，也不能在迁移中把 `raw_machine` 推断为 `editor_draft` 或 `math_reviewed`。

## 13. 上线前仍需补齐

- 服务端用户、会话与 RBAC；
- 持久数据库和并发冲突处理；
- 审核人与发布人的可验证身份；
- append-only 审计日志或签名发布包；
- 正式备份、导出、恢复和 schema 迁移工具；
- 将 passage discussion 与 `AnnotationIssue` 工作流正式整合；
- 按 Revision 固定来源、边与可视化版本；
- 生产环境端到端授权测试。
