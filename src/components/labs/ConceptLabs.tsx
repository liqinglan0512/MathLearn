import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import type { LabId } from '@/lib/labs'
import { LabCanvas } from '@/components/labs/LabCanvas'
import {
  LAB_COLORS,
  drawArrow,
  drawGrid,
  drawPoint,
  formatNumber,
  plotCurve,
} from '@/components/labs/canvasDrawing'
import type { LabDraw } from '@/components/labs/canvasDrawing'

const selectClassName =
  'h-10 w-full rounded-md border border-white/[0.09] bg-[#171813] px-3 text-sm text-[#e7e2d4] outline-none transition-colors focus:border-[#c7ad70]/55'

type ElementaryFunctionId = 'exp' | 'log' | 'sin' | 'square'

const ELEMENTARY_FUNCTIONS: Record<
  ElementaryFunctionId,
  {
    label: string
    expression: string
    fn: (value: number) => number
    derivative: (value: number) => number
    primitive: (value: number) => number
  }
> = {
  exp: {
    label: 'f(x) = eˣ',
    expression: 'eˣ',
    fn: Math.exp,
    derivative: Math.exp,
    primitive: Math.exp,
  },
  log: {
    label: 'f(x) = ln x',
    expression: 'ln x',
    fn: Math.log,
    derivative: (value) => 1 / value,
    primitive: (value) => value * Math.log(value) - value,
  },
  sin: {
    label: 'f(x) = sin x',
    expression: 'sin x',
    fn: Math.sin,
    derivative: Math.cos,
    primitive: (value) => -Math.cos(value),
  },
  square: {
    label: 'f(x) = x²',
    expression: 'x²',
    fn: (value) => value ** 2,
    derivative: (value) => 2 * value,
    primitive: (value) => value ** 3 / 3,
  },
}

export function ConceptLab({ id }: { id: Exclude<LabId, 'plotter'> }) {
  switch (id) {
    case 'derivative':
      return <DerivativeLab />
    case 'integral':
      return <IntegralLab />
    case 'linear':
      return <LinearLab />
    case 'taylor':
      return <TaylorLab />
    case 'probability':
      return <ProbabilityLab />
    case 'ode':
      return <DirectionFieldLab />
  }
}

function DerivativeLab() {
  const [functionId, setFunctionId] = useState<ElementaryFunctionId>('sin')
  const [position, setPosition] = useState(0.8)
  const [increment, setIncrement] = useState(1.5)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setIncrement((value) => {
        if (value <= 0.024) {
          setPlaying(false)
          return 0.02
        }
        return Math.max(0.02, value * 0.85)
      })
    }, 180)
    return () => window.clearInterval(timer)
  }, [playing])

  const selected = ELEMENTARY_FUNCTIONS[functionId]
  const { fn } = selected
  const secant = (fn(position + increment) - fn(position)) / increment
  const tangent = selected.derivative(position)
  const yMax = Math.max(
    functionId === 'sin' ? 2.1 : functionId === 'log' ? 3.2 : 5.2,
    fn(position) * 1.18,
    fn(position + increment) * 1.18,
  )

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport)
    plotCurve(context, viewport, fn, LAB_COLORS.ivory, {
      lineWidth: 2.35,
      domain: functionId === 'log' ? [0.035, viewport.xMax] : undefined,
    })
    plotCurve(
      context,
      viewport,
      (value) => fn(position) + tangent * (value - position),
      LAB_COLORS.sage,
      { dashed: true, lineWidth: 1.7 },
    )
    plotCurve(
      context,
      viewport,
      (value) => fn(position) + secant * (value - position),
      LAB_COLORS.gold,
      { lineWidth: 1.9 },
    )

    context.strokeStyle = 'rgba(209, 183, 125, 0.46)'
    context.setLineDash([4, 5])
    context.beginPath()
    context.moveTo(viewport.x(position), viewport.y(fn(position)))
    context.lineTo(viewport.x(position + increment), viewport.y(fn(position)))
    context.lineTo(viewport.x(position + increment), viewport.y(fn(position + increment)))
    context.stroke()
    context.setLineDash([])

    drawPoint(context, viewport, position, fn(position), LAB_COLORS.ivory, 5)
    drawPoint(context, viewport, position + increment, fn(position + increment), LAB_COLORS.gold, 5)

    context.fillStyle = LAB_COLORS.gold
    context.font = '12px ui-monospace, SFMono-Regular, monospace'
    context.textAlign = 'center'
    context.fillText('h', viewport.x(position + increment / 2), viewport.y(fn(position)) + 18)
  }

  return (
    <ExperimentLayout
      canvas={
        <LabCanvas
          label="导数实验：函数曲线、割线与切线"
          draw={draw}
          xRange={functionId === 'log' ? [-0.7, 4.7] : [-3.5, 4.7]}
          yRange={[functionId === 'log' ? -3.4 : functionId === 'sin' ? -2.1 : -1.5, yMax]}
        />
      }
      legend={[
        [LAB_COLORS.ivory, '原函数'],
        [LAB_COLORS.gold, '割线'],
        [LAB_COLORS.sage, '切线'],
      ]}
      formula={String.raw`$$\frac{f(x_0+h)-f(x_0)}{h}\xrightarrow[h\to0]{}f'(x_0).$$`}
      observation="导数不是凭空出现的一条切线，而是两点平均变化率在同一点附近的极限。"
    >
      <ControlHeading label="实验参数" />
      <label className="block space-y-2 text-sm text-[#c9c5b9]">
        <span>选择函数</span>
        <select
          aria-label="导数实验函数"
          value={functionId}
          onChange={(event) => {
            const next = event.target.value as ElementaryFunctionId
            setFunctionId(next)
            if (next === 'log' && position <= 0) setPosition(0.8)
          }}
          className={selectClassName}
        >
          {(Object.entries(ELEMENTARY_FUNCTIONS) as [ElementaryFunctionId, (typeof ELEMENTARY_FUNCTIONS)[ElementaryFunctionId]][]).map(
            ([id, entry]) => <option key={id} value={id}>{entry.label}</option>,
          )}
        </select>
      </label>
      <ParameterControl label="观察点 x₀" value={position} min={functionId === 'log' ? 0.1 : -2} max={2} step={0.05} onChange={setPosition} reset={0.8} />
      <ParameterControl label="增量 h" value={increment} min={0.02} max={2.6} step={0.01} onChange={setIncrement} reset={1.5} />
      <button
        type="button"
        aria-label={playing ? '暂停割线趋近切线' : '播放割线趋近切线'}
        onClick={() => {
          if (!playing && increment <= 0.025) setIncrement(1.5)
          setPlaying((value) => !value)
        }}
        className="inline-flex items-center gap-2 text-sm text-[#d4bd88] transition-colors hover:text-[#efe4cb]"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? '暂停逼近' : '自动让 h → 0'}
      </button>
      <Readout label="当前函数" value={selected.expression} />
      <Readout label="割线斜率" value={formatNumber(secant, 5)} />
      <Readout label="切线斜率 f′(x₀)" value={formatNumber(tangent, 5)} />
      <Readout label="斜率误差" value={formatNumber(Math.abs(secant - tangent), 6)} accent />
      {functionId === 'log' && (
        <p className="text-xs leading-6 text-[#85867d]">ln x 只在 x &gt; 0 上有定义，因此观察点与割线端点均保持在正半轴。</p>
      )}
    </ExperimentLayout>
  )
}

