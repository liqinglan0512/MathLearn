# MathForge 0.2 基线审计

> 审计日期：2026-08-27<br>
> 基线提交：`48b483dd5390f343dfb784fcd3edab58dbf33f5b`<br>
> 审计方式：先只读检查代码、Git 状态、构建产物和质量命令，再记录结论。本文描述的是修改前状态，不代表目标状态已经实现。

## 1. 当前技术栈

- React 19.2、React DOM 19.2、React Router 7.6。
- TypeScript 5.9，`strict`、`noUnusedLocals`、`noUnusedParameters` 已开启。
- Vite 7.3，React 插件与 Kimi inspect 插件。
- Tailwind CSS 3.4、Radix UI、Lucide 图标。
- `react-markdown`、`remark-math`、`rehype-katex` 与 KaTeX 0.18。
- 数据、账户、批注和学习记录均保存在浏览器 `localStorage`；没有后端数据库或可信服务端鉴权。
- `package.json` 的包名仍为模板名 `my-app`，README 仍是 Vite 模板。

安全方面的现有优点是 Markdown 渲染器没有启用 `rehype-raw`，输入中的 raw HTML 不会被当作 HTML 执行。该边界必须保留。

## 2. 当前路由

`src/App.tsx` 同步导入所有页面，共 15 条业务路由：

