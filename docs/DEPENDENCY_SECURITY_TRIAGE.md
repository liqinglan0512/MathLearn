# MathForge 0.3 依赖安全分诊

> 本文是 2026-08-27 的点时间审计，不是“依赖永久安全”声明。本轮只完成 triage：**没有升级依赖，没有运行 `npm audit fix`，也没有运行任何 `--force` 修复。**

## 1. 审计基准

| 项目 | 值 |
| --- | --- |
| Git commit | `cc2eeba6512e7a48a12e704f26d64dac32c9aa8c` |
| Node.js | `v24.16.0` |
| npm | `12.0.2` |
| lockfile | npm lockfile v3 |
| `package-lock.json` SHA-256 | `86B69EE8EE1780123F5BC8A2DB2A0460FF33DAC8A9BC83F381B25E383AE25E65` |
| 外部 package entry | 657 |
| registry | 657/657 来自 `registry.npmjs.org` |
| integrity | 所有含 `resolved` 的 entry 均有 integrity |
| 非 registry / Git / 本地路径依赖 | 0 |

本机审计环境是 Node 24，CI 当前使用 Node 22。漏洞结果来自同一份 lockfile，但未来真正升级和验收应在 CI 对齐的 Node 22 环境再执行一次。

运行的非破坏性命令包括：

```bash
npm audit --json
npm audit --omit=dev --json
npm outdated --json
npm ls @babel/core ajv brace-expansion flatted js-yaml lodash minimatch nanoid picomatch postcss rollup vite --all
```

为核对兼容升级集合，还运行了定向 `npm update ... --dry-run --ignore-scripts --no-audit`。dry-run 只输出计划，没有修改 `package.json`、`package-lock.json` 或 `node_modules`；运行前后 lock SHA-256 相同。

## 2. 审计摘要

完整 `npm audit --json`：

```text
critical  0
high     10
moderate  1
low       1
total    12
```

`npm audit --omit=dev --json`：

```text
critical  0
high      1
moderate  0
low       0
total     1
```

npm metadata 记录 657 个依赖，其中 prod 256、dev 402、optional 52；这些分类可能重叠，不能简单相加。12 是受影响的 package node 数，不是独立 advisory 数；同一个包可能同时命中多条 GHSA。

只有 `lodash` 在 lockfile 中是 production dependency。其余 11 个受影响包均标记为 dev-only。`postcss` 和 `vite` 是直接 devDependency；其余为间接依赖。

“在 production dependency tree”与“进入生产浏览器 bundle”不是同一件事。当前部署是 Vite 生成的静态客户端，不会把构建工具自动发布到浏览器。

## 3. 逐项分诊

