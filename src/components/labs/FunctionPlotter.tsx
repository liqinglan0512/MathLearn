import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RotateCcw, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { LAB_COLORS, formatNumber } from '@/components/labs/canvasDrawing'
import { compile } from '@/lib/mathparse'

interface Curve {
  expr: string
  color: string
  enabled: boolean
}

const COLORS = [LAB_COLORS.ivory, LAB_COLORS.gold, LAB_COLORS.sage, LAB_COLORS.clay, '#a8a2c4', '#95b7c7']

const PRESETS: { name: string; expr: string; params: Record<string, number> }[] = [
  { name: '泰勒逼近 sin', expr: 'x - x^3/6 + x^5/120', params: {} },
  { name: '阻尼振荡', expr: 'amplitude*exp(-decay*x)*sin(omega*x)', params: { amplitude: 1, decay: 0.3, omega: 3 } },
  { name: '椭圆参数族', expr: 'sqrt(max(0, a^2*(1 - x^2/b^2)))', params: { a: 1, b: 2 } },
  { name: '正态密度', expr: 'exp(-(x-mu)^2/(2*sigma^2))', params: { mu: 0, sigma: 1 } },
]

const RESERVED_IDENTIFIERS = new Set([
  'x', 'pi', 'π', 'e', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'exp', 'ln', 'log', 'log2', 'sqrt', 'cbrt', 'abs', 'sinh', 'cosh',
  'tanh', 'floor', 'ceil', 'round', 'sign', 'min', 'max',
])

export function FunctionPlotter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [curves, setCurves] = useState<Curve[]>([
    { expr: 'sin(x)', color: COLORS[0], enabled: true },
    { expr: 'x - x^3/6 + x^5/120', color: COLORS[1], enabled: true },
    { expr: '', color: COLORS[2], enabled: false },
  ])
  const [params, setParams] = useState<Record<string, number>>({ a: 1, b: 1, c: 1, d: 1 })
  const [parameterName, setParameterName] = useState('')
  const [parameterError, setParameterError] = useState('')
  const [view, setView] = useState({ cx: 0, cy: 0, span: 10 })
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const detectedParameters = useMemo(() => {
    const identifiers = new Set<string>()
    for (const curve of curves) {
      for (const identifier of curve.expr.match(/[a-zA-Z][a-zA-Z0-9_]*/g) ?? []) {
        const normalized = identifier.toLowerCase()
        if (!RESERVED_IDENTIFIERS.has(normalized)) identifiers.add(normalized)
      }
    }
    return identifiers
  }, [curves])

  const parameterNames = useMemo(
    () => [...new Set([...Object.keys(params), ...detectedParameters])],
    [detectedParameters, params],
  )

  const effectiveParams = useMemo(
    () => Object.fromEntries(parameterNames.map((name) => [name, params[name] ?? 1])),
    [parameterNames, params],
  )

  const parameterScope = useMemo(
    () => Object.fromEntries(Object.entries(effectiveParams).map(([name, value]) => [encodeParameterName(name), value])),
    [effectiveParams],
  )

  const parsed = useMemo(
    () =>
      curves.map((curve) => {
        if (!curve.enabled || !curve.expr.trim()) return { fn: null, error: null }

        try {
          const fn = compile(encodeExpressionParameters(curve.expr))
          fn({ x: 0.5, ...parameterScope })
          return { fn, error: null }
        } catch (error) {
          return { fn: null, error: error instanceof Error ? error.message : '表达式错误' }
        }
      }),
    [curves, parameterScope],
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
          pointY = fn({ ...parameterScope, x: pointX })
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
  }, [curves, parameterScope, parsed, view])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draw])

  function addParameter() {
    const normalized = parameterName.trim().toLowerCase()
    if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
      setParameterError('参数名称须以英文字母开头，只能包含字母、数字和下划线。')
      return
    }
    if (RESERVED_IDENTIFIERS.has(normalized)) {
      setParameterError('该名称已用于自变量、数学常量或内置函数，请选择其他名称。')
      return
    }
    if (parameterNames.includes(normalized)) {
      setParameterError(`参数 ${normalized} 已存在。`)
      return
    }
    setParams((previous) => ({ ...previous, [normalized]: 1 }))
    setParameterName('')
    setParameterError('')
  }

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
              {curves.length > 1 && (
                <button
                  type="button"
                  aria-label={`删除曲线 ${index + 1}`}
                  onClick={() => setCurves((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                  className="shrink-0 text-[#898a81] transition-colors hover:text-[#e0a496]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={() =>
              setCurves((previous) => [
                ...previous,
                { expr: '', color: COLORS[previous.length % COLORS.length], enabled: true },
              ])
            }
            className="inline-flex items-center gap-1.5 text-xs text-[#c7b487] transition-colors hover:text-[#eee8d9]"
          >
            <Plus className="h-3.5 w-3.5" />添加一条曲线
          </button>
          {parsed.map(({ error }, index) =>
            error && curves[index].enabled ? (
              <p key={index} role="alert" className="text-xs leading-5 text-[#d29686]">
                曲线 {index + 1}：{error}
              </p>
            ) : null,
          )}
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d8e83]">实时参数</p>
              <span className="font-mono text-[11px] text-[#85867d]">−∞ &lt; 参数 &lt; +∞</span>
            </div>
            {parameterNames.map((name) => (
              <UnboundedParameterControl
                key={name}
                name={name}
                value={effectiveParams[name]}
                detected={detectedParameters.has(name)}
                onChange={(value) => setParams((previous) => ({ ...previous, [name]: value }))}
                onRemove={() =>
                  setParams((previous) => {
                    const updated = { ...previous }
                    delete updated[name]
                    return updated
                  })
                }
              />
            ))}
            <div className="flex items-center gap-2">
              <Input
                aria-label="新参数名称"
                value={parameterName}
                onChange={(event) => {
                  setParameterName(event.target.value)
                  setParameterError('')
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  addParameter()
                }}
                placeholder="如 amplitude、k_1"
                className="h-9 min-w-0 border-white/[0.09] bg-transparent font-mono text-xs"
              />
              <button
                type="button"
                onClick={addParameter}
                aria-label="添加自定义参数"
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-white/[0.09] px-2.5 text-xs text-[#d8c597] transition-colors hover:border-[#c7ad70]/45"
              >
                <Plus className="h-3.5 w-3.5" />添加
              </button>
            </div>
            {parameterError && <p role="alert" className="text-xs leading-5 text-[#d29686]">{parameterError}</p>}
            <p className="text-xs leading-6 text-[#85867d]">
              表达式中的新变量会自动识别；数字框不设上下界，滑块会按当前数值自动扩大。
            </p>
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
              setParams((previous) => ({ ...previous, ...preset.params }))
            }}
            className="rounded-full bg-white/[0.045] px-3 py-1.5 text-xs text-[#c0bcae] transition-colors hover:bg-[#c7ad70]/12 hover:text-[#e9d8b0]"
          >
            {preset.name}
          </button>
        ))}
      </div>
      <p className="mt-4 max-w-3xl text-xs leading-6 text-[#85867d]">
        支持 +、−、*、/、^、括号、sin、cos、tan、exp、ln、log、sqrt、abs、min、max，常量 pi、e，变量 x，以及任意数量的自定义实数参数；也支持 2x、2sin(x) 等隐式乘法。
      </p>
    </>
  )
}

