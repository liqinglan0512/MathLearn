# MathForge 0.3.0 Release Readiness Report

| | |
| --- | --- |
| 审计日期 | 2026-09-06 |
| 审计基线 commit | `1cb76a514ff56a372642628e2fbe241b660830c2` |
| 版本 | `0.3.0`（本轮由 `0.0.0` 修正） |
| 本机环境 | Node `v24.16.0` / npm `12.0.2` / Windows 11 |
| CI 环境 | Node 22.x / ubuntu-latest |
| 最终裁决 | **READY FOR PUBLIC 0.x RELEASE** |

本文是**点时间审计**，不是「MathForge 永久安全 / 永久正确」的声明。下面每一条 PASS 都对应实际运行过的命令，未运行的检查明确标记为未运行。

---

## 1. 当前版本定位

MathForge 0.3.0 是一个**公开源码的数学学习平台**，围绕一条路径展开：理解 → 可视化 → 练习 → 开源贡献。

它**不是**：商业 SaaS、AI 聊天产品、社交平台、大型社区、Leo AI 子模块、Leo Tree 子模块。

本轮定位为「收口发布」，不新增产品能力。功能冻结状态在代码层由 `src/config/features.ts` 的 flag 与 `tests/public-product-policy.test.ts` 的策略测试共同保证。

## 2. 审计范围

已检查：仓库与构建配置、依赖与 lockfile、CI、首访者用户路径、全部路由、产品边界与冻结决策一致性、secrets、XSS 面、第三方请求、数据持久化边界、移动端布局、开源发布材料（README / LICENSE / CONTRIBUTING）。

**未检查**（明确说明，不冒充已完成）：

- 未做渗透测试或第三方安全审计；
- 未做真机移动端测试（仅浏览器 375×812 视口模拟）；
- 未做跨浏览器矩阵测试（仅 Chromium）；
- 未做无障碍（a11y）专项审计；
- 未对 607 条《几何原本》派生内容做数学正确性复核（它们已从公开产品下架）；
- 未做负载 / 性能压测。

---

## 3. Gate 结果

| Gate | Result | 依据 |
| --- | --- | --- |
| Gate 1 — Build Integrity | **PASS** | install / typecheck / lint / test / latex / hygiene / contracts / build 全绿，exit 0 |
| Gate 2 — Runtime Integrity | **PASS** | 生产构建下 9 条路由实测，0 console error，移动端无横向溢出 |
| Gate 3 — Product Boundary | **PASS** | 7 个冻结 flag 全 false；投稿/附件/账户入口在生产构建中均不可达 |
| Gate 4 — Privacy & Security | **PASS** | 0 secrets；生产依赖 0 vulnerabilities；无第三方请求；数据边界与说明一致 |
| Gate 5 — Open-source Readiness | **PASS** | LICENSE 与 LICENSE-CONTENT 已落地；README 可指导陌生开发者启动 |
| Gate 6 — Release Candidate | **PASS** | 修改后完整重跑 `npm run check`，exit 0；重新构建后再次 runtime smoke test |

---

## 4. Test Evidence

全部为本轮实际运行结果。

### install

```
npm install            → exit 0
npm ci（CI 中执行）     → 见 GitHub Actions
```

### 完整质量门（修复后重跑）

`npm run check` = typecheck → lint → test → check:latex → check:hygiene → check:contracts → build

```
Test Files   16 passed (16)
Tests       103 passed (103)         ← 修复前 100，本轮新增 3 项回归测试
check:latex  checked 569 formulas, 0 errors
check:product-policy  2 files / 12 tests passed   ← 修复前 9
build        ✓ built in 5.94s
EXIT=0
```

typecheck 与 lint 无任何输出（干净通过）。

### 依赖安全

```
npm audit --omit=dev   → found 0 vulnerabilities     ← 移除 recharts 后
npm audit              → 13 vulnerabilities (2 low, 2 moderate, 9 high)，全部在 devDependencies
```

生产构建产物中不含 recharts / lodash（已 grep `dist/assets/` 确认）。

### Runtime smoke test

生产构建 (`npm run build`) + `vite preview`，Chromium 实测：

