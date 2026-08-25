import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { compile } from '@/lib/mathparse'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface Curve {
  expr: string
  color: string
  enabled: boolean
}

const COLORS = ['#818cf8', '#f87171', '#34d399']
const PRESETS: { name: string; expr: string; params: number[] }[] = [
  { name: '泰勒逼近 sin', expr: 'x - x^3/6 + x^5/120', params: [1, 1, 1, 1] },
  { name: '阻尼振荡', expr: 'a*exp(-b*x)*sin(c*x)', params: [1, 0.3, 3, 1] },
  { name: '椭圆参数族', expr: 'sqrt(max(0, a^2*(1 - x^2/b^2)))', params: [1, 2, 1, 1] },
  { name: '正态密度', expr: 'exp(-(x-a)^2/(2*b^2))', params: [0, 1, 1, 1] },
]

export default function Viz() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [curves, setCurves] = useState<Curve[]>([
    { expr: 'sin(x)', color: COLORS[0], enabled: true },
    { expr: 'x - x^3/6 + x^5/120', color: COLORS[1], enabled: true },
    { expr: '', color: COLORS[2], enabled: false },
  ])
  const [params, setParams] = useState({ a: 1, b: 1, c: 1, d: 1 })
  const [view, setView] = useState({ cx: 0, cy: 0, span: 10 }) // span = x 轴总宽
  const [errors, setErrors] = useState<(string | null)[]>([null, null, null])
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const compiled = useMemo(
    () =>
      curves.map((c) => {
        if (!c.enabled || !c.expr.trim()) return null
        try {
          return compile(c.expr)
        } catch {
          return null
        }
      }),
    [curves],
  )

  useEffect(() => {
    setErrors(
      curves.map((c) => {
        if (!c.enabled || !c.expr.trim()) return null
        try {
          compile(c.expr)({ x: 0.5, ...params })
          return null
        } catch (e) {
          return e instanceof Error ? e.message : '表达式错误'
        }
      }),
    )
  }, [curves, params])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const xMin = view.cx - view.span / 2
    const xMax = view.cx + view.span / 2
    const ySpan = (view.span * H) / W
    const yMin = view.cy - ySpan / 2
    const yMax = view.cy + ySpan / 2
    const toX = (x: number) => ((x - xMin) / view.span) * W
    const toY = (y: number) => H - ((y - yMin) / ySpan) * H

    // 网格
    const step = niceStep(view.span / 10)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
      ctx.beginPath(); ctx.moveTo(toX(gx), 0); ctx.lineTo(toX(gx), H); ctx.stroke()
    }
    for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
      ctx.beginPath(); ctx.moveTo(0, toY(gy)); ctx.lineTo(W, toY(gy)); ctx.stroke()
    }
    // 坐标轴
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), H); ctx.stroke()
    // 刻度
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'center'
    for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
      if (Math.abs(gx) > step / 2) ctx.fillText(trimNum(gx), toX(gx), Math.min(H - 4, Math.max(12, toY(0) + 14)))
    }
    ctx.textAlign = 'right'
    for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
      if (Math.abs(gy) > step / 2) ctx.fillText(trimNum(gy), Math.max(24, Math.min(W - 6, toX(0) - 6)), toY(gy) + 3)
    }

    // 曲线
    const scope = { ...params }
    compiled.forEach((fn, i) => {
      if (!fn) return
      ctx.strokeStyle = curves[i].color
      ctx.lineWidth = 2
      ctx.beginPath()
      let pen = false
      let prevY = 0
      const N = W * 2
      for (let px = 0; px <= N; px++) {
        const x = xMin + (px / N) * view.span
        let y: number
        try {
          y = fn({ ...scope, x })
        } catch {
          pen = false
          continue
        }
        if (!Number.isFinite(y)) {
          pen = false
          continue
        }
        const sy = toY(y)
        // 跳跃检测（渐近线）
        if (pen && Math.abs(sy - prevY) > H * 2) pen = false
        if (pen) ctx.lineTo(toX(x), sy)
        else ctx.moveTo(toX(x), sy)
        pen = true
        prevY = sy
      }
      ctx.stroke()
    })
  }, [compiled, curves, params, view])

  useEffect(() => {
    draw()
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  function onWheel(e: React.WheelEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12
    setView((v) => {
      const span = Math.min(1e6, Math.max(1e-4, v.span * factor))
      const ySpan = (v.span * rect.height) / rect.width
      const xAtMouse = v.cx - v.span / 2 + mx * v.span
      const yAtMouse = v.cy + ySpan / 2 - my * ySpan
      return {
        span,
        cx: xAtMouse + (v.cx - xAtMouse) * factor,
        cy: yAtMouse + (v.cy - yAtMouse) * factor,
      }
    })
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">函数图像实验室</h1>
      <p className="mt-1 text-sm text-neutral-400">
        输入表达式，拖动滑块实时调整参数 a / b / c / d；滚轮缩放，拖拽平移。
      </p>

      <div
        className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-black/40"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="block h-[420px] w-full cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const rect = canvasRef.current!.getBoundingClientRect()
            const dx = ((e.clientX - drag.current.x) / rect.width) * view.span
            const dy = ((e.clientY - drag.current.y) / rect.height) * ((view.span * rect.height) / rect.width)
            setView((v) => ({ ...v, cx: drag.current!.cx - dx, cy: drag.current!.cy + dy }))
          }}
          onPointerUp={() => (drag.current = null)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.name}
            variant="outline"
            size="sm"
            onClick={() => {
              setCurves((cs) => cs.map((c, i) => (i === 0 ? { ...c, expr: p.expr, enabled: true } : c)))
              setParams({ a: p.params[0], b: p.params[1], c: p.params[2], d: p.params[3] })
            }}
          >
            {p.name}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setView({ cx: 0, cy: 0, span: 10 })}>
          复位视图
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {curves.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={(e) => setCurves((cs) => cs.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))}
                className="h-4 w-4 accent-white"
              />
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              <Input
                value={c.expr}
                onChange={(e) => setCurves((cs) => cs.map((x, j) => (j === i ? { ...x, expr: e.target.value } : x)))}
                placeholder={`f${i + 1}(x) = … 如 a*sin(b*x)`}
                className="font-mono text-sm"
              />
            </div>
          ))}
          {errors.map(
            (e, i) =>
              e && curves[i].enabled && <p key={i} className="text-xs text-red-400">曲线 {i + 1}：{e}</p>,
          )}
          <p className="text-xs text-neutral-400">
            支持：+ − * / ^、括号、sin cos tan exp ln log sqrt abs min max …、常量 pi e、变量 x 与参数 a b c d；支持隐式乘法（2x、2sin(x)）。
          </p>
        </div>
        <div className="space-y-5">
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span className="font-mono font-medium">{k}</span>
                <span className="font-mono text-neutral-400">{params[k].toFixed(2)}</span>
              </div>
              <Slider
                value={[params[k]]}
                min={-5}
                max={5}
                step={0.01}
                onValueChange={([v]) => setParams((p) => ({ ...p, [k]: v }))}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function niceStep(raw: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  if (n < 1.5) return mag
  if (n < 3.5) return 2 * mag
  if (n < 7.5) return 5 * mag
  return 10 * mag
}

function trimNum(x: number) {
  const r = Math.round(x * 1e6) / 1e6
  return String(r)
}
