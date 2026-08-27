# MathForge 0.2 性能基线

记录日期：2026-08-27
范围：首页生产入口、路由代码拆分与《几何原本》数据加载架构。

## 1. 口径

本报告区分三类数据：

- **初始 JS**：`dist/index.html` 直接引用或 `modulepreload` 的 JavaScript；这是打开首页时确定进入请求链的代码。
- **全部 JS**：本次生产构建生成的所有 JavaScript chunk，不代表首页会全部下载。
- **Euclid 内容文件**：按需请求的 JSON 内容资源，不计入 JavaScript bundle。

Raw 为构建文件字节数；gzip 为构建工具给出的近似压缩值。CSS 单独统计，字体与图片不混入 JS 对比。

## 2. 修改前基线

旧入口静态导入所有路由，并在首页预加载两份完整《几何原本》语料：

| 初始资源 | Raw | gzip |
| --- | ---: | ---: |
| 应用入口 | 336,794 B | 103,023 B |
| Vendor | 767,159 B | 239,902 B |
| Euclid 英文及历史语料 | 1,658,067 B | 252,305 B |
| Euclid 现代中文语料 | 2,156,324 B | 343,981 B |
| **初始 JS 合计** | **4,918,344 B** | **939,211 B** |

也就是说，即使用户只打开首页，也会进入整部 Euclid 正文的下载链。

## 3. MathForge 0.2 当前构建

| 指标 | 当前值 |
| --- | ---: |
| 首页入口 JS | 68,164 B |
| Vendor JS | 834,180 B |
| **初始 JS Raw** | **902,344 B** |
| **初始 JS gzip** | **285,060 B（约 285.06 kB）** |
| CSS Raw | 153,299 B |
| CSS gzip | 29,402 B（约 29.40 kB） |
| JavaScript chunk 数 | 35 |
| 全部 JavaScript Raw | 1,180,371 B |

相对旧基线：

- 初始 JS Raw 减少 **4,016,000 B，约 81.7%**。
- 初始 JS gzip 减少 **654,151 B，约 69.6%**。
- 入口 chunk 从 336,794 B 降至 68,164 B，约减少 **79.8%**。
- 首页不再把两份合计 3,814,391 B 的 Euclid 单体语料放入初始模块预加载链。

当前全部 JS 比初始 JS 多 278,027 B；这部分主要由访问具体页面后才加载的路由 chunk 构成。

与 Euclid 直接相关的 route module（共享 vendor、repository、Markdown 等 chunk 另计）为：

| 路由模块 | Raw | gzip |
| --- | ---: | ---: |
| Euclid 阅读页 | 39,756 B | 13,830 B |
| Euclid 内部编辑页 | 14,652 B | 5,324 B |
| 第一性原理目录页 | 10,406 B | 3,930 B |

## 4. Euclid 按需层级

生成目录为 `public/content/euclid/`，共 **621 个 JSON 文件**：

| 层级 | 数量 | 用途 |
| --- | ---: | --- |
| `catalog.json` | 1 | 十三卷的最小总目录 |
| `books/*.index.json` | 13 | 每卷条目索引 |
| `entries/*.json` | 607 | 单个定义、公设、公理或命题正文 |

目标请求链为：

```text
首页
  不请求 Euclid 正文

《几何原本》目录
  → catalog.json
  → 用户选择某卷后请求该卷 index
  → 用户打开某条后请求对应 entry
```

该结构避免把 607 条正文重新打进一个同步 JavaScript chunk，也让未来按卷缓存、单条修订和内容 CDN 成为可能。

## 5. 已自动验证

- 生产构建通过。
- 路由已生成独立 chunk，首页入口只直接加载入口与 vendor。
- Euclid lazy-data verifier 通过。
- 生成文件计数为 1 个 catalog、13 个 book index、607 个 entry。
- 首页构建入口不再预加载旧的 `euclid-corpus` 与 `euclid-modern-zh` chunk。

以上构建结论来自生产产物和自动校验；下一节另列本地真实 Chromium 请求证据。它们仍不等同于公网服务器性能。

## 6. 本地浏览器实测与待线上验证

2026-08-27 使用本地开发服务器与真实 Chromium，通过 CDP `Network.responseReceived` 记录请求：

| 操作 | 实际 Euclid 内容请求 |
| --- | --- |
| 冷刷新首页 `/` | 无 |
| 首次进入 `/principles` | 只有 `catalog.json` |
| 在目录中选择第 I 卷 | 只有 `books/01.index.json` |
| 直接打开 I.47 | 只有 `entries/euclid-1-47.json` |
| 直接打开 I.Def.1 | 只有 `entries/euclid-1-def-1.json` |

这证明本地运行时已经形成 `catalog → book index → entry` 的分级请求，而不是只在构建文件名上“看起来懒加载”。同一轮还确认 I.47、I.Def.1 及 Book I 试验条目的控制台没有新的 error/warning；这不是 LCP、INP 或弱网性能测量。

仍待线上完成：

- 验证返回上一页后的内存缓存行为，以及刷新后的 HTTP 缓存行为。
- 在手机宽度和弱网条件下记录 LCP、交互可用时间及错误重试体验。
- 确认服务器为 JSON、JS、CSS 提供正确的 MIME、压缩和缓存头。
- 抽样并自动核对 SPA 深链接与 607 条 entry 的线上可达性。

## 7. 已知风险

1. **Vendor 仍然偏大。** 当前 vendor 为 834,180 B Raw，超过 Vite 默认 500 kB 警告阈值；它比旧基线增加 67,021 B。后续应按实际浏览器性能数据评估 KaTeX、Markdown/Radix 等依赖的拆分，不能只为消除警告机械切包。
2. **文件数量增加。** 621 个 Euclid JSON 改善了按需加载，但增加部署清单、缓存失效和完整性校验的复杂度；当前 CI 运行 verifier，生成器保留为显式、可复现的维护命令，重新生成后必须先核对源哈希和派生差异再提交。
3. **当前是构建基线，不是用户体验指标。** 尚未记录真实设备上的 LCP、INP、缓存命中率或弱网失败率。
4. **尚未建立 bundle budget。** 如果后续入口或 vendor 回涨，现有 CI 不会仅凭大小自动失败；建议在浏览器基线稳定后增加合理阈值。

## 8. 下一轮测量建议

完成线上部署后，追加同一环境下的：

- 首页冷启动与二次访问传输量；
- `/principles`、单卷目录、单命题页面的请求数和传输量；
- 桌面与移动端 LCP/INP；
- Euclid JSON 缓存命中与失败重试；
- 最大 route chunk 与 vendor 的变化。

在这些数据补齐前，可以确认“首页已在构建层面和本地浏览器请求层面停止预加载整部 Euclid”，但不能宣称公网性能验收全部完成。
