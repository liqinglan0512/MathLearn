# MathForge 0.2 测试报告

记录日期：2026-08-27
状态：最终聚合质量门与本地浏览器核心 QA 已通过；GitHub CI、线上部署验证、管理员交互式编辑器 QA 与移动端/弱网测试仍待完成。

## 1. 当前自动测试

当前 Vitest 结果：

```text
Test Files  11 passed (11)
Tests       78 passed (78)
```

测试覆盖的行为如下：

| 测试文件 | 主要验证内容 |
| --- | --- |
| `repository-hygiene.test.ts` | 生成物分类、忽略边界、数学语料不被误删、退役黑洞代码不回归 |
| `annotation-anchor.test.ts` | 原偏移命中、前文插入后的重锚定、重复 quote 的上下文消歧、无可靠上下文时拒绝猜测 |
| `content-model.test.ts` | 不可变 revision、稳定 semantic block ID、visibility、annotation anchor、dependency edge 校验 |
| `content-workflow.test.ts` | 相邻状态迁移、普通用户与机器权限、禁止 raw machine 直接审核或发布、issue moderation |
| `editorial-store.test.ts` | 追加式编辑历史、Web Locks 协调下的多实例写入、StrictMode 重复初始化、后置否决 Review 规则、权限拒绝与损坏 localStorage 的保守处理 |
| `euclid-repository.test.ts` | 路径约束、catalog/book/entry 按需加载、缓存与重试、内容状态及元数据校验 |
| `euclid-reader.test.ts` | 历史现代中文顺序、显式原文引用与编辑推断的展示隔离 |
| `euclid-visualization-contract.test.ts` | I.47 专用 renderer、I.48 概念图降级、未知 renderer/旧 revision 拒绝、完整核验凭据与当前内容哈希绑定 |
| `math-rendering.test.ts` | `\varepsilon>0` 实际生成 KaTeX、未闭合分隔符、裸 TeX、货币和代码片段低误报 |
| `permissions.test.ts` | 投稿/附件数据层冻结、危险 MIME、客户端管理员边界 |
| `pilot-events.test.ts` | 匿名本地事件、异常存储处理、清除能力、不保存自我解释正文 |

## 2. 已自动验证

| 检查 | 当前记录结果 | 说明 |
| --- | --- | --- |
| TypeScript | PASS | 当前 typecheck 无错误 |
| ESLint | PASS | 当前 lint 无错误 |
| Vitest | PASS | 11 files / 78 tests |
| Production build | PASS | Vite 生产构建成功 |
| Euclid lazy-data verifier | PASS | catalog、13 卷索引与 607 条 entry 的结构和引用检查通过 |
| MathForge contracts | PASS | 8 份文档存在性、baseline 结构、投稿冻结、lazy Euclid 与 completion report 可信边界通过 verifier |
| Repository hygiene | PASS | 787 个 tracked + 未忽略 untracked 候选文件通过；检查不执行删除 |
| LaTeX | PASS | 扫描运行时 lazy Euclid JSON 与现有内容，569 个公式、0 errors；同时检查未闭合/错配分隔符与常见裸 TeX |

这些结果证明相应自动检查在本地当前快照上通过。它们不证明全部数学内容正确，也不代替浏览器交互、线上部署或人工数学审核。

## 3. 最终聚合质量门

全部并行修改合并后已执行：

```bash
npm run check
```

退出码为 0，顺序覆盖：

```text
typecheck
→ lint
→ test
→ LaTeX validation
→ repository hygiene
→ baseline / feature freeze / Euclid lazy data / completion docs contracts
→ production build
```

最终记录为 11 个测试文件、78 项测试全部通过，569 个公式无 KaTeX 解析错误，生产构建成功。该结果针对本地当前工作树；后续若再修改代码，必须重新执行。

## 4. 本地浏览器 QA

真实 Chromium 已验证：

