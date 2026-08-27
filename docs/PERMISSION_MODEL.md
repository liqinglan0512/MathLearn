# MathForge 0.2 权限模型

> 结论先行：当前权限模型是前端原型中的一致性守卫，不是安全边界。用户、明文密码、`isAdmin` 与 session ID 都保存在 localStorage；拥有浏览器调试权限的人可以修改它们。任何“只有管理员可做”的表述，都只代表正常 UI 与当前客户端函数会拒绝，不代表服务端安全保证。

## 1. 四层客户端守卫

0.2 通过四层减少误操作和普通 UI 绕过：

1. **产品开关**：`FEATURES` 统一决定公开投稿、附件和内部编辑是否开放。
2. **页面可见性**：导航与列表页不显示已冻结入口。
3. **路由守卫**：`FeatureRoute` 拦截投稿页，`AdminRoute` 拦截内部编辑页。
4. **数据/领域守卫**：普通 store 写入前执行权限与附件断言；编辑工作流纯函数检查 human、角色、状态、Review 和理由。

四层的目的，是避免“按钮藏了但手输 URL 仍能发”“页面拦了但直接调用 store 仍能写”这类产品漏洞。它们全部运行在用户设备上，不能抵抗主动篡改。

## 2. 当前 feature flags

| 开关 | 默认值 | 当前效果 |
|---|---:|---|
| `publicContribution` | false | 关闭题目、解法、试卷、推导投稿 |
| `attachmentUpload` | false | 关闭附件上传 |
| `challenge` | false | 功能未开放 |
| `learningJournal` | false | 功能未开放 |
| `aiAssistant` | false | 功能未开放 |
| `adminContentManagement` | `import.meta.env.DEV` | 只在开发构建允许内部编辑入口继续判断管理员 |

生产构建中 `adminContentManagement` 为 false，因此正常页面不能进入内部 Euclid 编辑器。

## 3. 当前身份模型

`AuthProvider` 从 localStorage 读取：

- `mf_users`：用户 ID、昵称、账号、明文密码和 `isAdmin`；
- `mf_session`：当前用户 ID。

注册流程固定创建 `isAdmin: false` 的用户，但没有服务端数据库、密码哈希、签名 session 或 token 校验。管理员身份只能视为本地原型配置。

风险包括：

- 浏览器脚本或用户可直接改 `isAdmin`；
- session ID 可被替换；
- 密码以明文存储；
- 不同设备和浏览器没有统一账户状态；
- 无法可靠证明 workflow event 中的 actor 就是现实中的审核者。

## 4. 普通内容写入权限

| 动作 | UI/路由条件 | 数据层条件 | 当前结果 |
|---|---|---|---|
| 新建题目 | `publicContribution` | actor 存在且开关开启 | 拒绝 |
| 提交解法 | `publicContribution` | actor 存在且开关开启 | 拒绝 |
| 新建试卷 | `publicContribution` | actor 存在且开关开启 | 拒绝 |
| 新建推导 | `publicContribution` | actor 存在且开关开启 | 拒绝 |
| 上传附件 | `attachmentUpload` | 同时要求投稿和附件开关 | 拒绝 |
| 普通评论/划线讨论 | 登录或组件自身条件 | 本地评论存储 | 未纳入正式发布工作流 |

`store.addProblem`、`addSolution`、`addArticle` 和 `addPaper` 都接收 actor 并调用 `assertCanSubmitPublicContent`。带附件的写入还调用 `assertAttachmentsAllowed`。

公开投稿冻结只针对正式内容与附件，不应误写成“站点完全只读”。现有普通评论、点赞、学习记录或本地划线讨论仍属于各自的客户端功能。

## 5. 附件策略

附件当前整体关闭。预留的数据层 allowlist 仅接受：

- `image/png`
- `image/jpeg`
- `image/webp`
- `application/pdf`

SVG、HTML、ZIP 和任意 MIME 均被拒绝，且附件 type 必须与 Data URL MIME 一致。

即使将来打开该开关，这仍不足以成为安全上传系统。生产环境还需服务端重新识别文件类型、限制尺寸和数量、隔离存储、恶意内容扫描、下载响应头与访问授权；不能信任浏览器声明的 MIME 或 Data URL。

## 6. 内部编辑入口

`canUseAdminContentManagement` 要求：

```text
actor.isAdmin === true
AND
FEATURES.adminContentManagement === true
```

`AdminRoute` 在条件失败时显示“内部编辑后台不可用”。公开 Euclid 阅读页只在同一条件成立时显示编辑入口。