function IntegralLab() {
  const [count, setCount] = useState(8)
  const [lower, setLower] = useState(0)
  const [upper, setUpper] = useState(3.2)
  const [sampling, setSampling] = useState<'left' | 'midpoint' | 'right'>('midpoint')
  const [functionId, setFunctionId] = useState<ElementaryFunctionId>('square')

  const selected = ELEMENTARY_FUNCTIONS[functionId]
  const { fn } = selected
  const exact = selected.primitive(upper) - selected.primitive(lower)
  const width = (upper - lower) / count
  const offset = sampling === 'left' ? 0 : sampling === 'right' ? 1 : 0.5
  const approximation = Array.from({ length: count }, (_, index) => fn(lower + (index + offset) * width) * width).reduce(
    (sum, area) => sum + area,
    0,
  )
  const sampledHeights = Array.from({ length: 81 }, (_, index) => fn(lower + ((upper - lower) * index) / 80))
  const yMax = Math.max(2, ...sampledHeights) * 1.16
  const yMin = Math.min(-0.75, ...sampledHeights) * 1.18

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport)

    for (let index = 0; index < count; index++) {
      const left = lower + index * width
      const sample = lower + (index + offset) * width
      const height = fn(sample)
      const px = viewport.x(left)
      const rectangleWidth = viewport.x(left + width) - px
      const py = viewport.y(height)
      context.fillStyle = 'rgba(209, 183, 125, 0.16)'
      context.fillRect(px, py, rectangleWidth, viewport.y(0) - py)
      context.strokeStyle = 'rgba(209, 183, 125, 0.52)'
      context.lineWidth = Math.min(1, Math.max(0.45, rectangleWidth / 18))
      context.strokeRect(px, py, rectangleWidth, viewport.y(0) - py)
      if (count <= 24) drawPoint(context, viewport, sample, height, LAB_COLORS.gold, 3.2)
    }

    plotCurve(context, viewport, fn, LAB_COLORS.ivory, {
      lineWidth: 2.3,
      domain: functionId === 'log' ? [0.035, viewport.xMax] : undefined,
    })
    drawPoint(context, viewport, lower, 0, LAB_COLORS.sage, 4)
    drawPoint(context, viewport, upper, 0, LAB_COLORS.sage, 4)
  }

  return (
    <ExperimentLayout
      canvas={<LabCanvas label="积分实验：带符号的黎曼矩形与精确积分" draw={draw} xRange={[Math.min(-0.7, lower - 0.65), 5]} yRange={[yMin, yMax]} />}
      legend={[
        [LAB_COLORS.ivory, '函数曲线'],
        [LAB_COLORS.gold, '取样矩形'],
        [LAB_COLORS.sage, '积分上下界'],
      ]}
      formula={String.raw`$$\sum_{i=1}^{n} f(\xi_i)\,\Delta x\xrightarrow[n\to\infty]{}\int_a^b f(x)\,dx.$$`}
      observation="定积分由带符号的小矩形累加得到：曲线在横轴上方贡献正面积，在横轴下方贡献负面积。"
    >
      <ControlHeading label="实验参数" />
      <label className="block space-y-2 text-sm text-[#c9c5b9]">
        <span>被积函数</span>
        <select
          aria-label="积分实验函数"
          value={functionId}
          onChange={(event) => {
            const next = event.target.value as ElementaryFunctionId
            setFunctionId(next)
            if (next === 'log' && lower <= 0) setLower(0.2)
            else if (functionId === 'log' && next !== 'log') setLower(0)
          }}
          className={selectClassName}
        >
          {(Object.entries(ELEMENTARY_FUNCTIONS) as [ElementaryFunctionId, (typeof ELEMENTARY_FUNCTIONS)[ElementaryFunctionId]][]).map(
            ([id, entry]) => <option key={id} value={id}>{entry.label}</option>,
          )}
        </select>
      </label>
      <ParameterControl label="分割数 n" value={count} min={1} max={80} step={1} onChange={(value) => setCount(Math.round(value))} reset={8} />
      <ParameterControl label="积分下界 a" value={lower} min={functionId === 'log' ? 0.05 : -2} max={upper - 0.1} step={0.05} onChange={setLower} reset={functionId === 'log' ? 0.2 : 0} />
      <ParameterControl label="积分上界 b" value={upper} min={Math.max(0.15, lower + 0.1)} max={4.5} step={0.05} onChange={setUpper} reset={3.2} />
      <fieldset className="space-y-2">
        <legend className="text-sm text-[#c9c5b9]">取样位置</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['left', '左端'],
            ['midpoint', '中点'],
            ['right', '右端'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sampling === value}
              onClick={() => setSampling(value)}
              className={`rounded-md py-2 text-xs transition-colors ${
                sampling === value ? 'bg-[#c7ad70]/15 text-[#e2cb96]' : 'bg-white/[0.035] text-[#96978e] hover:text-[#ded9cc]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <Readout label="黎曼和" value={formatNumber(approximation, 6)} />
      <Readout label="精确积分" value={formatNumber(exact, 6)} />
      <Readout label="近似误差" value={formatNumber(Math.abs(approximation - exact), 7)} accent />
      {functionId === 'log' && (
        <p className="text-xs leading-6 text-[#85867d]">为避免端点取样落在 ln x 的定义域之外，积分下界始终大于 0。</p>
      )}
    </ExperimentLayout>
  )
}

function LinearLab() {
  const [matrix, setMatrix] = useState({ a: 1.25, b: 0.7, c: 0.25, d: 0.9 })
  const [coordinates, setCoordinates] = useState<'cartesian' | 'polar'>('cartesian')
  const [angle, setAngle] = useState(Math.PI / 4)
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  const trace = matrix.a + matrix.d
  const discriminant = trace ** 2 - 4 * determinant
  const eigenvalues = discriminant >= 0 ? [(trace + Math.sqrt(discriminant)) / 2, (trace - Math.sqrt(discriminant)) / 2] : []
  const transform = (pointX: number, pointY: number): [number, number] => [
    matrix.a * pointX + matrix.b * pointY,
    matrix.c * pointX + matrix.d * pointY,
  ]
  const unitVector: [number, number] = [Math.cos(angle), Math.sin(angle)]
  const mappedUnitVector = transform(...unitVector)
  const transformedRadius = Math.hypot(...mappedUnitVector)
  const transformedAngle = Math.atan2(mappedUnitVector[1], mappedUnitVector[0])

  function eigenvector(value: number): [number, number] {
    if (Math.abs(matrix.b) > 0.001) return normalize([matrix.b, value - matrix.a])
    if (Math.abs(matrix.c) > 0.001) return normalize([value - matrix.d, matrix.c])
    return Math.abs(value - matrix.a) < 0.001 ? [1, 0] : [0, 1]
  }

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport, { step: 1 })

    if (coordinates === 'cartesian') {
      context.strokeStyle = 'rgba(136, 170, 160, 0.33)'
      context.lineWidth = 1

      for (let line = -4; line <= 4; line++) {
        const [horizontalStartX, horizontalStartY] = transform(-4, line)
        const [horizontalEndX, horizontalEndY] = transform(4, line)
        const [verticalStartX, verticalStartY] = transform(line, -4)
        const [verticalEndX, verticalEndY] = transform(line, 4)
        context.beginPath()
        context.moveTo(viewport.x(horizontalStartX), viewport.y(horizontalStartY))
        context.lineTo(viewport.x(horizontalEndX), viewport.y(horizontalEndY))
        context.moveTo(viewport.x(verticalStartX), viewport.y(verticalStartY))
        context.lineTo(viewport.x(verticalEndX), viewport.y(verticalEndY))
        context.stroke()
      }

      context.save()
      context.setLineDash([5, 5])
      context.strokeStyle = 'rgba(238, 232, 217, 0.5)'
      context.strokeRect(viewport.x(0), viewport.y(1), viewport.x(1) - viewport.x(0), viewport.y(0) - viewport.y(1))
      context.restore()

      const corners = [transform(0, 0), transform(1, 0), transform(1, 1), transform(0, 1)]
      context.fillStyle = LAB_COLORS.goldSoft
      context.strokeStyle = LAB_COLORS.gold
      context.lineWidth = 1.75
      context.beginPath()
      corners.forEach(([pointX, pointY], index) => {
        if (index === 0) context.moveTo(viewport.x(pointX), viewport.y(pointY))
        else context.lineTo(viewport.x(pointX), viewport.y(pointY))
      })
      context.closePath()
      context.fill()
      context.stroke()
    } else {
      const tracePolarCurve = (radius: number, mapped: boolean) => {
        context.beginPath()
        for (let index = 0; index <= 240; index++) {
          const theta = (Math.PI * 2 * index) / 240
          const sourceX = radius * Math.cos(theta)
          const sourceY = radius * Math.sin(theta)
          const [pointX, pointY] = mapped ? transform(sourceX, sourceY) : [sourceX, sourceY]
          if (index === 0) context.moveTo(viewport.x(pointX), viewport.y(pointY))
          else context.lineTo(viewport.x(pointX), viewport.y(pointY))
        }
        context.closePath()
      }

      context.save()
      context.setLineDash([4, 5])
      context.strokeStyle = 'rgba(238, 232, 217, 0.38)'
      context.lineWidth = 1.25
      tracePolarCurve(1, false)
      context.stroke()
      context.restore()

      context.strokeStyle = 'rgba(136, 170, 160, 0.34)'
      context.lineWidth = 1
      for (const radius of [0.5, 1.5, 2, 2.5]) {
        tracePolarCurve(radius, true)
        context.stroke()
      }

      for (let index = 0; index < 16; index++) {
        const theta = (Math.PI * 2 * index) / 16
        const [endX, endY] = transform(2.7 * Math.cos(theta), 2.7 * Math.sin(theta))
        context.beginPath()
        context.moveTo(viewport.x(0), viewport.y(0))
        context.lineTo(viewport.x(endX), viewport.y(endY))
        context.stroke()
      }

      context.strokeStyle = LAB_COLORS.gold
      context.lineWidth = 2.15
      tracePolarCurve(1, true)
      context.stroke()

      drawArrow(
        context,
        viewport.x(0),
        viewport.y(0),
        viewport.x(unitVector[0]),
        viewport.y(unitVector[1]),
        'rgba(238, 232, 217, 0.82)',
        1.75,
      )
      drawArrow(
        context,
        viewport.x(0),
        viewport.y(0),
        viewport.x(mappedUnitVector[0]),
        viewport.y(mappedUnitVector[1]),
        LAB_COLORS.gold,
        2.45,
      )
      drawPoint(context, viewport, mappedUnitVector[0], mappedUnitVector[1], LAB_COLORS.gold, 4.4)
    }

    const uniqueEigenvalues = eigenvalues.filter((value, index) => index === 0 || Math.abs(value - eigenvalues[0]) > 0.01)
    for (const value of uniqueEigenvalues) {
      const [directionX, directionY] = eigenvector(value)
      context.save()
      context.strokeStyle = 'rgba(201, 144, 127, 0.66)'
      context.lineWidth = 1.35
      context.setLineDash([7, 6])
      context.beginPath()
      context.moveTo(viewport.x(-4 * directionX), viewport.y(-4 * directionY))
      context.lineTo(viewport.x(4 * directionX), viewport.y(4 * directionY))
      context.stroke()
      context.restore()
    }

    if (coordinates === 'cartesian') {
      const originX = viewport.x(0)
      const originY = viewport.y(0)
      drawArrow(context, originX, originY, viewport.x(matrix.a), viewport.y(matrix.c), LAB_COLORS.ivory, 2.1)
      drawArrow(context, originX, originY, viewport.x(matrix.b), viewport.y(matrix.d), LAB_COLORS.sage, 2.1)
    }
  }

  const orientation = Math.abs(determinant) < 0.001 ? '降维：面积压缩为 0' : determinant < 0 ? '翻转方向' : '保持方向'

  return (
    <ExperimentLayout
      canvas={<LabCanvas label={coordinates === 'polar' ? '线性变换实验：极坐标单位圆及其椭圆像' : '线性变换实验：矩阵作用下的平面网格与面积'} draw={draw} xRange={[-4, 4]} yRange={[-3.2, 3.2]} />}
      legend={coordinates === 'polar'
        ? [
            [LAB_COLORS.ivory, '原始极坐标单位圆'],
            [LAB_COLORS.gold, '单位圆在线性变换下的像'],
            [LAB_COLORS.sage, '变换后的极坐标网格'],
          ]
        : [
            [LAB_COLORS.gold, '变换后的单位正方形'],
            [LAB_COLORS.sage, '变换后的网格'],
            [LAB_COLORS.clay, '实特征方向'],
          ]}
      formula={coordinates === 'polar'
        ? String.raw`$$\mathbf u(\theta)=\begin{pmatrix}\cos\theta\\\sin\theta\end{pmatrix},\qquad A\mathbf u(\theta)=\begin{pmatrix}a\cos\theta+b\sin\theta\\c\cos\theta+d\sin\theta\end{pmatrix}.$$`
        : String.raw`$$A\mathbf x=\begin{pmatrix}a&b\\c&d\end{pmatrix}\mathbf x,\qquad\det A=ad-bc.$$`}
      observation={coordinates === 'polar'
        ? '极坐标中的每一个单位方向都可以写成 (cos θ, sin θ)。矩阵把单位圆送到一个椭圆；退化时，这个椭圆压扁成线段或一点。'
        : '矩阵不是四个孤立数字：它同时规定整张平面怎样伸缩、剪切、翻转或降维。'}
    >
      <ControlHeading label="矩阵元素" />
      <fieldset className="space-y-2">
        <legend className="text-sm text-[#c9c5b9]">坐标观察方式</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            ['cartesian', '直角坐标网格'],
            ['polar', '极坐标单位圆'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={coordinates === value}
              onClick={() => setCoordinates(value)}
              className={`rounded-md px-1 py-2 text-xs transition-colors ${
                coordinates === value ? 'bg-[#c7ad70]/15 text-[#e2cb96]' : 'bg-white/[0.035] text-[#96978e] hover:text-[#ded9cc]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div aria-label="当前矩阵" className="mx-auto grid w-fit grid-cols-2 gap-x-7 gap-y-2 border-x border-[#c7ad70]/40 px-5 py-1 font-mono text-base text-[#eee8d9]">
        <span>{formatNumber(matrix.a, 2)}</span>
        <span>{formatNumber(matrix.b, 2)}</span>
        <span>{formatNumber(matrix.c, 2)}</span>
        <span>{formatNumber(matrix.d, 2)}</span>
      </div>
      {(['a', 'b', 'c', 'd'] as const).map((key) => (
        <ParameterControl
          key={key}
          label={`矩阵元素 ${key}`}
          value={matrix[key]}
          min={-2}
          max={2}
          step={0.05}
          onChange={(value) => setMatrix((previous) => ({ ...previous, [key]: value }))}
          reset={key === 'a' ? 1 : key === 'd' ? 1 : 0}
        />
      ))}
      {coordinates === 'polar' && (
        <ParameterControl label="单位向量角度 θ" value={angle} min={0} max={Math.PI * 2} step={0.01} onChange={setAngle} reset={Math.PI / 4} />
      )}
      <button
        type="button"
        onClick={() => setMatrix({ a: 1, b: 0, c: 0, d: 1 })}
        className="inline-flex items-center gap-2 text-sm text-[#b5afa0] transition-colors hover:text-[#eee8d9]"
      >
        <RotateCcw className="h-3.5 w-3.5" />恢复单位矩阵
      </button>
      <Readout label="行列式 det A" value={formatNumber(determinant, 4)} accent />
      <Readout label="面积伸缩倍数" value={formatNumber(Math.abs(determinant), 4)} />
      {coordinates === 'polar' && (
        <>
          <Readout label="原始极角 θ" value={`${formatNumber((angle * 180) / Math.PI, 1)}°`} />
          <Readout label="变换后的半径 ρ" value={formatNumber(transformedRadius, 4)} />
          <Readout label="变换后的极角 φ" value={`${formatNumber((transformedAngle * 180) / Math.PI, 1)}°`} />
        </>
      )}
      <Readout label="平面方向" value={orientation} />
      <Readout
        label="实特征值"
        value={eigenvalues.length > 0 ? eigenvalues.map((value) => formatNumber(value, 3)).join('，') : '不存在实特征方向'}
      />
    </ExperimentLayout>
  )
}

function TaylorLab() {
  const [functionId, setFunctionId] = useState<'sin' | 'cos' | 'exp'>('sin')
  const [degree, setDegree] = useState(5)
  const [sample, setSample] = useState(1.8)

  const fn = (value: number) => (functionId === 'sin' ? Math.sin(value) : functionId === 'cos' ? Math.cos(value) : Math.exp(value))
  const polynomial = (value: number) => {
    let result = 0
    let factorial = 1

    for (let index = 0; index <= degree; index++) {
      if (index > 0) factorial *= index
      let derivativeAtZero = 1
      if (functionId === 'sin') derivativeAtZero = index % 2 === 0 ? 0 : index % 4 === 1 ? 1 : -1
      if (functionId === 'cos') derivativeAtZero = index % 2 === 1 ? 0 : index % 4 === 0 ? 1 : -1
      result += (derivativeAtZero * value ** index) / factorial
    }

    return result
  }

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport)
    plotCurve(context, viewport, fn, LAB_COLORS.ivory, { lineWidth: 2.25 })
    plotCurve(context, viewport, polynomial, LAB_COLORS.gold, { lineWidth: 2.1 })

    const actual = fn(sample)
    const approximate = polynomial(sample)
    context.strokeStyle = LAB_COLORS.clay
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(viewport.x(sample), viewport.y(actual))
    context.lineTo(viewport.x(sample), viewport.y(approximate))
    context.stroke()
    drawPoint(context, viewport, sample, actual, LAB_COLORS.ivory)
    drawPoint(context, viewport, sample, approximate, LAB_COLORS.gold)
  }

  return (
    <ExperimentLayout
      canvas={<LabCanvas label="泰勒实验：原函数与不同阶数多项式的逼近" draw={draw} xRange={[-5, 5]} yRange={[-3.1, 4.1]} />}
      legend={[
        [LAB_COLORS.ivory, '原函数'],
        [LAB_COLORS.gold, '泰勒多项式'],
        [LAB_COLORS.clay, '观察点误差'],
      ]}
      formula={String.raw`$$P_n(x)=\sum_{k=0}^{n}\frac{f^{(k)}(0)}{k!}x^k,\qquad R_n(x)=f(x)-P_n(x).$$`}
      observation="泰勒展开让局部导数信息逐阶进入多项式；展开点附近的贴合并不自动保证远处同样准确。"
    >
      <ControlHeading label="实验参数" />
      <label className="block space-y-2 text-sm text-[#c9c5b9]">
        <span>原函数</span>
        <select aria-label="泰勒展开函数" value={functionId} onChange={(event) => setFunctionId(event.target.value as typeof functionId)} className={selectClassName}>
          <option value="sin">f(x) = sin x</option>
          <option value="cos">f(x) = cos x</option>
          <option value="exp">f(x) = eˣ</option>
        </select>
      </label>
      <ParameterControl label="展开阶数 n" value={degree} min={0} max={11} step={1} onChange={(value) => setDegree(Math.round(value))} reset={5} />
      <ParameterControl label="误差观察点 x" value={sample} min={-4} max={4} step={0.05} onChange={setSample} reset={1.8} />
      <Readout label="原函数 f(x)" value={formatNumber(fn(sample), 6)} />
      <Readout label="多项式 Pₙ(x)" value={formatNumber(polynomial(sample), 6)} />
      <Readout label="绝对误差 |Rₙ(x)|" value={formatNumber(Math.abs(fn(sample) - polynomial(sample)), 8)} accent />
    </ExperimentLayout>
  )
}

