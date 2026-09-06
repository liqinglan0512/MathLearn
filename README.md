# MathForge

MathForge 正在建设为一个公开源码、以真正理解数学为目标的数学学习平台。

> An open-source mathematics learning platform focused on understanding mathematics from intuition, definitions, structure and rigorous reasoning.

它不以题目数量、资源数量或站内活跃度作为当前核心价值。MathForge 0.3 — **Open Learning Core** 只围绕一条学习路径展开：

```text
Understand → Visualize → Practice → Contribute
理解       → 看见       → 检验     → 共同改进
```

## 当前产品方向

- **理解数学**：从问题、直觉和基本对象出发，写清定义、条件、推导与反例。
- **可视化**：通过可操作的数学实验观察结构，而不是增加与数学无关的特效。
- **练习**：用少量题目检验理解，并把卡点关联回前置概念。
- **工具**：保留公式编辑、基础计算等辅助能力，但不让工具取代学习。
- **GitHub 协作**：Issue、Pull Request、Code Review 和 Git history 是当前唯一正式贡献路径。

站内公开投稿、附件上传、AI 解题、挑战赛、学习日记、排行和社交功能均保持关闭。账户、批注和学习记录仍是 `localStorage` 本地原型，不是云端账户、生产社区或长期备份。

## Open Learning Core

0.3 先从现有可靠正文中选择少量示范主题，建立 `LearningUnit` 元数据与概念—实验—练习关系。加入目录只表示 **pilot 课程索引状态**，不代表数学内容已经完成独立审校或正式发布。

长期学习单元可以逐步容纳：问题起点、概念需要、直觉、定义构造、正式定义、定义动机、证明、必要条件、反例、可视化、应用、理解检验、推广，以及前置/后续知识。本轮不为填满结构而批量生成数学正文。

## 《几何原本》实验归档

MathForge 0.2 的《几何原本》试验验证了 Revision、SemanticBlock、依赖图、稳定批注锚点、来源问题和可视化信任模型。它在 0.3 中从公开学习课程下架，但**没有删除**：

- 原始语料与 607 条派生内容保留；
- 7152 个 SemanticBlock、依赖边、来源问题与修订历史保留；
- 按需加载 repository、内部编辑原型与相关测试保留；
- 机器稿继续保持 `raw_machine`，不会自动升级为已审核或已发布。

本次处理是产品归档，不是访问控制或数据销毁。静态语料仍存在仓库中，开发环境保留内部恢复入口；未来若重新启用，必须先经过明确的产品与数学审核决策。

## 参与贡献

仓库：[github.com/liqinglan0512/MathLearn](https://github.com/liqinglan0512/MathLearn)

请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。可以通过 GitHub Issue 报告数学错误、提出解释改进、请求可视化、报告 Bug 或建议学习单元；代码与内容修改通过 Fork、分支和 Pull Request 提交。

数学证明不能仅因为 LLM 判断正确就合并，也不接受未经核验的 AI 批量内容。PR 合并不自动等于 `math_reviewed`，也不自动成为正式学习单元。

## 许可证

MathForge 采用代码与内容分开授权：

| 范围 | 许可证 |
| --- | --- |
| 软件代码（TypeScript、React 组件、构建脚本、配置、测试） | [MIT](./LICENSE) |
| 学习内容（数学与编辑正文、学习单元描述、`docs/` 说明文档） | [CC BY-SA 4.0](./LICENSE-CONTENT) |

第三方语料保留各自条款：`src/lib/euclid-data.json` 与 `src/lib/euclid-modern-zh.json` 派生自 Perseus Digital Library 的《几何原本》版本（CC BY-SA 4.0），来源与派生步骤记录在 [`scripts/EUCLID_SOURCES.md`](./scripts/EUCLID_SOURCES.md)。依赖包沿用各自声明的许可证。

完整边界说明见 [`LICENSE-CONTENT`](./LICENSE-CONTENT)。

## 技术栈

- React 19、TypeScript 5.9、Vite 7
- React Router 7
- Tailwind CSS 3 与 Radix UI
- KaTeX、React Markdown
- Vitest

Node.js 需要满足 Vite 7 的运行要求：`^20.19.0` 或 `>=22.12.0`。

## 本地开发

```bash
npm ci
npm run dev
```

默认开发地址由 Vite 输出；项目配置的首选端口为 `3000`。

## 质量门

运行完整检查：

```bash
npm run check
```

也可以分别运行：

```bash
npm run typecheck
npm run lint
npm run test
npm run check:latex
npm run check:hygiene
npm run check:contracts
npm run build
```

`check:hygiene` 检查构建产物、依赖目录、调试文件和本地任务状态是否误入源码包，不会删除文件。`check:contracts` 同时保留 0.2 的可信内容模型门槛，并核对 0.3 的公开产品方向、冻结开关、Euclid 归档可恢复性与完成文档。

依赖告警、当前可达性与最小升级建议记录在 [`docs/DEPENDENCY_SECURITY_TRIAGE.md`](./docs/DEPENDENCY_SECURITY_TRIAGE.md)。本轮不运行破坏性的 `npm audit fix --force`。

## 项目结构

```text
src/
  components/       页面组件、数学阅读与交互组件
  config/           产品策略与 feature flags
  lib/              学习关系、数据模型、存储与权限
  pages/            路由页面
scripts/            内容构建与仓库契约校验
tests/              自动化测试
docs/               产品方向、架构、流程、安全与验收证据
.github/workflows/  持续集成
```

Markdown 渲染不得开启未经净化的 raw HTML；公开文件上传继续关闭；`node_modules`、`dist`、浏览器 profile、缓存与本地任务状态不得提交到源码仓库。
