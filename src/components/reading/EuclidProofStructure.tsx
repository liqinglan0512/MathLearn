import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowDownRight, ArrowUpRight, GitBranch, ShieldCheck } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import {
  EUCLID_BOOKS,
  getEuclidDependencies,
  getEuclidDependents,
  getEuclidEntry,
  type EuclidEntry,
} from '@/lib/euclid'
import { describeEuclidEntry, getEuclidEntryKindLabel, type ReadingSemanticBlock } from '@/lib/reading-blocks'

function shortEntryLabel(entry: EuclidEntry) {
  const roman = EUCLID_BOOKS[entry.book - 1]?.roman ?? String(entry.book)
  return entry.kind === 'proposition'
    ? `${roman}.${entry.proposition}`
    : `${roman} · ${getEuclidEntryKindLabel(entry)} ${entry.proposition}`
}

function blockFamilyLabel(kind: string) {
  if (kind === 'statement' || kind === 'definition' || kind === 'postulate' || kind === 'common-notion') return '陈述'
  if (kind === 'construction') return '作图'
  if (kind === 'proof') return '证明'
  if (kind === 'conclusion') return '结论'
  if (kind === 'modern') return '现代重述'
  if (kind === 'alternative') return '另一种证明'
  if (kind === 'common-error') return '逻辑核对'
  if (kind === 'historical') return '历史原文'
  if (kind === 'historical-modern') return '现代汉语解读'
  if (kind === 'source') return '可核验来源'
  return '正文'
}

export function SemanticProofBlocks({ blocks }: { blocks: readonly ReadingSemanticBlock[] }) {
  const genericArticle = blocks.length === 1 && blocks[0].kind === 'body'

  if (genericArticle) {
    const block = blocks[0]
    return (
      <div data-block-id={block.id} data-block-version={block.version} data-block-kind={block.kind}>
        <Markdown content={block.content} />
      </div>
    )
  }

  return (
    <div className="space-y-9" aria-label="按原典段落展开的语义证明链">
      {blocks.some((block) => Boolean(block.originalContent)) && (
        <p className="text-xs leading-7 opacity-75" data-annotation-ui="true">
          现代中文为机器辅助译文；每一段下方始终保留 Heath 英译底本，便于逐字核对。
          历史古译后的白话亦为机器辅助解读，只解释紧邻的古文，不冒充人工校勘定本。
        </p>
      )}
      {blocks.map((block, index) => (
        <section
          key={block.id}
          data-block-id={block.id}
          data-block-version={block.version}
          data-block-kind={block.kind}
          data-block-language="zh-CN"
          aria-label={`${blockFamilyLabel(block.kind)}：${block.title}`}
          className={`scroll-mt-24 border-l pl-4 sm:pl-6 ${
            block.kind === 'common-error'
              ? 'border-[#c78f7c]/55'
              : block.kind === 'source'
                ? 'border-current/15'
                : 'border-[#c7ad70]/35'
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px] tabular-nums tracking-[0.18em] text-[#a58f60]">
              {String(index + 1).padStart(2, '0')} · {blockFamilyLabel(block.kind)}
            </span>
            <h2 className="text-sm font-medium opacity-90">{block.title}</h2>
            {block.kind === 'historical-modern' && (
              <span className="text-[10px] tracking-[0.08em] opacity-65" data-translation-method="machine-assisted">
                机器辅助
              </span>
            )}
          </div>

          <div data-reading-role={block.kind === 'historical' ? 'historical-original' : 'modern-chinese'}>
            <Markdown content={block.content} />
          </div>

          {block.originalContent && (
            <aside
              data-reading-role="english-original"
              className="mt-4 border-l border-current/15 pl-3 sm:pl-4 [&_.md]:text-[13px] [&_.md]:leading-7 [&_.md]:opacity-80"
            >
              <p className="text-[10px] tracking-[0.14em] opacity-65">英文原文 · Heath 底本</p>
              <div lang="en">
                <Markdown content={block.originalContent} />
              </div>
            </aside>
          )}

          {block.citations.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]" aria-label="本步骤引用的前置命题">
              <ShieldCheck className="h-3.5 w-3.5 text-[#b8a06a]" />
              <span className="opacity-70">这一段引用：</span>
              {block.citations.map((citationId) => {
                const cited = getEuclidEntry(citationId)
                if (!cited) return null
                return (
                  <Link
                    key={citationId}
                    to={`/principles/${citationId}`}
                    className="rounded-sm border border-[#c7ad70]/25 px-2 py-1 text-[#ae9563] transition-colors hover:border-[#c7ad70]/55"
                  >
                    {shortEntryLabel(cited)}
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

export function EuclidDependencyGraph({ articleId }: { articleId: string }) {
  const [showAllDependencies, setShowAllDependencies] = useState(false)
  const [showAllDependents, setShowAllDependents] = useState(false)
  const entry = getEuclidEntry(articleId)
  if (!entry) return null

  const dependencies = getEuclidDependencies(articleId)
  const dependents = getEuclidDependents(articleId)
  const visibleDependencies = showAllDependencies ? dependencies : dependencies.slice(0, 8)
  const visibleDependents = showAllDependents ? dependents : dependents.slice(0, 8)

  return (
    <section className="mt-14 border-t border-current/10 pt-9" aria-label="双向证明依赖图">
      <h2 className="inline-flex items-center gap-2 text-base font-medium">
        <GitBranch className="h-4 w-4 text-[#b8a06a]" /> {describeEuclidEntry(entry)} · 双向证明链
      </h2>
      <p className="mt-2 text-xs leading-6 opacity-70">只展示原典文本中能够核对的明确引用，不推测没有写出的依赖关系。</p>

      <div className="mt-6 grid gap-7 sm:grid-cols-2">
        <DependencyList
          title="它依赖哪些前置结论"
          direction="before"
          entries={visibleDependencies}
          total={dependencies.length}
          expanded={showAllDependencies}
          onExpand={() => setShowAllDependencies(true)}
          empty="原典没有标出可核验的更早命题引用。"
        />
        <DependencyList
          title="哪些后续命题引用它"
          direction="after"
          entries={visibleDependents}
          total={dependents.length}
          expanded={showAllDependents}
          onExpand={() => setShowAllDependents(true)}
          empty="目前未在底本文本中找到明确的后续引用。"
        />
      </div>
    </section>
  )
}

function DependencyList({
  title,
  direction,
  entries,
  total,
  expanded,
  onExpand,
  empty,
}: {
  title: string
  direction: 'before' | 'after'
  entries: EuclidEntry[]
  total: number
  expanded: boolean
  onExpand: () => void
  empty: string
}) {
  const Icon = direction === 'before' ? ArrowUpRight : ArrowDownRight

  return (
    <div>
      <h3 className="text-sm font-medium opacity-90">{title} · {total}</h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-xs leading-6 opacity-70">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/principles/${entry.id}`}
              className="group flex items-start gap-2 rounded-sm px-1 py-1.5 text-xs leading-6 transition-colors hover:bg-current/[0.04]"
            >
              <Icon className="mt-1 h-3.5 w-3.5 shrink-0 text-[#b8a06a]" />
              <span><span className="font-medium">{shortEntryLabel(entry)}</span> · {entry.title}</span>
            </Link>
          ))}
          {!expanded && total > entries.length && (
            <button type="button" onClick={onExpand} className="pt-1 text-xs text-[#ae9563] hover:text-[#c7ad70]">
              展开其余 {total - entries.length} 条真实引用
            </button>
          )}
        </div>
      )}
    </div>
  )
}
