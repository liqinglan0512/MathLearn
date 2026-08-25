import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from './Markdown'

export function MarkdownEditor({
  value,
  onChange,
  rows = 14,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5">
        {(['write', 'preview'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              tab === t ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t === 'write' ? '编辑' : '预览'}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-neutral-400 sm:block">
          支持 Markdown 与 LaTeX（$…$ 行内，$$…$$ 独立公式）
        </span>
      </div>
      {tab === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0"
        />
      ) : (
        <div className="min-h-40 px-4 py-3">
          {value.trim() ? (
            <Markdown content={value} />
          ) : (
            <p className="text-sm text-neutral-400">暂无内容</p>
          )}
        </div>
      )}
    </div>
  )
}