| 路径 | 结果 |
| --- | --- |
| `/` | 渲染正常，hero + 学习循环四步 |
| `/principles` | 14 个 pilot 学习单元列出，标注 pilot 状态 |
| `/principles/a3` | 正文 + KaTeX 公式渲染正确 |
| `/viz` | 交互实验可用，割线/切线实时计算 |
| `/problems` | 8 道题目 + 知识图谱空状态正确 |
| `/tools` | 公式编辑器 + 计算器（`sqrt(2)*1000` = 1414.2135623731，正确） |
| `/papers` | 试卷列表正常 |
| `/login` `/register` | 显示「本地身份原型未启用」，**无密码表单** |
| `/internal/euclid` | 「内部编辑后台不可用」 |

- console error：**0**（全程 `read_console_messages onlyErrors` 均为空）
- 移动端 375×812：`scrollWidth === clientWidth === 375`，无横向溢出
- 死链：未发现

### CI

CI 结果见本文末尾「GitHub Delivery」节 —— 本地 gate 通过不能替代远程 CI。

---

## 5. 本轮发现与修复的问题

### P0

**P0-1 — 仓库没有 LICENSE，却以「开源」对外发布。已修复。**

- *根因*：许可证决策此前一直被推迟（README 原文写明「需要 Leo 决策」）。没有 LICENSE 时法律上等于「保留所有权利」，任何人不得合法使用、fork 或再分发——与「永久免费、开源」的定位直接冲突，且发布后必然造成严重误解。
- *修复*：按所有者决策采用双许可——代码 `LICENSE`（MIT），内容 `LICENSE-CONTENT`（CC BY-SA 4.0）。`LICENSE-CONTENT` 逐项界定「内容」范围、署名要求，并单列第三方来源（Perseus 的 Euclid 语料，CC BY-SA 4.0）与依赖许可证。README 的「许可证边界」免责段替换为真实许可证说明。
- *验证*：两文件已提交；README 表格指向正确；`npm run check` 通过。

### P1

**P1-1 — 生产环境可直接访问 `/login`、`/register`，向访客提供把明文密码写入 localStorage 的表单。已修复。**

- *根因*：`localIdentityPrototype` flag 只在 `import.meta.env.DEV` 为真，导航栏也据此隐藏了入口；但 `App.tsx` 中这两条路由**没有加任何 flag 守卫**。投稿类路由都包了 `FeatureRoute`，唯独认证路由漏掉了。因此生产站点上直接输入 URL 即可拿到可用的注册表单，而 `auth.tsx` 是把 `password` 原样存进 `mf_users` 的。访客若复用真实密码，明文密码就留在了浏览器里。
- *修复*：两条路由包入 `FeatureRoute enabled={FEATURES.localIdentityPrototype}`；同时给 `FeatureRoute` 增加可选 `title` / `description`，让关闭态文案对认证场景准确（原文案只讲「投稿入口关闭」，用在登录页会误导），并明确写出「请不要在此站点输入真实密码」。
- *验证*：生产构建下实测 `/login`、`/register` 均显示关闭态、无表单；新增 3 项回归测试（见下）。

**P1-2 — `package.json` 版本号为 `0.0.0`，与文档中的 0.3 不一致。已修复。**

- *根因*：脚手架默认值从未更新。版本号不明确时无法打 tag、无法做 GitHub Release，也让使用者无法判断拿到的是哪一版。
- *修复*：`package.json` 与 `package-lock.json` 同步为 `0.3.0`（沿用仓库既有的 0.3 命名，非臆造版本号）。

**P1-3 — 唯一的生产依赖安全告警来自一个完全没被使用的包。已修复。**

- *根因*：`recharts` 是初始模板遗留，`src/`、`tests/`、`scripts/` 中零 import，但它拖入 `lodash@4.17.21`，是 `npm audit --omit=dev` 中唯一的 high 告警来源。
- *修复*：`npm uninstall recharts`。生产依赖告警从 1 high 降到 **0**。
- *验证*：`npm audit --omit=dev` → `found 0 vulnerabilities`；完整 `npm run check` 重跑通过。


### 新发现：P0-2 —— 部署脚本会破坏同机上的另一个生产站点（已修复，部署前发现）

在执行部署前对目标主机做只读探测（无凭据，仅 HTTP）时发现：

| 端口 | 内容 | nginx |
| --- | --- | --- |
| 80 | 302 → 443 | 1.18.0 |
| 443 | **Leo Tree** | 1.18.0 |
| 8090 | MathForge 0.2 | 1.21.5 |

