# MathForge《几何原本》语料来源与校验边界

## 权威底本

- 作品：Euclid, *The Thirteen Books of Euclid's Elements*。
- 英译：Thomas Little Heath，Cambridge University Press，1908 年。
- 电子整理：Perseus Digital Library / Trustees of Tufts University。
- 权威 TEI/XML：[PerseusDL/canonical-greekLit 中的 Heath 英译](https://github.com/PerseusDL/canonical-greekLit/blob/master/data/tlg1799/tlg001/tlg1799.tlg001.perseus-eng2.xml)。
- 稳定文本标识：`urn:cts:greekLit:tlg1799.tlg001.perseus-eng2`。
- 上游授权：[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)。上游 TEI 文件 `<licence>` 与仓库 `license.md` 均明确标示此许可。沿用此语料或者其改编内容时，应保留署名、来源、许可链接以及相同方式共享要求。
- 本次核验的 XML SHA-256：`ba12e2e47aec41f853ff32929a2d0467926f93280f1bf8870bda5016c29d143c`。

## 完整性统计

| 卷 | 正文命题 | 定义 | 公设或公理 |
| --- | ---: | ---: | ---: |
| I | 48 | 23 | 10 |
| II | 14 | 2 | 0 |
| III | 37 | 11 | 0 |
| IV | 16 | 7 | 0 |
| V | 25 | 18 | 0 |
| VI | 33 | 5 | 0 |
| VII | 39 | 22 | 0 |
| VIII | 27 | 0 | 0 |
| IX | 36 | 0 | 0 |
| X | 115 | 16 | 0 |
| XI | 39 | 28 | 0 |
| XII | 18 | 0 | 0 |
| XIII | 18 | 0 | 0 |
| **总计** | **465** | **132** | **10** |

因此网站共生成 **607 篇独立条目**。部分二手简介采用其他传本或统计口径，写成“119 个定义”；MathForge 不为了迎合二手数字删减权威 TEI 中实际存在的记录。

全部 **465 条命题均有真实、非空的 Heath 英译命题与证明**。第 VI 卷定义 5 的上游 TEI 仅保留 `<p />` 空段落，网站保留其条目并明确标注“上游 TEI 原文缺失”，不伪造原文。

条目顺序直接跟随权威 TEI，不根据标题或时间重新排列。第 I 卷依次为定义、公设、公理和命题；第 X 卷的定义则与命题保持底本交错顺序：定义 1—4、命题 1—47、定义 5—10、命题 48—84、定义 11—16、命题 85—115。

第 X 卷的三组定义在底本中分别重新从 1 编号。网站将其依次规范成 `euclid-10-def-1` 至 `euclid-10-def-16`，同时保留底本的 `sourceGroup` 与 `sourceNumber`。第 I 卷最后两条公理在 TEI 源编号为 7、8，但底本正文显示为公理 4、5；网站使用读者看到的规范编号，并保留源编号供核验。

共提取 **1,925 条有明确上游引用依据的命题依赖关系**，并基于同一批关系生成正向与反向索引；不推测缺乏原文支持的依赖。证明块按底本真实段落切分，保留语义 ID、逐段可跳转引用以及可复核的内容版本。

## 历史中文材料

- 来源：[维基文库《几何原本》](https://zh.wikisource.org/zh-hans/%E5%B9%BE%E4%BD%95%E5%8E%9F%E6%9C%AC)。
- 古译者：徐光启、利玛窦，1607 年。
- 原始古译属于公有领域；维基文库整理文本遵循其页面标示的 CC BY-SA 4.0 条款。
- 只有 I、II、III、IV、VI 卷的全部命题编号及数量与 Heath 底本逐卷核对一致，才逐条附上历史中文正文，共 **148 条**。
- 第 V 卷历史中译为 34 题，Heath 底本为 25 题；不得按序号机械配对，因此完全排除。
- 维基文库标明其项目尚未完成，VII—XIII 卷没有可直接复用的录入正文；这些条目保留可靠的 Heath 英译，明确说明没有核验通过的中文古译。
- 两个历史版本终究属于不同传本，即使命题编号一致也不宣称逐字同版；对应页面保留版本提示与两条可跳转的原始出处。
- 网站的简短现代中文标题属于编辑性导读，不冒充历史古译；古译出现“解曰”“论曰”“法曰”等证明开头时，只将其前面的真实命题陈述用于标题或摘要，完整古译证明仍原样保留。

## 现代中文与原文对照

- 全部 607 条独立页面均有现代中文导读；除 VI 卷定义 5 因底本原文缺失而明确说明无法翻译之外，其余 **606 条命题、定义、公设和公理陈述**均对应一条真实 Heath 英译。
- **465 条命题的全部 5,495 个原始证明段落**逐段提供机器辅助现代中文；每段现代中文下方完整展示对应英文底本，不删除、折叠、替换或伪造原文。
- 148 条通过版本逐卷核验的历史中文命题共含 **443 个古译正文段落**。每段先展示徐光启、利玛窦古文，再展示直接依据同一古文段落生成的现代白话解读；古文命题陈述另外附有逐条现代白话。
- 历史白话使用 Microsoft Translator 已公开支持的 [Literary Chinese / 文言文翻译](https://www.microsoft.com/en-us/translator/blog/2021/08/25/microsoft-translator-releases-literary-chinese-translation/)，从 `lzh` 直接译为 `zh-Hans`，不通过英文迂回改写。几何点名、古译引用与内部 Markdown 链接先保护再还原。
- 英文现代翻译使用隔离运行的 [Helsinki-NLP/opus-mt-en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh) 开源模型，模型采用 Apache-2.0 许可；此前缓存的少量样本来自 Microsoft Translator。对 `produce`、`meet`、`base`、`prime to one another`、`rational`、`commensurable` 等数学术语进行明确预处理和校验。
- I.1、I.21、I.27、I.47 与 I.Def.15 等容易产生逻辑误译的关键条目另外经过逐段人工复核。尤其区分“线段长度之和”“正方形面积之和”，避免把古文反问“岂不更大于”译成相反的不等关系。
- 现代中文与古文白话均明确标注为**机器辅助译文/解读**，并与历史古译、Heath 英译及其开放许可严格区分；不冒充经过完整人工校勘的出版译本。

## 重新生成

```powershell
python scripts/build-euclid-corpus.py
```

构建脚本使用 Python 标准库自动获取权威 TEI/XML 与可核验的维基文库古译。它会检查源许可、十三卷顺序、逐卷命题与定义数量、完整证明、唯一 ID、历史中译逐卷编号，以及所有内部依赖是否真正存在。

生成文件为 `src/lib/euclid-data.json`；页面使用 `src/lib/euclid.ts` 为每个真实引用生成 `/principles/euclid-…` 内部跳转，并为每篇条目附上版权许可和上游来源。

现代中文另存为 `src/lib/euclid-modern-zh.json`，由 `scripts/translate-euclid-modern.py` 生成。脚本按原始段落建立 SHA-256 持久缓存，支持重试与断点恢复；历史白话和英文现代译文保持独立来源，最终构建时校验原始段落数量、逐字英文、古文原文及内部跳转链接。