function ProbabilityLab() {
  const [trials, setTrials] = useState(12)
  const [chance, setChance] = useState(0.42)
  const mean = trials * chance
  const deviation = Math.sqrt(trials * chance * (1 - chance))
  const masses = binomialMasses(trials, chance)
  const centralProbability = masses.reduce((result, mass, index) => {
    const standardized = (index - mean) / deviation
    return result + (Math.abs(standardized) <= 1 ? mass : 0)
  }, 0)

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport, { step: 1 })

    masses.forEach((mass, index) => {
      const standardized = (index - mean) / deviation
      const halfWidth = 0.5 / deviation
      const left = viewport.x(standardized - halfWidth)
      const right = viewport.x(standardized + halfWidth)
      const density = mass * deviation
      const top = viewport.y(density)

      context.fillStyle = 'rgba(209, 183, 125, 0.24)'
      context.fillRect(left + 0.7, top, Math.max(1, right - left - 1.4), viewport.y(0) - top)
      context.strokeStyle = 'rgba(209, 183, 125, 0.65)'
      context.lineWidth = 1
      context.strokeRect(left + 0.7, top, Math.max(1, right - left - 1.4), viewport.y(0) - top)
    })

    plotCurve(context, viewport, normalDensity, LAB_COLORS.ivory, { lineWidth: 2.2 })

    context.strokeStyle = 'rgba(136, 170, 160, 0.66)'
    context.setLineDash([4, 5])
    for (const bound of [-1, 1]) {
      context.beginPath()
      context.moveTo(viewport.x(bound), viewport.y(0))
      context.lineTo(viewport.x(bound), viewport.y(normalDensity(bound)))
      context.stroke()
    }
    context.setLineDash([])
  }

  return (
    <ExperimentLayout
      canvas={<LabCanvas label="中心极限定理实验：标准化二项分布与正态密度" draw={draw} xRange={[-4.3, 4.3]} yRange={[-0.055, 0.54]} />}
      legend={[
        [LAB_COLORS.gold, '标准化二项分布'],
        [LAB_COLORS.ivory, '标准正态密度'],
        [LAB_COLORS.sage, '一个标准差区间'],
      ]}
      formula={String.raw`$$Z_n=\frac{S_n-np}{\sqrt{np(1-p)}}\xrightarrow{\,d\,}\mathcal N(0,1).$$`}
      observation="这里展示的是独立同分布伯努利试验的标准化和；试验次数不足或概率过于偏斜时，正态近似仍可能明显失准。"
    >
      <ControlHeading label="伯努利试验" />
      <ParameterControl label="独立试验次数 n" value={trials} min={2} max={100} step={1} onChange={(value) => setTrials(Math.round(value))} reset={12} />
      <ParameterControl label="单次成功概率 p" value={chance} min={0.1} max={0.9} step={0.01} onChange={setChance} reset={0.42} />
      <Readout label="期望 np" value={formatNumber(mean, 3)} />
      <Readout label="标准差 √np(1−p)" value={formatNumber(deviation, 4)} />
      <Readout label="P(|Zₙ| ≤ 1)" value={formatNumber(centralProbability, 5)} accent />
      <Readout label="正态近似 P(|Z| ≤ 1)" value="0.68269" />
      <p className="pt-2 text-xs leading-6 text-[#85867d]">
        柱形高度按区间宽度归一化，因此可以与连续正态密度放在同一张图中比较。
      </p>
    </ExperimentLayout>
  )
}

