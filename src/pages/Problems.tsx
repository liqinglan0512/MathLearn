import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { store } from '@/lib/store'
import { CHAPTERS, COMPETITIONS, DIFFICULTIES } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const DIFF_STYLE: Record<string, string> = {
  入门: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  基础: 'border-sky-200 bg-sky-50 text-sky-700',
  提高: 'border-amber-200 bg-amber-50 text-amber-700',
  冲刺: 'border-orange-200 bg-orange-50 text-orange-700',
  决赛: 'border-red-200 bg-red-50 text-red-700',
}

export default function Problems() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [chapter, setChapter] = useState(params.get('chapter') ?? '')
  const [difficulty, setDifficulty] = useState('')
  const [competition, setCompetition] = useState('')

  const problems = store.problems()
  const solutions = store.solutions()

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return problems.filter((p) => {
      if (chapter && p.chapter !== chapter) return false
      if (difficulty && p.difficulty !== difficulty) return false
      if (competition && p.competition !== competition) return false
      if (kw) {
        const hay = `${p.title} ${p.statement} ${p.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [problems, q, chapter, difficulty, competition])

  return (
    <div className="py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">题库</h1>
          <p className="mt-1 text-sm text-neutral-500">共 {filtered.length} 道题 · 点击题目查看社区解法</p>
        </div>
        <Button size="sm" onClick={() => nav(user ? '/problems/new' : '/login')}>
          <Plus className="mr-1 h-4 w-4" /> 上传题目
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索关键词，如「Stolz」「秩」「随机游动」…"
            className="pl-9"
          />
        </div>
        <FilterRow label="章节" options={CHAPTERS} value={chapter} onChange={setChapter} />
        <FilterRow label="难度" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
        <FilterRow label="竞赛" options={COMPETITIONS} value={competition} onChange={setCompetition} />
      </div>

      <div className="mt-6 divide-y divide-neutral-100 border-t border-neutral-100">
        {filtered.map((p) => (
          <Link key={p.id} to={`/problems/${p.id}`} className="block py-4 transition-colors hover:bg-neutral-50/60">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-medium leading-snug">{p.title}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline">{p.chapter}</Badge>
                  <Badge variant="outline" className={DIFF_STYLE[p.difficulty]}>
                    {p.difficulty}
                  </Badge>
                  <span className="text-neutral-400">{p.competition}</span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-neutral-400">
                {solutions.filter((s) => s.problemId === p.id).length} 份解法
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-neutral-400">没有符合条件的题目，换个关键词试试。</p>
        )}
      </div>
    </div>
  )
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 w-10 shrink-0 text-xs text-neutral-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={!value} onClick={() => onChange('')}>
          全部
        </FilterChip>
        {options.map((o) => (
          <FilterChip key={o} active={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </FilterChip>
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
      }`}
    >
      {children}
    </button>
  )
}
