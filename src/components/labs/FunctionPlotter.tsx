import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ParameterControl } from '@/components/labs/ConceptLabs'
import { LAB_COLORS, formatNumber } from '@/components/labs/canvasDrawing'
import { compile } from '@/lib/mathparse'

interface Curve {
  expr: string
  color: string
  enabled: boolean
}

const COLORS = [LAB_COLORS.ivory, LAB_COLORS.gold, LAB_COLORS.sage]

const PRESETS: { name: string; expr: string; params: [number, number, number, number] }[] = [
  { name: '泰勒逼近 sin', expr: 'x - x^3/6 + x^5/120', params: [1, 1, 1, 1] },
  { name: '阻尼振荡', expr: 'a*exp(-b*x)*sin(c*x)', params: [1, 0.3, 3, 1] },
  { name: '椭圆参数族', expr: 'sqrt(max(0, a^2*(1 - x^2/b^2)))', params: [1, 2, 1, 1] },
  { name: '正态密度', expr: 'exp(-(x-a)^2/(2*b^2))', params: [0, 1, 1, 1] },
]

export function FunctionPlotter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [curves, setCurves] = useState<Curve[]>([
    { expr: 'sin(x)', color: COLORS[0], enabled: true },
    { expr: 'x - x^3/6 + x^5/120', color: COLORS[1], enabled: true },
    { expr: '', color: COLORS[2], enabled: false },
  ])
  const [params, setParams] = useState({ a: 1, b: 1, c: 1, d: 1 })
  const [view, setView] = useState({ cx: 0, cy: 0, span: 10 })
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const parsed = useMemo(
    () =>
      curves.map((curve) => {
        if (!curve.enabled || !curve.expr.trim()) return { fn: null, error: null }

        try {
          const fn = compile(curve.expr)
          fn({ x: 0.5, ...params })
          return { fn, error: null }
        } catch (error) {
          return { fn: null, error: error instanceof Error ? error.message : '表达式错误' }
        }
      }),
    [curves, params],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)

    const xMin = view.cx - view.span / 2
    const xMax = view.cx + view.span / 2
    const ySpan = (view.span * height) / width
    const yMin = view.cy - ySpan / 2
    const yMax = view.cy + ySpan / 2
    const toX = (value: number) => ((value - xMin) / view.span) * width
    const toY = (value: number) => height - ((value - yMin) / ySpan) * height
    const step = niceStep(view.span / 10)

    context.strokeStyle = LAB_COLORS.grid
    context.lineWidth = 1
    context.beginPath()

    for (let value = Math.ceil(xMin / step) * step; value <= xMax; value += step) {
      context.moveTo(toX(value), 0)
      context.lineTo(toX(value), height)
    }

    for (let value = Math.ceil(yMin / step) * step; value <= yMax; value += step) {
      context.moveTo(0, toY(value))
      context.lineTo(width, toY(value))
    }

    context.stroke()
    context.strokeStyle = LAB_COLORS.axis
    context.beginPath()
    context.moveTo(0, toY(0))
    context.lineTo(width, toY(0))
    context.moveTo(toX(0), 0)
    context.lineTo(toX(0), height)
    context.stroke()

    context.fillStyle = LAB_COLORS.muted
    context.font = '10px ui-monospace, monospace'
    context.textAlign = 'center'

    for (let value = Math.ceil(xMin / step) * step; value <= xMax; value += step) {
      if (Math.abs(value) > step / 2) {
        context.fillText(formatNumber(value, 4), toX(value), Math.min(height - 5, Math.max(13, toY(0) + 15)))
      }
    }

    context.textAlign = 'right'

    for (let value = Math.ceil(yMin / step) * step; value <= yMax; value += step) {
      if (Math.abs(value) > step / 2) {
        context.fillText(formatNumber(value, 4), Math.max(25, Math.min(width - 7, toX(0) - 7)), toY(value) + 4)
      }
    }

    parsed.forEach(({ fn }, index) => {
      if (!fn) return

      context.strokeStyle = curves[index].color
      context.lineWidth = 2.1
      context.beginPath()
      const samples = Math.round(width * 1.6)
      let previousY = Number.NaN
      let started = false

      for (let position = 0; position <= samples; position++) {
        const pointX = xMin + (position / samples) * view.span
        let pointY: number

        try {
          pointY = fn({ ...params, x: pointX })
        } catch {
          started = false
          continue
        }

        if (!Number.isFinite(pointY)) {
          started = false
          continue
        }

        const screenY = toY(pointY)
        if (started && Math.abs(screenY - previousY) <= height * 2) context.lineTo(toX(pointX), screenY)
        else context.moveTo(toX(pointX), screenY)
        previousY = screenY
        started = true
      }

      context.stroke()
    })
  }, [curves, params, parsed, view])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draw])

  function onWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const horizontal = (event.clientX - rect.left) / rect.width
    const vertical = (event.clientY - rect.top) / rect.height
    const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12

    setView((previous) => {
      const span = Math.min(1e6, Math.max(1e-4, previous.span * factor))
      const ySpan = (previous.span * rect.height) / rect.width
      const mouseX = previous.cx - previous.span / 2 + horizontal * previous.span
      const mouseY = previous.cy + ySpan / 2 - vertical * ySpan
      return {
        span,
        cx: mouseX + (previous.cx - mouseX) * factor,
        cy: mouseY + (previous.cy - mouseY) * factor,
      }
    })
  }

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(230px,280px)] lg:gap-9">
        <section className="min-w-0 overflow-hidden rounded-xl bg-[#12130f]/90 ring-1 ring-white/[0.045]">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="自由函数图像，可滚轮缩放和拖拽平移"
            className="block h-[360px] w-full cursor-grab active:cursor-grabbing sm:h-[430px] xl:h-[500px]"
            style={{ touchAction: 'none' }}
            onWheel={onWheel}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = { x: event.clientX, y: event.clientY, cx: view.cx, cy: view.cy }
            }}
            onPointerMove={(event) => {
              const start = drag.current
              const canvas = canvasRef.current
              if (!start || !canvas) return
              const rect = canvas.getBoundingClientRect()
              const horizontal = ((event.clientX - start.x) / rect.width) * view.span
              const vertical = ((event.clientY - start.y) / rect.height) * ((view.span * rect.height) / rect.width)
              setView((previous) => ({ ...previous, cx: start.cx - horizontal, cy: start.cy + vertical }))
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.055] px-4 py-3 text-xs text-[#9e9c92]">
            <span>滚轮缩放 · 按住拖拽平移</span>
            <button
              type="button"
              onClick={() => setView({ cx: 0, cy: 0, span: 10 })}
              className="inline-flex items-center gap-1.5 text-[#cfbc90] hover:text-[#eee8d9]"
            >
              <RotateCcw className="h-3.5 w-3.5" />复位视图
            </button>
          </div>
        </section>

        <aside aria-label="函数绘图控制面板" className="space-y-5 px-1 sm:px-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d8e83]">函数表达式</p>
          {curves.map((curve, index) => (
            <label key={index} className="flex items-center gap-2">
              <input
                aria-label={`启用曲线 ${index + 1}`}
                type="checkbox"
                checked={curve.enabled}
                onChange={(event) =>
                  setCurves((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))
                }
                className="h-3.5 w-3.5 shrink-0 accent-[#c7ad70]"
              />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: curve.color }} />
              <Input
                aria-label={`函数表达式 ${index + 1}`}
                value={curve.expr}
                onChange={(event) =>
                  setCurves((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, expr: event.target.value } : item))
                }
                placeholder={`f${index + 1}(x)`}
                className="h-9 border-white/[0.09] bg-transparent font-mono text-xs"
              />
            </label>
          ))}
          {parsed.map(({ error }, index) =>
            error && curves[index].enabled ? (
              <p key={index} role="alert" className="text-xs leading-5 text-[#d29686]">
                曲线 {index + 1}：{error}
              </p>
            ) : null,
          )}
          <div className="space-y-5 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d8e83]">实时参数</p>
            {(['a', 'b', 'c', 'd'] as const).map((key) => (
              <ParameterControl
                key={key}
                label={`参数 ${key}`}
                value={params[key]}
                min={-5}
                max={5}
                step={0.01}
                onChange={(value) => setParams((previous) => ({ ...previous, [key]: value }))}
                reset={0}
              />
            ))}
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-[#88897f]">快速开始</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setCurves((previous) => previous.map((curve, index) => index === 0 ? { ...curve, expr: preset.expr, enabled: true } : curve))
              setParams({ a: preset.params[0], b: preset.params[1], c: preset.params[2], d: preset.params[3] })
            }}
            className="rounded-full bg-white/[0.045] px-3 py-1.5 text-xs text-[#c0bcae] transition-colors hover:bg-[#c7ad70]/12 hover:text-[#e9d8b0]"
          >
            {preset.name}
          </button>
        ))}
      </div>
      <p className="mt-4 max-w-3xl text-xs leading-6 text-[#85867d]">
        支持 +、−、*、/、^、括号、sin、cos、tan、exp、ln、log、sqrt、abs、min、max，常量 pi、e，变量 x 与参数 a、b、c、d；也支持 2x、2sin(x) 等隐式乘法。
      </p>
    </>
  )
}

function niceStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  if (normalized < 1.5) return magnitude
  if (normalized < 3.5) return 2 * magnitude
  if (normalized < 7.5) return 5 * magnitude
  return 10 * magnitude
}