- 首页不请求 Euclid 内容；目录只请求 catalog；选择 Book I 只请求该卷索引；I.47 与 I.Def.1 只请求各自 entry。
- 四条公开投稿 URL 都显示“投稿入口当前关闭”，没有文件 input 或发布/上传按钮。
- I.47 同时显示中文、Heath 英文、历史中译及现代汉语解读；证明先显示中文再保留英文，历史块固定为现代汉语解读在上、历史原文在下。
- I.47 有双向证明依赖、替代证明、常见错误、现代解释与 `proposition_specific` 的未核验提示；补充内容逐块标明未经人工数学审核，且不冒充原文依赖图。
- I.47 实际显示直角三角形及 `a² + b² = c²`，不再误入通用“底 × 高”面积图；I.48 已退出会预设直角结论的专用分支，回退为 `concept-triangle`。裸 `verified`、未知 renderer 和旧 renderer revision 会被拒绝或降级，只有与当前 manifest 精确匹配的完整 attestation 才可显示核验标签。
- VI.Def.5 明确显示“上游英文底本缺失”，没有再声称每个块都有 Heath 原文，也没有补画无关命题图。
- 《几何原本》作为独立内容集合显示；筛选后条目标签不再把十三卷统称为“解析几何”。
- Definition I.1 的 visualization 为 `none`，没有用通用图冒充定义构造。
- 14 篇普通第一性原理文章均渲染出 KaTeX，未发现可见的 `$...$`；“严格层”的 `\varepsilon>0` 已确认生成 KaTeX MathML 中的 `ε > 0`，页面没有裸反斜杠命令。
- Book I 的 I.1–I.10 与 I.47 均保持 `raw_machine` 未审校边界、中文在前、英文在后，没有 `verified` 声明。
- 修复开发检查插件向 ReactMarkdown Fragment 透传 `code-path` 后，复验页面没有新的 console error/warning。

仍未完成的浏览器范围：管理员账户下的三栏/窄屏编辑器全流程、划线评论的真实鼠标选区回归、移动端布局、弱网与无障碍专项测试。相应纯函数与存储不变量已有自动测试，但不能冒充完整 E2E。

## 5. 待线上验证

- GitHub Actions 首次 push/PR 的真实执行结果。
- 生产服务器的 SPA fallback 与深链接刷新。
- 621 个 Euclid JSON 的 MIME、缓存、压缩和完整上传。
- 登录、权限、localStorage 数据升级与旧数据兼容的线上烟雾测试。
- 服务器部署前后的静态文件清单与哈希一致性。

## 6. 已知风险

1. **78 项测试不是 90% 覆盖率。** 当前没有经过确认的 statement、branch、function 或 line coverage 百分比，也没有覆盖率门槛。测试针对关键不变量，但不得写成“已达到 90% 覆盖”。
2. **浏览器端覆盖仍不足。** 已完成核心路由与阅读页的人工自动化巡检，但尚无可在 CI 中重复执行的完整 E2E 套件，也未覆盖管理员、移动端和弱网全流程。
3. **Vendor 仍大。** 当前 vendor 为 834,180 B Raw；虽然首页已停止预加载整部 Euclid，浏览器解析和执行成本仍需实测。
4. **依赖安全告警未完成分诊。** npm 安装报告 12 个漏洞（1 low、1 moderate、10 high）；尚未逐项确认可达性、生产影响或安全升级方案，不应直接运行可能引发破坏性升级的 `npm audit fix`。
5. **localStorage 仍是原型存储。** 浏览器数据可被清除或手工修改；editorial store 已做保守校验，但它不是服务器权限边界或持久备份。
6. **数学内容审核不属于自动测试。** 自动检查可以发现结构、状态和引用异常，不能把机器译文自动标记为 `math_reviewed` 或 `published`。

## 7. 验收记录模板

最终 completion report 应追加：

```text
Commit / build identifier:
npm run check exit code: 0
Test files / tests: 11 / 78
Browser QA routes and viewport: 本地桌面 Chromium；首页、目录、Book I、I.47、I.Def.1、14 篇普通推导、Book I I.1–I.10、四条冻结投稿路由
Online smoke-test URL:
Known failures or skipped checks:
```

本地工程门与核心浏览器 QA 已有明确证据；只有线上烟雾检查和远端 CI 也完成后，才能把部署验收写为完成。任何自动检查都不代表 607 条机器内容已经通过人工数学审核。