type DifferentialEquationId =
  | 'growth'
  | 'decay'
  | 'logistic'
  | 'relaxation'
  | 'forced'
  | 'quadratic'
  | 'oscillator'

const DIFFERENTIAL_EQUATIONS: Record<
  DifferentialEquationId,
  { label: string; formula: string; explanation: string }
> = {
  growth: {
    label: '指数增长：y′ = ry',
    formula: String.raw`$$y'=ry,\qquad y(t)=y_0e^{rt}.$$`,
    explanation: '变化率始终与当前数量成正比；当 r > 0 时，零解是不稳定平衡点。',
  },
  decay: {
    label: '指数衰减：y′ = −ry',
    formula: String.raw`$$y'=-ry,\qquad y(t)=y_0e^{-rt}.$$`,
    explanation: '数量按与自身成正比的速度衰减；所有解都以指数速度趋向稳定平衡 y = 0。',
  },
  logistic: {
    label: 'Logistic 增长：y′ = ry(1−y/K)',
    formula: String.raw`$$y'=ry\left(1-\frac{y}{K}\right),\qquad y(t)=\frac{K}{1+(K/y_0-1)e^{-rt}}.$$`,
    explanation: '环境容量 K 抑制无限增长；正初值解趋向稳定平衡 y = K，而 y = 0 是不稳定平衡。',
  },
  relaxation: {
    label: '线性回复：y′ = r(K−y)',
    formula: String.raw`$$y'=r(K-y),\qquad y(t)=K+(y_0-K)e^{-rt}.$$`,
    explanation: '牛顿冷却与误差反馈都具有这种形式：系统以指数速度回到目标状态 K。',
  },
  forced: {
    label: '周期受迫：y′ + ry = sin(ωt)',
    formula: String.raw`$$y'+ry=\sin(\omega t),\qquad y_{\mathrm p}(t)=\frac{r\sin(\omega t)-\omega\cos(\omega t)}{r^2+\omega^2}.$$`,
    explanation: '周期外力使方向场随时间改变；初值差异指数衰减，但长期解保持受迫振荡。',
  },
  quadratic: {
    label: '二次衰减：y′ = −ry²',
    formula: String.raw`$$y'=-ry^2,\qquad y(t)=\frac{y_0}{1+ry_0t}\quad(y_0>0).$$`,
    explanation: '这是可分离变量方程；正初值解只按代数速度趋向 0，与指数衰减有本质差别。',
  },
  oscillator: {
    label: '二阶阻尼振子：y″ + 2ζωy′ + ω²y = 0',
    formula: String.raw`$$y''+2\zeta\omega y'+\omega^2y=0,\qquad \begin{cases}y'=v,\\v'=-\omega^2y-2\zeta\omega v.\end{cases}$$`,
    explanation: '二阶方程需要位置与速度共同决定未来；相平面中的轨道清楚区分欠阻尼、临界阻尼与过阻尼。',
  },
}