| 路由 | 页面 | 当前权限状态 |
|---|---|---|
| `/` | 首页 | 公开 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/problems` | 题库 | 公开 |
| `/problems/new` | 新建题目 | 仅页面内检查已登录，无路由守卫 |
| `/problems/:id` | 题目详情 | 公开 |
| `/problems/:id/new-solution` | 新建解法 | 仅页面内检查已登录，无路由守卫 |
| `/papers` | 试卷 | 公开 |
| `/papers/new` | 新建试卷 | 仅页面内检查已登录，无路由守卫 |
| `/papers/:id` | 试卷详情 | 公开 |
| `/principles` | 第一性原理/《几何原本》索引 | 公开 |
| `/principles/new` | 新建推导 | 仅页面内检查已登录，无路由守卫 |
| `/principles/:id` | 推导或 Euclid 条目 | 公开 |
| `/viz` | 可视化实验室 | 公开 |
| `/tools` | 工具 | 公开 |

所有页面均为 eager import，当前没有 route-level lazy loading。`ArticleDetail.tsx` 还从 `ProblemDetail.tsx` 导入 `CommentThread`，使两个页面的依赖边界进一步耦合。

## 3. 当前数据模型

`src/lib/types.ts` 只有面向当前 UI 的 `Problem`、`Solution`、`Comment`、`Article`、`Paper`、`Attachment` 与 `User`：

- 内容对象没有统一的 `ContentItem`。
- 内容没有 `Revision`，保存即覆盖或直接插入当前集合。
- 数学文章虽可临时派生为 reading blocks，但没有持久化的 `SemanticBlock` 实体。
- Euclid 的依赖仅是专用 `dependencies` 数组，不是通用 `Edge`。
- 没有正式的投稿审核状态、visibility、review record 或变更历史。
- `Attachment` 直接保存 `dataUrl`。
- `User` 在浏览器中保存明文密码与可篡改的 `isAdmin`。

已有 Annotation 锚点基础较好：`blockId + version + start/end + quote + prefix + suffix` 均已记录，并能在文字轻微变化后尝试依靠引文和上下文重新定位；旧版本讨论也会被明确标注。现存不足是 Annotation 没有 issue 类型/状态，运行时校验较弱，且内容 hash 不是正式 Revision。

## 4. localStorage 与 sessionStorage key

| Key | 内容 | 主要风险 |
|---|---|---|
| `mf_problems` | 题目 | 无审核/版本/visibility |
| `mf_solutions` | 解法 | 写入即公开 |
| `mf_comments` | 普通评论 | 无统一 schema 版本 |
| `mf_articles` | 用户文章 | 保存即进入文章列表 |
| `mf_papers` | 试卷 | 可能包含 Data URL 附件 |
| `mf_users` | 用户、明文密码、`isAdmin` | 可由浏览器直接篡改 |
| `mf_session` | 当前用户 ID | 不是可信会话 |
| `mf_passage_annotations_v1` | 划线评论 | 已有 v1，但缺少 issue 类型与状态 |
| `mf_learning_knowledge_status_v1` | 知识状态 | 仅本地 |
| `mf_learning_attempts_v1` | 做题记录 | 仅本地 |
| `mf_proof_reviews_v1` | 解法核验 | 数据函数不校验管理员 |
| `mf_exam_session_${paperId}` | 逐卷考试会话 | 动态 key，无统一迁移注册表 |
| `mf_reader_theme` | 阅读主题 | UI 偏好 |

`sessionStorage` 另有 `mf_pending_passage_annotation`，用于登录前临时保存划线选择。

当前 `store.read` 在解析异常时会静默重新播种；内置同 ID 数据会覆盖本地版本。0.2 不应破坏性迁移这些旧数据，新增存储必须使用新 key、显式 schema version，并保留旧值。

## 5. 当前用户权限

当前权限不是安全边界：

- 注册用户统一得到 `isAdmin: false`，但用户记录和 session 都存于可编辑的 localStorage。
- 新建题目、解法、试卷和推导页面只检查“是否登录”，不检查管理员或 feature flag。
- `store.addProblem/addSolution/addArticle/addPaper` 不接收 actor，也不校验权限、审核状态或附件。
- `recordProofReview` 的 UI 对高级状态做了管理员判断，但数据层可被直接调用写入任意状态。
- 没有路由级 `RouteGuard`，手动输入 URL 仍可获得发布界面。

因此基线状态下普通登录用户可从 UI、Router、Data layer 三层直接创建并公开内容。纯前端原型只能建立一致的产品约束，不能宣称具有服务端安全性。

## 6. 当前上传入口

上传入口存在于：

- 顶部账户菜单：上传题目、上传试卷、写推导。
- 题库、试卷、第一性原理列表页。
- `/problems/new`、`/papers/new`、`/principles/new`、`/problems/:id/new-solution`。
- `AttachmentUploader` 接受 `image/*` 和 `application/pdf`，因此也接受用户明确禁止的 SVG。

附件会被转为 Data URL，并通过普通 `store.add*` 写入 localStorage。只有 UI 层的单文件 2 MB 检查，没有数据层 MIME、总量、权限或 feature flag 检查。0.2 必须在 UI、Router、Data layer 三层同时关闭普通用户上传；管理员内部编辑器也不得恢复任意文件上传。

## 7. 当前《几何原本》数据加载方式

`src/lib/euclid.ts` 在模块顶层同步 `?raw` 导入：

- `euclid-data.json`：1,647,394 B 源文件；构建 chunk 1,658,067 B。
- `euclid-modern-zh.json`：2,156,294 B 源文件；构建 chunk 2,156,324 B。

`src/lib/seed.ts` 又同步调用 `getEuclidArticles()` 生成 607 篇文章。由于 `AuthProvider → store → seed` 在应用入口即被加载，即便访问首页也会进入这条依赖链。

当前 `vite.config.ts` 的 `manualChunks` 只把语料拆成独立 chunk，却没有形成按需加载。构建后的 `dist/index.html` 直接 `modulepreload` 两个 Euclid chunk，所以首页仍会下载整部正文。

### 修改前首页初始资源基线

| 资源 | 原始大小 | Vite 报告 gzip |
|---|---:|---:|
| entry `index` | 336,794 B | 103,023 B |
| vendor | 767,159 B | 239,902 B |
| Euclid 英文语料 | 1,658,067 B | 252,305 B |
| Euclid 现代中文 | 2,156,324 B | 343,981 B |
| **初始 JS 合计** | **4,918,344 B** | **939,211 B** |
| 同步 CSS 合计 | 150,344 B | 28,969 B |

目标架构采用“轻量 book metadata → 单卷索引/内容 → 当前 proposition”的分级 loader。首页不得包含 Euclid modulepreload；直接访问某条命题时最多加载该卷数据，不下载十三卷全文。

## 8. 当前代码质量问题

1. `npm run lint` 失败：**12 errors、0 warnings**。
   - 10 个 `react-refresh/only-export-components`。
   - `ui/sidebar.tsx` 在 render 阶段调用 `Math.random()`。
   - `pages/Tools.tsx` 有未使用异常变量。
2. 没有测试 runner、测试配置或测试文件。
3. 没有 CI。
4. `package.json` 缺少 `typecheck` 与 `test` scripts。
5. README 仍是 Vite 模板。
6. 全部页面同步加载，首页 entry 同时包含实验室、试卷、题库和 Euclid 阅读器代码。
7. Euclid semantic block ID 仍由段落顺序与启发式分类派生；插入段落可能使后续 ID 漂移。
8. Euclid dependency 缺少 edge type 与 provenance，找不到的依赖会被静默过滤。
9. 当前语料包含 `euclid-10-28 → euclid-10-28` 的自引用标签 `Lemma 1`；这更可能是命题内部引理被错误映射为内容级自引用，应保留为 source issue 或 block-level lemma，不能无痕删除。
10. `euclid-modern-zh.json` 的顶层 `status: complete` 只表示翻译缓存覆盖完整，不表示数学审核完成；0.2 必须把现有机器中文统一视为 `raw_machine`。
11. 所有 Euclid 条目都按九种 geometry family 套图，却统一标为“命题交互可视化”；多数只是相关概念示意。
12. `vite.config.ts` 无条件启用开发 inspect 插件，生产模式应关闭。

## 9. 当前构建情况

- `tsc -b && vite build`：PASS。
- 构建耗时约 16 秒，2035 个模块。
- `check-latex.mjs`：569 个公式，0 errors。
- 构建目录：66 个文件，约 6.14 MB。
- Vite 对三个超过 500 kB 的 chunk 发出体积警告：vendor、Euclid 英文、Euclid 中文。
- App 与 Vite config 的独立 TypeScript 检查通过。

构建成功只证明项目可编译，不证明权限、审核状态或数学内容正确。

## 10. 当前测试情况

- `npm run test`：不存在。
- 测试文件：0。
- CI workflow：0。
- 当前可重复的静态校验只有 TypeScript、ESLint、LaTeX 检查和生产构建；其中 ESLint 失败。
- 既有的外部浏览器验收脚本不在 package scripts 或 CI 中，不能替代仓库内自动测试。

0.2 首批自动测试必须覆盖：状态迁移、visibility、revision、dependency edge、annotation anchor 重锚、普通用户权限，以及管理员不可被普通注册流程获取。

## 11. 仓库卫生与非源码目录

审计开始时 Git 与 `origin/main` 同步，唯一未跟踪项是 `scripts/__pycache__/`。Harness 状态文件是在本轮审计启动后创建，不属于原始基线。

| 路径 | 大小/数量 | 状态 | 处理原则 |
|---|---:|---|---|
| `node_modules/` | 约 211.5 MiB | ignored，可由 `npm ci` 恢复 | 不提交 |
| `dist/` | 66 文件，约 5.86 MiB | ignored，构建产物 | 不提交 |
| `debug-shots/` | 842 文件，约 55.5 MiB | ignored，含临时 Chromium profiles | 核验绝对路径后可清理 |
| `debug-boxed.mjs` | 752 B | ignored，本地调试脚本 | 可清理 |
| `live-check.css` | 116,871 B | ignored，本地调试抓取 | 可清理 |
| `scripts/__pycache__/` | 84,823 B | 未跟踪且未忽略，可重建 | 增加 ignore 后清理 |
| 工作区外层 `mathforge.zip` | 约 65.9 MiB | 不属于仓库 | 用途不明，保留并报告 |

禁止使用宽泛的 `git clean -fdx/-fdX`，因为它会把依赖目录与其他 ignored 内容一起纳入。任何删除必须先解析绝对路径并逐项确认。

旧 `BlackHole.tsx` 与 `WebGLBlackHole.tsx` 只互相引用，没有页面入口引用；首页实际使用 `MathManifold`。两份旧组件可在工程清理阶段按已确认废弃代码删除。

## 12. 本轮预计修改文件

预计新增：

- 用户要求的 `docs/` 八份文档。
- `src/config/features.ts`。
- 核心模型、权限、内容仓储、editorial repository 与本地 pilot event 模块。
- 路由守卫、本地测试版本提示、管理员 Euclid 编辑页面。
- Euclid 轻量 metadata 与按卷数据、异步 loader 及生成/核验脚本。
- Vitest 配置与模型、权限、Annotation、Dependency、Editor 测试。
- `.github/workflows/ci.yml`。

预计修改：

- `package.json`、`package-lock.json`、`.gitignore`、`README.md`、`vite.config.ts`。
- `App.tsx`、`Layout.tsx`、题库/试卷/第一性原理列表页及四个 New 页面。
- `store.ts`、`types.ts`、`auth.tsx`、`learning.ts`、`annotations.ts`、`reading-blocks.ts`。
- `euclid.ts`、`seed.ts`、`ArticleDetail.tsx`、`EuclidDiagram.tsx`。
- 把跨页面复用的 `CommentThread` 提取为独立组件，以保持路由 chunk 边界。

预计删除的源文件仅限经全仓引用检查确认废弃的 `BlackHole.tsx` 与 `WebGLBlackHole.tsx`。原始数学语料、既有用户数据兼容路径、实验室和可视化实现均保留。

## 13. 基线结论

MathForge 当前是功能完成度较高的纯前端原型，但不具备可信发布系统的三个关键条件：服务端安全边界、不可覆盖的内容版本、人工审核工作流。0.2 的工程目标是先建立一致的数据与权限模型，并在 UI 中诚实披露 localStorage/认证限制；不得把机器翻译或自动检查结果升级为数学审核结论。
