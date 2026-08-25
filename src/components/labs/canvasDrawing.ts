export const LAB_COLORS = {
  gold: '#d1b77d',
  goldSoft: 'rgba(209, 183, 125, 0.18)',
  ivory: '#eee8d9',
  sage: '#88aaa0',
  sageSoft: 'rgba(136, 170, 160, 0.16)',
  clay: '#c9907f',
  muted: '#868780',
  grid: 'rgba(231, 226, 211, 0.065)',
  axis: 'rgba(231, 226, 211, 0.25)',
} as const

export interface GraphViewport {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  x: (value: number) => number
  y: (value: number) => number
}

export type LabDraw = (context: CanvasRenderingContext2D, viewport: GraphViewport) => void

export function drawGrid(
  context: CanvasRenderingContext2D,
  viewport: GraphViewport,
  options: { step?: number; labels?: boolean; axes?: boolean } = {},
) {
  const { width, height, xMin, xMax, yMin, yMax, x, y } = viewport
  const step = options.step ?? niceStep((xMax - xMin) / 9)

  context.strokeStyle = LAB_COLORS.grid
  context.lineWidth = 1
  context.beginPath()

  for (let value = Math.ceil(xMin / step) * step; value <= xMax; value += step) {
    context.moveTo(x(value), 0)
    context.lineTo(x(value), height)
  }

  for (let value = Math.ceil(yMin / step) * step; value <= yMax; value += step) {
    context.moveTo(0, y(value))
    context.lineTo(width, y(value))
  }

  context.stroke()

  if (options.axes !== false) {
    context.strokeStyle = LAB_COLORS.axis
    context.beginPath()
    context.moveTo(x(0), 0)
    context.lineTo(x(0), height)
    context.moveTo(0, y(0))
    context.lineTo(width, y(0))
    context.stroke()
  }

  if (options.labels === false) return

  context.fillStyle = LAB_COLORS.muted
  context.font = '11px ui-monospace, SFMono-Regular, monospace'
  context.textAlign = 'center'
  const labelY = Math.min(height - 8, Math.max(15, y(0) + 16))

  for (let value = Math.ceil(xMin / step) * step; value <= xMax; value += step) {
    if (Math.abs(value) > step / 3 && x(value) > 14 && x(value) < width - 14) {
      context.fillText(formatNumber(value, 1), x(value), labelY)
    }
  }

  context.textAlign = 'right'
  const labelX = Math.max(24, Math.min(width - 8, x(0) - 7))

  for (let value = Math.ceil(yMin / step) * step; value <= yMax; value += step) {
    if (Math.abs(value) > step / 3 && y(value) > 14 && y(value) < height - 10) {
      context.fillText(formatNumber(value, 1), labelX, y(value) + 4)
    }
  }
}

export function plotCurve(
  context: CanvasRenderingContext2D,
  viewport: GraphViewport,
  fn: (value: number) => number,
  color: string = LAB_COLORS.ivory,
  options: { lineWidth?: number; dashed?: boolean; domain?: readonly [number, number] } = {},
) {
  const { width, height, x, y, xMin, xMax } = viewport
  const min = Math.max(xMin, options.domain?.[0] ?? xMin)
  const max = Math.min(xMax, options.domain?.[1] ?? xMax)
  const samples = Math.max(240, Math.round(width * 1.5))

  context.save()
  context.strokeStyle = color
  context.lineWidth = options.lineWidth ?? 2
  if (options.dashed) context.setLineDash([6, 6])
  context.beginPath()

  let previous = Number.NaN
  let started = false

  for (let index = 0; index <= samples; index++) {
    const input = min + ((max - min) * index) / samples
    const result = fn(input)
    const vertical = y(result)

    if (!Number.isFinite(vertical)) {
      started = false
      previous = Number.NaN
      continue
    }

    if (!started || (Number.isFinite(previous) && Math.abs(vertical - previous) > height * 1.5)) {
      context.moveTo(x(input), vertical)
    } else {
      context.lineTo(x(input), vertical)
    }

    previous = vertical
    started = true
  }

  context.stroke()
  context.restore()
}

export function drawPoint(
  context: CanvasRenderingContext2D,
  viewport: GraphViewport,
  pointX: number,
  pointY: number,
  color: string,
  radius = 4.5,
) {
  context.fillStyle = color
  context.beginPath()
  context.arc(viewport.x(pointX), viewport.y(pointY), radius, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(17, 18, 15, 0.95)'
  context.lineWidth = 2
  context.stroke()
}

export function drawArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth = 2,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const tip = Math.min(11, Math.hypot(toX - fromX, toY - fromY) / 3)

  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = lineWidth
  context.beginPath()
  context.moveTo(fromX, fromY)
  context.lineTo(toX, toY)
  context.stroke()

  context.beginPath()
  context.moveTo(toX, toY)
  context.lineTo(toX - tip * Math.cos(angle - Math.PI / 7), toY - tip * Math.sin(angle - Math.PI / 7))
  context.lineTo(toX - tip * Math.cos(angle + Math.PI / 7), toY - tip * Math.sin(angle + Math.PI / 7))
  context.closePath()
  context.fill()
}

export function formatNumber(value: number, digits = 3) {
  const rounded = Math.abs(value) < 10 ** (-digits) / 2 ? 0 : value
  return rounded.toFixed(digits).replace(/\.?0+$/, '')
}

function niceStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  if (normalized < 1.5) return magnitude
  if (normalized < 3.5) return 2 * magnitude
  if (normalized < 7.5) return 5 * magnitude
  return 10 * magnitude
}