function DirectionFieldLab() {
  const [equationId, setEquationId] = useState<DifferentialEquationId>('logistic')
  const [growth, setGrowth] = useState(1)
  const [initial, setInitial] = useState(0.55)
  const [capacity, setCapacity] = useState(2)
  const [frequency, setFrequency] = useState(1)
  const [damping, setDamping] = useState(0.3)
  const [initialVelocity, setInitialVelocity] = useState(0.2)
  const selected = DIFFERENTIAL_EQUATIONS[equationId]
  const phasePortrait = equationId === 'oscillator'
  const positiveInitialOnly = equationId === 'logistic' || equationId === 'quadratic'

  const slope = (time: number, value: number) => {
    switch (equationId) {
      case 'growth': return growth * value
      case 'decay': return -growth * value
      case 'logistic': return growth * value * (1 - value / capacity)
      case 'relaxation': return growth * (capacity - value)
      case 'forced': return -growth * value + Math.sin(frequency * time)
      case 'quadratic': return -growth * value ** 2
      case 'oscillator': return 0
    }
  }

  const solution = (time: number, initialValue: number) => {
    switch (equationId) {
      case 'growth': return initialValue * Math.exp(growth * time)
      case 'decay': return initialValue * Math.exp(-growth * time)
      case 'logistic':
        return capacity / (1 + (capacity / initialValue - 1) * Math.exp(-growth * time))
      case 'relaxation': return capacity + (initialValue - capacity) * Math.exp(-growth * time)
      case 'forced': {
        const denominator = growth ** 2 + frequency ** 2
        const particular = (growth * Math.sin(frequency * time) - frequency * Math.cos(frequency * time)) / denominator
        return particular + (initialValue + frequency / denominator) * Math.exp(-growth * time)
      }
      case 'quadratic': return initialValue / (1 + growth * initialValue * time)
      case 'oscillator': return oscillatorState(time, initialValue, initialVelocity, frequency, damping)[0]
    }
  }

  const draw: LabDraw = (context, viewport) => {
    drawGrid(context, viewport)

    if (phasePortrait) {
      for (let position = -3; position <= 3.001; position += 0.42) {
        for (let velocity = -3; velocity <= 3.001; velocity += 0.38) {
          const vectorX = velocity
          const vectorY = -(frequency ** 2) * position - 2 * damping * frequency * velocity
          const screenX = (vectorX * viewport.width) / (viewport.xMax - viewport.xMin)
          const screenY = (-vectorY * viewport.height) / (viewport.yMax - viewport.yMin)
          const length = Math.hypot(screenX, screenY)
          if (length < 0.001) continue
          const halfLength = 6.6
          const centerX = viewport.x(position)
          const centerY = viewport.y(velocity)
          context.strokeStyle = 'rgba(209, 183, 125, 0.34)'
          context.lineWidth = 1.05
          context.beginPath()
          context.moveTo(centerX - (screenX / length) * halfLength, centerY - (screenY / length) * halfLength)
          context.lineTo(centerX + (screenX / length) * halfLength, centerY + (screenY / length) * halfLength)
          context.stroke()
        }
      }

      const drawOrbit = (startPosition: number, startVelocity: number, color: string, lineWidth: number) => {
        context.strokeStyle = color
        context.lineWidth = lineWidth
        context.beginPath()
        for (let index = 0; index <= 320; index++) {
          const [position, velocity] = oscillatorState((index / 320) * 10, startPosition, startVelocity, frequency, damping)
          if (index === 0) context.moveTo(viewport.x(position), viewport.y(velocity))
          else context.lineTo(viewport.x(position), viewport.y(velocity))
        }
        context.stroke()
      }

      for (const [position, velocity] of [[2.5, 0], [-2.3, 0], [0, 2], [0.8, -1.9]] as const) {
        drawOrbit(position, velocity, 'rgba(238, 232, 217, 0.24)', 1.3)
      }
      drawOrbit(initial, initialVelocity, LAB_COLORS.gold, 2.4)
      drawPoint(context, viewport, 0, 0, LAB_COLORS.sage, 4)
      drawPoint(context, viewport, initial, initialVelocity, LAB_COLORS.gold, 5)
      return
    }

    const scaleRatio = ((viewport.height / (viewport.yMax - viewport.yMin)) / viewport.width) *
      (viewport.xMax - viewport.xMin)

    for (let time = 0; time <= 5.4; time += 0.42) {
      for (let height = -1.8; height <= 3.7; height += 0.34) {
        if (positiveInitialOnly && height < 0) continue
        const angle = Math.atan(slope(time, height) * scaleRatio)
        const halfLength = 7.1
        const centerX = viewport.x(time)
        const centerY = viewport.y(height)
        const dx = Math.cos(angle) * halfLength
        const dy = Math.sin(angle) * halfLength
        context.strokeStyle = 'rgba(209, 183, 125, 0.37)'
        context.lineWidth = 1.05
        context.beginPath()
        context.moveTo(centerX - dx, centerY + dy)
        context.lineTo(centerX + dx, centerY - dy)
        context.stroke()
      }
    }

    const equilibrium = equationId === 'logistic' || equationId === 'relaxation'
      ? capacity
      : equationId === 'decay' || equationId === 'quadratic' ? 0 : null
    if (equilibrium !== null) {
      plotCurve(context, viewport, () => equilibrium, LAB_COLORS.sage, { dashed: true, lineWidth: 1.5 })
    }

    const starts = positiveInitialOnly
      ? [0.23, 0.95, 1.55, 2.55, 3.15]
      : [-1.4, -0.55, 0.23, 0.95, 1.55, 2.55, 3.15]
    for (const start of starts) {
      plotCurve(context, viewport, (time) => solution(time, start), 'rgba(238, 232, 217, 0.24)', {
        lineWidth: 1.3,
        domain: [0, 5.5],
      })
    }

    plotCurve(context, viewport, (time) => solution(time, initial), LAB_COLORS.gold, {
      lineWidth: 2.4,
      domain: [0, 5.5],
    })
    drawPoint(context, viewport, 0, initial, LAB_COLORS.gold, 5)
  }

  const oscillatorAtThree = phasePortrait
    ? oscillatorState(3, initial, initialVelocity, frequency, damping)
    : null
  const equilibriumLabel = equationId === 'logistic' || equationId === 'relaxation'
    ? `y = ${formatNumber(capacity, 2)}`
    : equationId === 'growth'
      ? 'y = 0（不稳定）'
      : equationId === 'forced'
        ? '无时间不变平衡点'
        : 'y = 0'

  return (
    <ExperimentLayout
      canvas={<LabCanvas
        label={phasePortrait ? '二阶阻尼振子实验：位置与速度的相平面' : `常微分方程实验：${selected.label}的方向场与解轨道`}
        draw={draw}
        xRange={phasePortrait ? [-3.4, 3.4] : [-0.6, 5.7]}
        yRange={phasePortrait ? [-3.3, 3.3] : positiveInitialOnly ? [-0.45, 3.8] : [-2.05, 3.8]}
      />}
      legend={[
        [LAB_COLORS.gold, phasePortrait ? '指定初值的相轨道' : '选定初值轨道'],
        [LAB_COLORS.ivory, '其他初值轨道'],
        [LAB_COLORS.sage, phasePortrait ? '相平面平衡点' : '稳定平衡（存在时）'],
      ]}
      formula={selected.formula}
      observation={selected.explanation}
    >
      <ControlHeading label="方程与初值" />
      <label className="block space-y-2 text-sm text-[#c9c5b9]">
        <span>选择微分方程</span>
        <select
          aria-label="微分方程类型"
          value={equationId}
          onChange={(event) => {
            const next = event.target.value as DifferentialEquationId
            setEquationId(next)
            if ((next === 'logistic' || next === 'quadratic') && initial <= 0) setInitial(0.55)
          }}
          className={selectClassName}
        >
          {(Object.entries(DIFFERENTIAL_EQUATIONS) as [DifferentialEquationId, (typeof DIFFERENTIAL_EQUATIONS)[DifferentialEquationId]][]).map(
            ([id, equation]) => <option key={id} value={id}>{equation.label}</option>,
          )}
        </select>
      </label>
      {!phasePortrait && (
        <ParameterControl label="变化率 r" value={growth} min={0.2} max={2.2} step={0.05} onChange={setGrowth} reset={1} />
      )}
      {(equationId === 'logistic' || equationId === 'relaxation') && (
        <ParameterControl label="目标水平 K" value={capacity} min={0.5} max={3.3} step={0.05} onChange={setCapacity} reset={2} />
      )}
      {(equationId === 'forced' || phasePortrait) && (
        <ParameterControl label={phasePortrait ? '固有频率 ω' : '外力频率 ω'} value={frequency} min={0.35} max={2.5} step={0.05} onChange={setFrequency} reset={1} />
      )}
      {phasePortrait && (
        <ParameterControl label="阻尼比 ζ" value={damping} min={0} max={2} step={0.05} onChange={setDamping} reset={0.3} />
      )}
      <ParameterControl
        label={phasePortrait ? '初始位置 y₀' : '初始值 y₀'}
        value={initial}
        min={positiveInitialOnly ? 0.12 : -2.6}
        max={phasePortrait ? 2.8 : 3.4}
        step={0.02}
        onChange={setInitial}
        reset={0.55}
      />
      {phasePortrait && (
        <ParameterControl label="初始速度 v₀" value={initialVelocity} min={-2.8} max={2.8} step={0.05} onChange={setInitialVelocity} reset={0.2} />
      )}
      {phasePortrait && oscillatorAtThree ? (
        <>
          <Readout label="t = 3 时的位置" value={formatNumber(oscillatorAtThree[0], 5)} />
          <Readout label="t = 3 时的速度" value={formatNumber(oscillatorAtThree[1], 5)} />
          <Readout
            label="阻尼状态"
            value={damping < 1 ? '欠阻尼' : damping > 1 ? '过阻尼' : '临界阻尼'}
            accent
          />
          <Readout label="平衡点 (y, v)" value="(0, 0)" />
        </>
      ) : (
        <>
          <Readout label="初始斜率 y′(0)" value={formatNumber(slope(0, initial), 4)} />
          <Readout label="t = 3 时的解" value={formatNumber(solution(3, initial), 5)} />
          <Readout label="平衡与长期行为" value={equilibriumLabel} accent />
        </>
      )}
      <p className="pt-2 text-xs leading-6 text-[#85867d]">
        {phasePortrait
          ? '横轴表示位置 y，纵轴表示速度 v = y′；二阶方程因此转化为相平面中的一阶二维系统。'
          : equationId === 'forced'
            ? '方向场明确依赖时间 t，因此不能把周期受迫方程误认为具有固定平衡点的自治系统。'
            : '灰色轨道对应其他初值；金色轨道严格使用当前选定初值，便于比较解的稳定性。'}
      </p>
    </ExperimentLayout>
  )
}