- *问题*：原 `deploy/deploy.sh` 在端口 **80** 上写入 `server_name _` 的 server block，并执行 `rm -f /etc/nginx/sites-enabled/default`，随后 reload nginx。在这台主机上运行，极可能**劫持 Leo Tree 的 80 端口流量并删除其依赖的站点配置**，直接影响一个正在运行的生产站点。
- *根因*：脚本是在假设「独占主机」的前提下写的。审计范围此前只覆盖仓库与应用，没有覆盖目标主机的既有占用情况。这属于发布后必然造成严重后果的问题，定级 P0。
- *修复*：脚本改为端口隔离并加了多层保护——默认端口 8090；`MATHFORGE_PORT` 为 80/443 时直接拒绝；生成的配置若含 `listen 80/443` 则中止；不再使用 `default_server`；**不再删除 `sites-enabled/default` 或任何非自己创建的站点**；部署前探测目标端口，若非 MathForge 则中止（需 `ALLOW_PORT_TAKEOVER=1` 才继续）；`nginx -t` 失败时撤销自己的软链且不 reload；部署前后比对 `sites-enabled/` 清单。
- *验证*：`bash -n` 语法通过；端口守卫做了正反用例测试——`listen 80;`、`listen [::]:80;`、`listen 443 ssl;` 均被拦截，`listen 8090;`、`listen [::]:8090;`、`listen 8080;` 正常放行（确认不会把 8080 误判为 80）；模板渲染后确认只监听 8090。
- *说明*：该问题在**任何部署动作发生之前**被发现，服务器未被改动，Leo Tree 未受影响。

### 新增的回归测试

`tests/public-product-policy.test.ts` 新增 3 项（原 9 → 12）：

1. `keeps the identity prototype out of production builds` —— 断言 `localIdentityPrototype` 严格绑定 `import.meta.env.DEV`；
2. `gates /login and /register behind the identity prototype flag` —— 解析 `App.tsx`，断言两条路由带有 `enabled={FEATURES.localIdentityPrototype}`；
3. `never routes to /login from a surface that is public in production` —— 扫描生产可见组件，断言任何跳转 `/login` 的代码上游 8 行内必须有一个生产环境为 false 的 flag 守卫。

第 3 项针对的是根因而非症状：它拦截的是「未来有人在公开页面新加一个通向登录页的按钮」，而不只是当前这两条路由。

### 对既有契约脚本的修改（据实记录）

Gate 6 的干净环境重跑**最初 FAIL**（`CHECK_EXIT=1`），不是误报，必须记录：

```
AssertionError: repository cleanup must retain exactly the 14 required Markdown documents
17 !== 14   at scripts/verify-0-3-completion-docs.mjs:75
```

- *原契约的问题*：0.3 清理轮用「Markdown 文件恰好 14 个」来防止杂散文档回流。这个意图是对的，但用**裸计数**表达：它无法区分「杂散文档回流」与「按要求新增的发布文档」。本轮按交付要求新增 `RELEASE_READINESS_REPORT.md`、`POST_RELEASE_BACKLOG.md`、`docs/DEPLOYMENT.md` 三份，计数变为 17，契约随即 FAIL。
- *为什么修改*：这三份文档是本轮明确要求的发布材料，不是杂散文件。同时不能简单把 14 改成 17 了事——那只是把一个裸计数换成另一个裸计数，下次仍然分不清新增的是发布文档还是垃圾。
- *新契约验证了什么*：先按名字断言三份发布文档必须存在，再断言总数恰好为 17。防杂散文档回流的原始意图完整保留，并且新增了「三份发布文档不得缺失」这一更强的保证。

同一脚本还修掉了一处**会输出虚假结论**的问题：结尾的 `console.log` 是硬编码字符串 `markdown=14 ui=8 tests=100 ...`，无论仓库实际状态如何都照样打印。它已改为输出真实测量值，现在打印 `markdown=17 ui=8 testFiles=16 releaseDocs=3`。一条永远打印令人安心数字的汇总行，比不打印更糟。

**除上述两处外**，未修改任何既有测试的断言标准，也未为了通过而放宽任何检查。`scripts/verify-0-3-completion-docs.mjs` 中断言「许可证待 Leo 决策」的那条契约**保持原样**：它校验的是历史文档 `docs/MATHFORGE_0_3_COMPLETION_REPORT.md`，那份文档是 0.3 开发轮结束时的点时间记录，其内容当时属实、本轮不改写。该文档顶部已加状态更新指针，说明许可证问题已在本轮落定，并指向本报告。

---

## 6. Remaining Known Limitations

