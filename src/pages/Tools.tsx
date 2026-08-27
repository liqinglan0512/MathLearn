import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { evaluate } from '@/lib/mathparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const LATEX_SNIPPETS = [
  { label: '分数', tex: '\\frac{a}{b}' },
  { label: '根号', tex: '\\sqrt{x}' },
  { label: '上标', tex: 'x^{2}' },
  { label: '下标', tex: 'a_{n}' },
  { label: '求和', tex: '\\sum_{i=1}^{n}' },
  { label: '积分', tex: '\\int_{a}^{b}' },
  { label: '极限', tex: '\\lim_{n \\to \\infty}' },
  { label: '矩阵', tex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: '希腊字母', tex: '\\alpha, \\beta, \\gamma, \\theta, \\lambda, \\pi, \\omega' },
]

export default function Tools() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">基础工具</h1>
      <p className="mt-1 text-sm text-neutral-400">公式编辑器与计算器，备赛手边的小工具。</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <FormulaEditor />
        <Calculator />
      </div>
    </div>
  )
}

function FormulaEditor() {
  const [tex, setTex] = useState('e^{i\\pi} + 1 = 0')
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: true })
    } catch {
      return null
    }
  }, [tex])

  return (
    <section className="rounded-lg border border-white/10 p-5">
      <h2 className="font-medium">公式编辑器</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {LATEX_SNIPPETS.map((s) => (
          <button
            key={s.label}
            onClick={() => setTex((t) => t + s.tex)}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-neutral-400 hover:border-white/25 hover:text-neutral-100"
          >
            {s.label}
          </button>
        ))}
      </div>
      <Textarea
        value={tex}
        onChange={(e) => setTex(e.target.value)}
        rows={4}
        className="mt-3 font-mono text-sm"
        placeholder="输入 LaTeX，如 \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}"
      />
      <div className="mt-4 min-h-20 rounded-lg bg-white/5 p-4">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} className="overflow-x-auto" />
        ) : (
          <p className="text-sm text-red-400">LaTeX 语法有误，请检查。</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          navigator.clipboard.writeText(tex)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
        复制 LaTeX 源码
      </Button>
    </section>
  )
}

function Calculator() {
  const [expr, setExpr] = useState('sqrt(2) * 10^3')
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])

  const result = useMemo(() => {
    if (!expr.trim()) return null
    try {
      const v = evaluate(expr)
      if (!Number.isFinite(v)) return '结果不是有限数'
      return String(Math.round(v * 1e10) / 1e10)
    } catch {
      return null
    }
  }, [expr])

  return (
    <section className="rounded-lg border border-white/10 p-5">
      <h2 className="font-medium">计算器</h2>
      <div className="mt-3 flex gap-2">
        <Input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && result && !result.startsWith('结果')) {
              setHistory((h) => [{ expr, result }, ...h].slice(0, 12))
            }
          }}
          className="font-mono text-sm"
          placeholder="如 sqrt(2)*10^3、sin(pi/6)、2^10"
        />
        <Button
          variant="outline"
          onClick={() => {
            if (result && !result.startsWith('结果')) setHistory((h) => [{ expr, result }, ...h].slice(0, 12))
          }}
        >
          计算
        </Button>
      </div>
      <div className="mt-3 rounded-lg bg-black/60 px-4 py-3 font-mono text-lg text-white">
        {result ?? <span className="text-sm text-neutral-400">表达式不完整或有误</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        支持 + − * / ^、括号与 sin cos tan exp ln log sqrt abs 等函数；按回车记录历史。
      </p>
      {history.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 border-t border-white/5 font-mono text-sm">
          {history.map((h, i) => (
            <li key={i} className="flex justify-between gap-4 py-2">
              <span className="truncate text-neutral-400">{h.expr}</span>
              <span className="shrink-0 font-medium">{h.result}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