function oscillatorState(
  time: number,
  initialPosition: number,
  initialVelocity: number,
  frequency: number,
  damping: number,
): [number, number] {
  if (Math.abs(damping - 1) < 0.0001) {
    const rate = Math.exp(-frequency * time)
    const slope = initialVelocity + frequency * initialPosition
    return [
      rate * (initialPosition + slope * time),
      rate * (initialVelocity - frequency * slope * time),
    ]
  }

  if (damping < 1) {
    const dampedFrequency = frequency * Math.sqrt(1 - damping ** 2)
    const envelope = Math.exp(-damping * frequency * time)
    const cosine = Math.cos(dampedFrequency * time)
    const sine = Math.sin(dampedFrequency * time)
    return [
      envelope * (initialPosition * cosine + ((initialVelocity + damping * frequency * initialPosition) / dampedFrequency) * sine),
      envelope * (initialVelocity * cosine - ((frequency ** 2 * initialPosition + damping * frequency * initialVelocity) / dampedFrequency) * sine),
    ]
  }

  const root = Math.sqrt(damping ** 2 - 1)
  const firstRate = -frequency * (damping - root)
  const secondRate = -frequency * (damping + root)
  const firstWeight = (initialVelocity - secondRate * initialPosition) / (firstRate - secondRate)
  const secondWeight = (firstRate * initialPosition - initialVelocity) / (firstRate - secondRate)
  const first = firstWeight * Math.exp(firstRate * time)
  const second = secondWeight * Math.exp(secondRate * time)
  return [first + second, firstRate * first + secondRate * second]
}

