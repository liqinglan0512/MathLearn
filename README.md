# MathForge

MathForge 是一个以“理解数学”为核心的长期数学学习社区项目。它关注的不只是答案，还包括定义、严格证明、证明依赖、局部讨论，以及理解如何随修订逐步演化。

## 当前阶段

项目正在收束为 **MathForge 0.2**：从高完成度前端原型转向可信、可维护、可继续扩展的工程基础。本轮冻结横向功能扩张，优先处理权限边界、版本与审核模型、工程质量、加载性能和《几何原本》编辑试验。

- 公共投稿和附件上传默认关闭；内部内容管理仅供管理员开发流程使用。
- 数据目前仍保存在当前浏览器的 `localStorage`，不是长期云端存储。
- 《几何原本》属于实验性内容。现有现代中文包含机器辅助译文，不能视为已经全部人工审核、数学正确或正式出版。
- 保存草稿不等于发布；正式数学内容需要独立审核与版本记录。

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

## 质量命令

```bash
npm run typecheck
npm run lint
npm run test
npm run check:latex
npm run check:hygiene
npm run check:contracts
npm run build
```

运行完整工程门槛：

```bash
npm run check
```

`check:hygiene` 检查已跟踪文件和所有未忽略的待提交候选，确保构建产物、依赖目录、浏览器 profile、调试文件和本地任务状态不会进入源码包；它不会删除任何文件。`check:contracts` 同时核对基线文档、投稿冻结、《几何原本》621 个按需内容文件及 0.2 完成报告的可信边界。

预览生产构建：

```bash
npm run preview
```

## 项目结构

```text
src/
  components/       页面组件、数学阅读与交互组件
  lib/              数据模型、存储、权限与数学内容适配
  pages/            路由页面
scripts/            语料构建与仓库校验脚本
tests/              自动化测试
docs/               0.2 架构、流程、权限与验收文档
.github/workflows/  持续集成
```

## 数据与内容边界

当前账户、批注和学习记录只存在当前浏览器中。清除浏览器数据或更换设备会丢失这些本地数据；不要把它们当作已备份的正式内容。

《几何原本》保留可追溯的英文底本、历史中文材料和机器辅助现代中文。本地正式稿还绑定其所依据的静态 Revision 与内容哈希；底本变化时停止自动覆盖并等待人工迁移。机器内容必须保持其真实状态，不能自动升级为 `math_reviewed` 或 `published`。数学内容的最终判断保留给人工编辑。

## 贡献状态

MathForge 0.2 暂不开放公共投稿或文件上传。请不要绕过 feature flags、路由守卫或数据层限制恢复上传入口。未来投稿将遵循草稿、待审核、退修、批准和发布的显式工作流。

## 安全说明

- Markdown 渲染不得开启未经净化的 raw HTML。
- 公共文件上传保持关闭，不接受 HTML、SVG、ZIP 或任意 MIME 内容。
- `node_modules`、`dist`、调试截图、浏览器 profile、缓存和本地任务状态不得提交到源码仓库。