interface UnboundedParameterControlProps {
  name: string
  value: number
  detected: boolean
  onChange: (value: number) => void
  onRemove: () => void
}

function UnboundedParameterControl({
  name,
  value,
  detected,
  onChange,
  onRemove,
}: UnboundedParameterControlProps) {
  const magnitude = Math.max(5, Math.abs(value))
  const power = 10 ** Math.min(300, Math.floor(Math.log10(magnitude)))
  const extent = Math.max(5, Math.min(Number.MAX_VALUE, Math.max(2 * power, Math.abs(value) * 1.25)))

  return (
    <label className="block space-y-2.5">
      <span className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate text-[#c9c5b9]">参数 {name}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <input
            aria-label={`参数 ${name}数值`}
            type="number"
            step="any"
            value={String(value)}
            onChange={(event) => {
              if (!event.target.value.trim()) return
              const next = Number(event.target.value)
              if (Number.isFinite(next)) onChange(next)
            }}
            onDoubleClick={() => onChange(0)}
            className="h-7 w-[94px] rounded border border-white/[0.08] bg-transparent px-1.5 text-right font-mono text-xs text-[#e2cf9e] outline-none focus:border-[#c7ad70]/55"
          />
          {!detected && (
            <button
              type="button"
              aria-label={`删除参数 ${name}`}
              onClick={onRemove}
              className="text-[#898a81] transition-colors hover:text-[#e0a496]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </span>
      <input
        aria-label={`参数 ${name}`}
        type="range"
        min={-extent}
        max={extent}
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(0)}
        className="h-1 w-full cursor-pointer accent-[#c7ad70]"
      />
    </label>
  )
}

function encodeParameterName(name: string) {
  return `mfparam${Array.from(name, (character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('')}`
}

function encodeExpressionParameters(expression: string) {
  return expression.replace(/[a-zA-Z][a-zA-Z0-9_]*/g, (identifier) => {
    const normalized = identifier.toLowerCase()
    return RESERVED_IDENTIFIERS.has(normalized) ? normalized : encodeParameterName(normalized)
  })
}

function niceStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  if (normalized < 1.5) return magnitude
  if (normalized < 3.5) return 2 * magnitude
  if (normalized < 7.5) return 5 * magnitude
  return 10 * magnitude
}