interface ExperimentLayoutProps {
  canvas: ReactNode
  children: ReactNode
  formula: string
  observation: string
  legend: readonly (readonly [color: string, label: string])[]
}

function ExperimentLayout({ canvas, children, formula, observation, legend }: ExperimentLayoutProps) {
  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(230px,280px)] lg:gap-9 xl:grid-cols-[minmax(0,1fr)_minmax(240px,285px)]">
        <section aria-label="交互式数学画布" className="min-w-0 overflow-hidden rounded-xl bg-[#12130f]/90 ring-1 ring-white/[0.045]">
          {canvas}
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.055] px-4 py-3.5 sm:px-5">
            {legend.map(([color, label]) => (
              <span key={label} className="inline-flex items-center gap-2 text-xs text-[#aaa89e]">
                <span className="h-[2px] w-4 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </section>
        <aside aria-label="实验控制面板" className="space-y-5 px-1 pt-0.5 sm:px-0 lg:pt-1">
          {children}
        </aside>
      </div>

      <section className="mt-11 max-w-3xl border-l border-[#c7ad70]/30 pl-5 sm:pl-7" aria-label="实验背后的数学原理">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#c7ad70]">背后的数学</p>
        <Markdown content={formula} className="mt-3 overflow-x-auto" />
        <p className="mt-3 text-sm leading-7 text-[#b2aea2] sm:text-[15px]">{observation}</p>
      </section>
    </>
  )
}

interface ParameterControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  reset: number
}