以下问题**已知且未修复**，不构成 0.3.0 发布阻塞，全部记录在 `POST_RELEASE_BACKLOG.md`：

**P2**

- `/papers` 可用但不在主导航，只能通过直接 URL 或题目详情页进入（功能正常、无误导入口，删或加都属产品决策）；
- devDependencies 存在 13 条告警（9 high / 2 moderate / 2 low），构建期工具链问题，浏览器产物不受影响；
- vendor chunk 834 kB（gzip 258 kB），超过 Vite 500 kB 警告线。

**P3**

- `package.json` 中仍有若干未被 import 的模板遗留依赖（多个 Radix 组件、`embla-carousel-react`、`vaul`、`cmdk` 等），属体积优化；
- `src/pages/Tools.tsx` 的 KaTeX 调用未显式写 `trust: false`（KaTeX 该项默认即为 false，`MathProse.tsx` 已显式声明），属防御性加固。

**产品边界现状（非缺陷，是冻结决策的结果）**

- 学习标记、批注等全部只存在于访客浏览器 `localStorage`（`mf_` 前缀），不跨设备、不备份、清空浏览器即丢失。页脚与 `docs/DEPLOYMENT.md` 均已说明；
- 公开构建**没有账户系统**；
- 站内投稿与附件上传关闭，贡献路径只有 GitHub Issue / PR；
- 《几何原本》语料保留在仓库但已从公开课程下架，机器译稿仍标 `raw_machine`，未经独立数学审校。

---

## 7. 安全检查：做了什么，剩下什么

**实际执行的检查**

| 检查项 | 结果 |
| --- | --- |
| 仓库内 secrets / API key / token / `.env` | 未发现（`git ls-files` + 正则扫描） |
| 未跟踪的敏感文件 | 无 |
| 生产依赖漏洞 | **0** |
| 第三方网络请求 / analytics / 埋点 | **0**（`src/` 中无 `fetch`、无 analytics、无 CDN 字体） |
| XSS —— `dangerouslySetInnerHTML` | 2 处，均为 KaTeX 输出；`MathProse.tsx` 显式 `trust: false`，`Tools.tsx` 依赖 KaTeX 默认 `trust: false` |
| XSS —— Markdown raw HTML | 未启用 `rehype-raw`，react-markdown 默认转义 |
| `eval` / `new Function` | 无 |
| 外链 `target="_blank"` | 全部带 `rel="noreferrer"` |
| 生产环境 source map | 未生成（Vite 默认关闭） |
| 开发专用插件泄漏 | `inspectAttr` 仅在 `command === 'serve'` 挂载 |
| 数据持久化边界与文案一致性 | 一致 |

**不做以下声明**：本项目**未**经过渗透测试或第三方安全审计。上表只反映本轮实际完成的静态与运行时检查。「生产依赖 0 告警」是 2026-09-06 的 advisory 快照，不等于未来安全。

**服务器侧风险（与代码无关，但影响实际发布）**

目标服务器此前使用弱口令且暴露于公网 IP。该口令还出现在对话记录中，应视为已泄露。`docs/DEPLOYMENT.md` 第 0 节给出了必须先执行的加固步骤（改密码、切换密钥登录、关闭密码认证、ufw、fail2ban、阿里云安全组）。**这一步未完成前不应认为线上部署是安全的**——它不阻塞代码发布，但阻塞「安全的生产部署」。

---

## 8. Final Verdict

### `READY FOR PUBLIC 0.x RELEASE`

判定依据：6 个 Gate 全部 PASS；P0 清零（1 项，已修复并验证）；P1 清零（3 项，全部已修复并验证）；P2/P3 已分类记录且不构成阻塞；所有修复后完整重跑质量门与 runtime smoke test 均通过。

仓库已转为 Public，远程 CI 在 Node 22 上 **PASS**（第 9 节），代码层发布条件全部满足并已验证。

**该裁决覆盖代码与仓库交付。以下两项仍需所有者操作**，均不是代码缺陷：

1. **GitHub 仓库描述仍在宣传已关闭的功能**（P1-4，第 9 节）—— 属 GitHub 仓库设置，不在代码仓库内，本环境无权修改。这是当前唯一未清零的 P1；
2. **GitHub Release 未创建** —— tag `v0.3.0` 已在远程，Release 需手动创建。

服务器部署安全（第 7 节末尾）由所有者自行判断风险等级后决定。

### 发布步骤