这两处检查能阻止正常用户通过页面导航或手输 URL 进入编辑器，但身份和开关仍来自客户端，不能称为后台 ACL。

## 7. 编辑工作流角色

领域模型定义以下角色：

| 角色 | 允许的主要动作 |
|---|---|
| reader | 无编辑升级动作 |
| contributor | 提交 draft/revision_requested 到 pending_review |
| editor | 保存 editor_draft、提交审核、请求修订、批准/驳回、创建 Review、处理 Issue |
| math_reviewer | 请求修订、批准/驳回、创建 Review、确认 math_reviewed、处理 Issue |
| publisher | publish、archive |
| admin | 上述编辑、审核与发布动作 |

所有工作流动作都要求 `actor.kind === human`。system actor 即使带角色也不能升级审核或发布状态。

当前 EuclidEditor 在通过 AdminRoute 后，将当前用户映射为同时拥有 admin、editor、math_reviewer、publisher 的 actor。这是单人试验便利，不是职责分离。领域模型具备分角色表达能力，但 UI 没有真实多角色账户体系。

## 8. 状态守卫

权限不仅由角色决定，还受对象状态限制：

- 所有动作必须遵循固定状态图，不能跳级；
- 每次状态变化需要事件 ID、时间和非空理由；
- 批准要求同一 Revision 的完整五维人工 Review；
- 确认 `math_reviewed` 也要求同版完整 Review；
- Euclid 只有从 approved 且 math_reviewed、并且最新 Review 仍完整通过时才能发布；
- 非当前 Revision 不能新增 Review 或推进 Euclid/publication 状态；当前内部 UI 只操作最新 Revision；
- machine v1 不能原地升级，必须追加人工 editor_draft；
- 有未保存正文时，内部 UI 禁止审核或状态动作；
- 保存 editor_draft 不能顺带写入 reviewed/published。

因此权限模型是“actor + role + object state + evidence”共同决定，而不是单一 `isAdmin` 布尔值。不过这些判断仍需服务端复刻后才具有安全意义。

## 9. Visibility 不是鉴权

内容模型支持 private、restricted 和 public。restricted 保存 allowedUserIds；本地校验只保证列表非空且不重复。

当前没有服务端按 visibility 过滤响应，也没有加密本地内容。任何能读取 localStorage 的脚本或用户都能看到或修改数据。visibility 只应用于内容生命周期表达，不能承载机密信息。

## 10. localStorage 编辑数据的风险

`mf_editorial_store_v1` 对非法结构采用 fail-closed 读取：没有完整 Review 或连续事件链的伪造 published 数据会被拒绝。该机制防止应用无意接受一部分损坏数据，但不等于防篡改，因为攻击者可以整体构造一份内部一致的 JSON，或者修改运行时代码。

当前浏览器编辑入口使用同源 Web Locks 独占锁包住完整的读取、校验和写回；缺少锁能力时拒绝写入。锁内原始字节复核只用于发现不遵守锁协议的外部改写，不是完整 CAS，也不是数据库事务。它没有自动合并能力。另外当前没有：

- 跨设备或服务端多人并发锁与冲突合并；
- 服务端时间；
- actor 签名；
- 防回滚计数器；
- 远程备份与灾难恢复。

## 11. Annotation/Issue 权限

公开划线讨论目前使用本地 passage annotation 存储，作者可创建讨论和回复。正式 `AnnotationIssue` 模型则把状态变更限制为 human editor、math_reviewer 或 admin，并禁止非法终态跳转。

两者尚未完全整合。因此目前不能声称“所有社区评论都经过 Issue 权限模型”，也不能把本地评论当作正式数学勘误结论。

## 12. 生产化最低要求

若要把当前原型升级为可信服务，至少需要：

1. 服务端账户、密码哈希/MFA 与安全 session；
2. 服务端 RBAC/ABAC，并对每个写请求重新授权；
3. 数据库事务、Revision 唯一约束与乐观锁；
4. 服务端追加审计日志、可信时间与 actor 身份；
5. 审核、数学复核、发布的职责分离策略；
6. 文件上传的服务端验证、扫描和隔离；
7. visibility 的服务端查询过滤与对象级授权；
8. 备份、迁移、回滚和审计导出；
9. 对所有拒绝路径和越权场景做集成测试。

在这些能力完成前，文案应使用“本地编辑原型”“客户端守卫”“当前浏览器中的发布状态”，避免使用“安全后台”“可信账户体系”或“全站已审核”。