export function ParameterControl({ label, value, min, max, step, onChange, reset }: ParameterControlProps) {
  const decimalPlaces = step >= 1 ? 0 : Math.max(0, String(step).split('.')[1]?.length ?? 0)

  return (
    <label className="block space-y-2.5">
      <span className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[#c9c5b9]">{label}</span>
        <input
          aria-label={`${label}数值`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(decimalPlaces)}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
          }}
          onDoubleClick={() => onChange(reset)}
          className="h-7 w-[76px] rounded border border-white/[0.08] bg-transparent px-1.5 text-right font-mono text-xs text-[#e2cf9e] outline-none focus:border-[#c7ad70]/55"
        />
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(reset)}
        className="h-1 w-full cursor-pointer accent-[#c7ad70]"
      />
    </label>
  )
}

function ControlHeading({ label }: { label: string }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d8e83]">{label}</p>
}

function Readout({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[#aaa69b]">{label}</span>
      <output aria-label={label} className={`max-w-[58%] text-right font-mono text-xs leading-5 ${accent ? 'text-[#e2c996]' : 'text-[#ded9cd]'}`}>
        {value}
      </output>
    </div>
  )
}

function normalize([pointX, pointY]: [number, number]): [number, number] {
  const length = Math.hypot(pointX, pointY)
  return length < 0.0001 ? [1, 0] : [pointX / length, pointY / length]
}

function binomialMasses(count: number, probability: number) {
  const result = [Math.pow(1 - probability, count)]
  for (let index = 0; index < count; index++) {
    result.push((result[index] * (count - index) * probability) / ((index + 1) * (1 - probability)))
  }
  return result
}

function normalDensity(value: number) {
  return Math.exp(-(value ** 2) / 2) / Math.sqrt(2 * Math.PI)
}