1. commit 本轮修改并推送到 GitHub；
2. 确认远程 CI 通过；
3. 打 tag `v0.3.0` 并推送；
4. 用本报告创建 GitHub Release；
5. **先执行 `docs/DEPLOYMENT.md` 第 0 节的服务器加固**；
6. 在服务器运行 `deploy/deploy.sh`；
7. 按 `docs/DEPLOYMENT.md` 第 3 节验证生产 URL。

---

## 9. GitHub Delivery

| 项 | 值 |
| --- | --- |
| Repository | `liqinglan0512/MathLearn`（**Public**）|
| Branch | `main` |
| Commit | `b145e6f483815ef58b01d7599155dc1f04331001` |
| Push Result | **成功**，`cc2eeba..b145e6f`，fast-forward，未使用 force |
| CI Result | **PASS** —— run `34019230895`，commit `975b40b`，Node 22.x，11/11 step 全绿 |
| Tag | `v0.3.0` → `b145e6f`，已推送 |
| GitHub Release | **未创建** —— 本环境无认证 API 访问，需所有者操作 |
| Final Remote State | `PUSHED — READY FOR PUBLIC RELEASE` |

推送前完成的检查：`git status`（干净）、branch、remote、`git diff`、`git diff --staged`、提交历史、未跟踪敏感文件（无）、`.env` / API key / token / credential 扫描（无）、大型缓存与构建产物（`node_modules`、`dist` 均被 `.gitignore` 正确排除，无 >100KB 未跟踪文件）。

推送后确认：`git fetch` 后本地 HEAD 与 `origin/main` **哈希完全一致**；远程 tag `v0.3.0` 指向同一 commit。

### 验证结果（仓库转为 Public 后复查）

**1. 仓库已 Public** —— `private: false`，README 匿名可见（HTTP 200），GitHub 识别 License 为 `MIT`，tag `v0.3.0` 可见。此前记录的「尚未真正公开」已解除。

**2. CI 已验证 PASS** —— 此前因仓库私有 + 无认证访问而无法观察，现已确认：

```
run 34019230895 | commit 975b40b | Node 22.x | completed: success
  PASS Install dependencies   PASS Typecheck   PASS Lint   PASS Test
  PASS Validate mathematical markup
  PASS Validate repository hygiene
  PASS Validate MathForge contracts and lazy Euclid data
  PASS Build
```

这同时补上了本地验证的最后一处缺口：本机为 Node 24，CI 在 **Node 22** 上跑通了完全相同的序列，之前记录的 Node 版本差异不再是未覆盖项。

**3. GitHub Release 未创建** —— 本环境没有认证的 GitHub API 访问（无 `gh`、无 token），无法创建。tag `v0.3.0` 已在远程，Release 需所有者基于该 tag 手动创建。

### 新发现：P1-4 —— GitHub 仓库描述与冻结的产品决策矛盾

仓库转为 Public 后才可见，属本轮审计范围内的 **repository description** 一项。

当前描述：

> 面向中国大学生数学竞赛备赛者的极简数学学习平台：题库共享 + 社区解法 + 第一性原理推导 + 交互可视化（React + TS + Vite + Tailwind + shadcn/ui）

- *问题*：它承诺了两项**已被明确关闭**的能力——「题库共享」依赖 `publicContribution`（现为 `false`），「社区解法」依赖 `social` 与 `publicContribution`（均为 `false`）。同时受众被写窄为「中国大学生数学竞赛备赛者」，与实际定位（高中生、本科生、研究生与数学爱好者）不符。
- *为什么是 P1*：这是访客在 GitHub 上读到的第一行字，位置比 README 更靠前。它正属于「看起来可以用但实际上没有」的误导性表述，与 README、feature flag 和策略测试直接冲突。
- *状态*：**未修复。** 仓库描述属 GitHub 侧仓库设置，不在代码仓库内；本环境无认证 API 访问，且修改仓库设置需所有者明确授权。

建议替换为：

```
开源数学学习平台：从定义、结构与第一性原理理解数学。理解 → 可视化 → 练习 → 开源贡献。面向高中生、本科生、研究生与数学爱好者。站内投稿与社区功能关闭，贡献通过 GitHub Issue / PR。React + TypeScript + Vite。
```

在描述更正前，GitHub 仓库首屏仍在对外传达与产品实际状态不一致的说明。


---

## 10. 生产部署记录（2026-09-06）

**线上地址**：`http://8.130.33.10:8090/` — MathForge 0.3.1，构建 `index-CfIhtkcy.js`，commit `a062ff5`。