| Package | Severity / advisory | Direct / transitive | Dev / runtime | 是否进入当前生产客户端 | 当前可达性判断 | 最小升级与风险 |
| --- | --- | --- | --- | --- | --- | --- |
| `@babel/core@7.28.5` | low；[GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | transitive，经 `@vitejs/plugin-react`、React hooks lint plugin 与本地检查插件 | dev | 否 | 只在 Babel/JSX 转换中；正常应用运行时不可达。处理恶意 source map 或恶意 PR 时仍可能影响开发机/CI。 | `7.29.7`。兼容 7.x 更新；可能改变转换输出，需全量 build。 |
| `ajv@6.12.6` | moderate；[GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) | transitive，经 ESLint / `@eslint/eslintrc` | dev | 否 | 当前只验证仓库内 lint schema，没有应用外部输入入口；主要是工具链 ReDoS 风险。 | `6.15.0`，满足现有 `^6.12.4`；需复跑 lint。 |
| `brace-expansion@1.1.12`、`2.0.2` | high；[GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v)、[GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp)、[GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg)、[GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | transitive，经两代 `minimatch` | dev | 否 | lint/parser glob；当前 pattern 由仓库脚本和配置控制。恶意 pattern 可造成 DoS。 | 分别升 `1.1.18`、`2.1.4`；需复跑 lint 与 hygiene。 |
| `flatted@3.3.3` | high；[GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f)、[GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) | transitive，经 ESLint → file cache → flat cache | dev | 否 | 当前 `npm run lint` 未使用 `--cache`，正常质量命令基本不进入其反序列化路径；损坏/恶意 cache 仍是本地风险。 | `3.4.4`；低风险，复跑 lint。 |
| `js-yaml@4.1.1` | high；[GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68)、[GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m)、[GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | transitive，经 `@eslint/eslintrc` | dev | 否 | 项目当前使用 JavaScript flat config，不解析用户 YAML；应用运行时不可达。 | `4.3.2`，满足现有范围；复跑 lint。 |
| `lodash@4.17.21` | high；[GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc)、[GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh)、[GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) | transitive，经 `recharts@2.15.4` | runtime | **当前否** | `npm audit --omit=dev` 唯一告警。源码中 Recharts 只由 `src/components/ui/chart.tsx` 引入，而该 wrapper 当前没有调用方；现有 `dist` JavaScript 也没有 `recharts`/`lodash` 标记。因此当前静态客户端不可达，但未来启用图表会改变此判断。 | `4.18.1`，满足 Recharts 的 `^4.17.21`；不需要升级 Recharts 3。升级后仍需构建和图表 QA。 |
| `minimatch@3.1.2`、`9.0.5` | high；[GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26)、[GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj)、[GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) | transitive，经 ESLint 与 typescript-eslint | dev | 否 | lint/parser glob；极端 pattern 可造成 ReDoS，当前输入主要是仓库配置。 | 分别升 `3.1.5`、`9.0.9`；可能改变极端 glob 匹配，需复跑 lint/hygiene。 |
| `nanoid@3.3.11` | high；[GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv)、[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | transitive，经 PostCSS | dev | 否 | 告警需要非安全生成器收到负数或零长度；当前 PostCSS 构建没有用户参数入口。 | `3.3.18`；需复跑 CSS build。 |
| `picomatch@2.3.1`、`4.0.3` | high；[GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p)、[GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) | transitive，经 Tailwind、chokidar、micromatch 与 Vite | dev | 否 | 构建/watch glob；当前 pattern 由仓库控制，恶意 pattern 可造成错误匹配或 ReDoS。 | 分别升 `2.3.2`、`4.0.7`；复跑 dev/build/hygiene。 |
| `postcss@8.5.6` | high；[GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)、[GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q)、[GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)、[GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | **direct** | dev | 否 | CSS 与 source map 构建期风险；当前输入来自仓库，但恶意 PR/CSS 可影响工作站或 CI。 | `8.5.26`。把直接依赖最低版本同步提高；比较 CSS 与浏览器视觉。 |
| `rollup@4.55.1` | high；[GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) | transitive，经 Vite | dev | 否 | 生产构建期任意文件写风险；正常输出路径由仓库配置控制，恶意构建配置/PR 仍可能触达。 | `4.63.0`，满足 Vite 当前范围；可能改变 chunk/hash，需比较构建和线上清单。 |
| `vite@7.3.0` | high；[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)、[GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r)、[GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583)、[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)、[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | **direct** | dev | 否 | 静态线上包不包含 Vite；但开发服务器的路径读取、WebSocket 和 Windows launch-editor/UNC 路径问题对本地开发具有实际风险，是本轮优先级最高的工具链项。 | `7.3.6`，无需升级 Vite 8；需复跑 dev、build 与浏览器 QA。 |

### 可达性口径

本表的“不可达”只表示在当前源码导入图、构建方式和正常命令中，没有从普通网站输入到达告警 API 的已知路径。它不表示漏洞不存在，也不覆盖恶意 PR、被污染的仓库文件、开发服务器暴露、依赖安装脚本或未来代码变化。

开发和 CI 工具同样属于供应链边界；“不进入浏览器 bundle”不是长期不修复的理由。

## 4. Lockfile 与安装脚本

锁文件结构检查结果：

- npm lockfile v3；
- 657 个外部 package entry 全部解析到官方 npm registry；
- 没有 Git URL、第三方 registry 或本地路径 dependency；
- 所有 resolved package 都有 integrity；
- `hasInstallScript` 仅见 `esbuild@0.27.2` 和平台可选的 `fsevents@2.3.3`。

CI 当前使用 `npm ci`，因此会执行依赖声明的安装脚本。不能未经验证直接改成 `--ignore-scripts`，因为 esbuild 的安装校验可能受影响；若未来强化这一边界，应在独立 PR 验证跨平台构建。

## 5. 最小升级路径

所有建议安全版本都满足当前父依赖的 semver 范围。本轮不需要升级到 Vite 8、ESLint 10、Recharts 3、Babel 8、AJV 8 或其他大版本。

建议在独立安全 PR 中：

1. 将直接依赖最低版本提高为：

   ```json
   {
     "postcss": "^8.5.26",
     "vite": "^7.3.6"
   }
   ```

2. 定向刷新受影响节点，不运行 audit fix：

   ```bash
   npm update @babel/core ajv brace-expansion flatted js-yaml lodash minimatch nanoid picomatch postcss rollup vite --ignore-scripts --no-audit --no-fund
   ```

3. 审查 lockfile，只接受预期的兼容更新。只读 dry-run 预计修改 21 个节点、无新增和删除；除表中包外，还会连带更新 Babel helper、Rollup 当前平台包与 `@types/estree`。
4. 使用 CI 对齐的 Node 22 执行干净安装和完整验收。

只读 dry-run 得到的目标解析版本为：

```text
@babel/core       7.29.7
ajv                6.15.0
brace-expansion    1.1.18 / 2.1.4
flatted            3.4.4
js-yaml            4.3.2
lodash             4.18.1
minimatch          3.1.5 / 9.0.9
nanoid             3.3.18
picomatch          2.3.2 / 4.0.7
postcss            8.5.26
rollup             4.63.0
vite               7.3.6
```

这些版本均越过本次 advisory 的受影响范围，但由于本轮没有真正更新 lockfile，**尚未验证升级后 audit 为零**。

## 6. 升级后的强制复验

未来执行升级后，至少记录：

```bash
npm ci
npm audit --json
npm audit --omit=dev --json
npm run check
```

还需检查：

- lint、hygiene 与 glob 文件集合没有意外变化；
- CSS、KaTeX 和主视觉没有回归；
- Vite dev server 与生产 build 正常；
- Rollup chunk、入口 hash、构建文件数量与 manifest 差异可解释；
- 首页、理解数学、可视化、练习、工具和冻结路由完成浏览器 QA；
- 若未来启用 Recharts，再验证图表交互和 lodash 实际 bundle 路径。

只有新的 full audit 与 omit-dev audit 实际返回预期结果后，才能把完成报告写成“依赖告警已修复”。如果仍有告警，应更新本报告并继续定向处理，不能改用 `npm audit fix --force` 掩盖问题。

## 7. 后续安全维护建议

- 当前修复完成后，可在 CI 增加 `npm audit --omit=dev --audit-level=high` 作为生产依赖最低门槛；是否把完整 dev audit 设为阻断门需结合误报和可维护性决定；
- 定期建立小范围依赖更新 PR，不自动合并大版本；
- `package.json` 增加与 README/CI 一致的 Node engines，避免本机与 CI 漂移；
- `@types/katex` 应从 runtime dependencies 移到 devDependencies；
- `recharts` 当前不可达，可在独立清理 PR 中确认是否保留，不应与安全补丁混成激进重构；
- CI 可考虑为 checkout 设置 `persist-credentials: false`，并评估是否将 GitHub Actions 固定到 commit SHA；
- `npm audit` 是持续变化的外部 advisory 快照，任何一次“0 vulnerabilities”都不能替代后续监测、代码可达性分析和人工审查。