### 部署过程中发现并修复的两个问题

**D1 —— 脚本误报部署成功（P0，已修复）**

首次部署输出 `MathForge deployed`，但外部验证发现 8090 仍在提供旧的 0.2 构建（`index-QLi8DAel.js`，Server 为容器的 nginx/1.21.5）。

- *根因*：Docker 容器 `mathlearn`（`nginx:alpine`）已发布 `0.0.0.0:8090`，系统 nginx 无法绑定该端口。`nginx -t` 只校验配置语法、不校验端口可绑定性，reload 静默失败。而脚本的自检只断言「页面含 MathForge」——旧构建同样满足。
- *修复*：预检在目标端口已被占用（Docker 发布或任何 LISTEN socket）时直接中止；验证改为比对 `index-<hash>.js`，断言线上提供的正是刚发布的那一份。已用真实的两个 hash 做正反测试。
- *解决*：`docker stop mathlearn` 后 `systemctl reload nginx`，系统 nginx 接管 8090。容器 restart policy 为 `unless-stopped` 且已被手动停止，重启后不会自动抢回端口。

**D2 —— 安全响应头声明了但从未生效（P1，已修复）**

外部探测发现线上任何路径都没有 CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`。

- *根因*：nginx 的 `add_header` 仅在内层 block 自身不设置任何 `add_header` 时才继承外层。站点每个 location 都设了 `Cache-Control`，于是把 server 级的四个安全头全部丢弃。首页经由 `location = /index.html` 提供，因此实际一个安全头都没有。`/assets/` 另外因 `expires` 与 `add_header` 并存而返回两个互相竞争的 `Cache-Control`。
- *修复*：安全头移入 `deploy/nginx-security-headers.conf`，安装为 `snippets/mathforge-headers.conf`，并在 server 块与每个设置 `add_header` 的 location 中 include；`/assets/`、`/content/` 去掉 `expires`，只保留单一 `Cache-Control`。
- *防回归*：`deploy.sh` 新增部署后断言——同时探测 `/` 与哈希入口包，任一安全头缺失或 `Cache-Control` 出现多次即判定部署失败。

### 线上验证结果

| 项 | 结果 |
| --- | --- |
| 路由 `/`、`/principles`、`/viz`、`/problems`、`/tools`、`/papers` | 全部 200 |
| SPA 深链接（直取 `/principles`，非首页 fallback） | 200，返回正确页面 |
| `/login`、`/register` | 显示「本地身份原型未启用」，**无密码表单** |
| `/internal/euclid` | 内部后台不可用 |
| Euclid 语料 `/content/euclid/catalog.json` | 200（按需加载可达） |
| 浏览器 console error | **0** |
| KaTeX 公式渲染 | 正常 |
| 交互实验（`/viz`） | 正常，实时计算 |
| 移动端 375×812 | `scrollWidth == clientWidth == 375`，无横向溢出 |
| **同机 Leo Tree** | 443 → 200，80 → 302，**未受影响** |

**D3 —— 端口预检误伤自身重新部署（已修复）**

修 D1 时加的 socket 级守卫对「任何监听者」都中止，导致每次重新部署都失败：8090 本来就该被系统 nginx 占着，reload 会重新绑定。守卫改为区分监听进程——系统 nginx 持有端口视为正常原地升级并放行，非 nginx 监听者仍然中止（当初出事的场景里宿主机进程是 `docker-proxy` 而非 `nginx`，仍会被拦下）。两种真实监听行都做了分类测试。

### 最终线上状态（已复验）

部署 commit `b9957ce`，构建 `index-CfIhtkcy.js`。以下为**外部实测**结果，不采信脚本自检：

| 项 | 结果 |
| --- | --- |
| 四个安全响应头（`/` 与哈希资源） | **全部present**：CSP、X-Content-Type-Options、X-Frame-Options、Referrer-Policy |
| `Cache-Control` 重复问题 | 已消除，两处均为 1 个 |
| `/assets/` 缓存 | `public, max-age=31536000, immutable` |
| `/` 缓存 | `no-cache, must-revalidate` |
| 全部 9 条路由 | 200 |
| 严格 CSP 下的运行时 | **0 console error**，KaTeX 渲染正常，`/viz` 交互实验实时计算正常 |
| 同机 Leo Tree | 443 → 200，80 → 302，未受影响 |

部署闭环完成，无待执行项。
