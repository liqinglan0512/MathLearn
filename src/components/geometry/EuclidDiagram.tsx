import { useId, useState, type PointerEvent } from 'react'
import { Compass, RotateCcw } from 'lucide-react'
import type { VisualizationTrustLevel } from '@/lib/content-model'
import type { EuclidVisualizationAttestation } from '@/lib/euclid-repository'
import {
  getEuclidRendererDescriptor,
  isCurrentEuclidRendererRevision,
  type EuclidRendererGeometry,
} from '@/lib/euclid-renderer-manifest'

export type EuclidDiagramGeometry = EuclidRendererGeometry
type GeometryKind = EuclidDiagramGeometry
export type EuclidTriangleVariant = 'equilateral-construction' | 'pythagorean-squares' | 'generic'
type Point = { x: number; y: number }
type Point3 = readonly [number, number, number]

interface DiagramPalette {
  primary: string
  accent: string
  quiet: string
  construction: string
  label: string
  fill: string
}

interface DiagramProps {
  title: string
  englishTitle?: string
  book: number
  proposition: number
  rendererId: string | null
  trustLevel: VisualizationTrustLevel
  attestation?: EuclidVisualizationAttestation | null
  paperMode?: boolean
}

export interface EuclidVisualizationPresentation {
  effectiveTrustLevel: Exclude<VisualizationTrustLevel, 'none'>
  label: string
  note: string
}

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2

const FAMILY_LABELS: Record<GeometryKind, string> = {
  triangle: '三角形与尺规构造',
  parallel: '平行线与内错角',
  circle: '圆、弦与切线',
  polygon: '圆内接多边形',
  area: '等积变换',
  ratio: '线段与比例',
  number: '整数与整除关系',
  irrational: '不可公度线段',
  solid: '空间立体结构',
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function coordinate(point: Point) {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
}

function angleBetween(origin: Point, first: Point, second: Point) {
  const ax = first.x - origin.x
  const ay = first.y - origin.y
  const bx = second.x - origin.x
  const by = second.y - origin.y
  const cosine = clamp((ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by)), -1, 1)
  return (Math.acos(cosine) * 180) / Math.PI
}

function Marker({ point, label, palette, dx = 8, dy = -10 }: {
  point: Point
  label: string
  palette: DiagramPalette
  dx?: number
  dy?: number
}) {
  return (
    <g>
      <circle cx={point.x} cy={point.y} r="4" fill={palette.primary} />
      <text x={point.x + dx} y={point.y + dy} fill={palette.label} fontSize="13" fontFamily="ui-monospace, monospace">
        {label}
      </text>
    </g>
  )
}

function Guide({ x1, y1, x2, y2, palette }: {
  x1: number
  y1: number
  x2: number
  y2: number
  palette: DiagramPalette
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={palette.construction} strokeDasharray="5 6" strokeWidth="1" />
}

// eslint-disable-next-line react-refresh/only-export-components -- Pure renderer branch contract is exercised without a browser.
export function resolveEuclidTriangleVariant(rendererId: string): EuclidTriangleVariant {
  if (rendererId === 'euclid-1-1') return 'equilateral-construction'
  if (rendererId === 'euclid-1-47') return 'pythagorean-squares'
  return 'generic'
}

function TriangleDiagram({ value, rendererId, palette }: {
  value: number
  rendererId: string
  palette: DiagramPalette
}) {
  const variant = resolveEuclidTriangleVariant(rendererId)
  if (variant === 'equilateral-construction') {
    const radius = 105 + value * 120
    const first = { x: 280 - radius / 2, y: 250 }
    const second = { x: 280 + radius / 2, y: 250 }
    const apex = { x: 280, y: 250 - (Math.sqrt(3) / 2) * radius }

    return (
      <g>
        <circle cx={first.x} cy={first.y} r={radius} fill="none" stroke={palette.construction} strokeWidth="1.1" />
        <circle cx={second.x} cy={second.y} r={radius} fill="none" stroke={palette.construction} strokeWidth="1.1" />
        <polygon points={[first, second, apex].map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2.1" />
        <Marker point={first} label="A" palette={palette} dx={-18} dy={17} />
        <Marker point={second} label="B" palette={palette} dx={9} dy={17} />
        <Marker point={apex} label="C" palette={palette} />
        <text x="280" y="321" fill={palette.label} fontSize="13" textAnchor="middle">AC = AB = BC</text>
      </g>
    )
  }

  if (variant === 'pythagorean-squares') {
    const horizontal = 130 + value * 80
    const vertical = 85 + value * 35
    const a = { x: 176, y: 194 }
    const b = { x: a.x + horizontal, y: a.y }
    const c = { x: a.x, y: a.y - vertical }
    const hypotenuseSquare = [b, c, { x: c.x + vertical, y: c.y - horizontal }, { x: b.x + vertical, y: b.y - horizontal }]

    return (
      <g transform="translate(35 80) scale(.78)">
        <polygon points={[a, b, c].map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2.2" />
        <rect x={a.x} y={a.y} width={horizontal} height={horizontal} fill="none" stroke={palette.accent} strokeWidth="1.5" />
        <rect x={a.x - vertical} y={a.y - vertical} width={vertical} height={vertical} fill="none" stroke={palette.accent} strokeWidth="1.5" />
        <polygon points={hypotenuseSquare.map(coordinate).join(' ')} fill="none" stroke={palette.quiet} strokeWidth="1.5" />
        <path d={`M ${a.x + 14} ${a.y} V ${a.y - 14} H ${a.x}`} fill="none" stroke={palette.label} />
        <Marker point={a} label="A" palette={palette} />
        <Marker point={b} label="B" palette={palette} />
        <Marker point={c} label="C" palette={palette} />
        <text x="240" y="382" fill={palette.label} fontSize="17" textAnchor="middle">a² + b² = c²</text>
      </g>
    )
  }

  const a = { x: 115, y: 264 }
  const b = { x: 432, y: 264 }
  const c = { x: 150 + value * 280, y: 76 + Math.abs(value - 0.5) * 55 }
  const angleA = angleBetween(a, b, c)
  const angleB = angleBetween(b, a, c)
  const angleC = 180 - angleA - angleB

  return (
    <g>
      <polygon points={[a, b, c].map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2" />
      <Guide x1={c.x} y1={c.y} x2={c.x} y2={a.y} palette={palette} />
      <path d={`M ${c.x - 10} ${a.y} v -10 h 10`} fill="none" stroke={palette.quiet} strokeWidth="1.1" />
      <Marker point={a} label="A" palette={palette} dx={-17} dy={16} />
      <Marker point={b} label="B" palette={palette} dx={8} dy={16} />
      <Marker point={c} label="C" palette={palette} />
      <text x="280" y="320" fill={palette.label} fontSize="13" textAnchor="middle">
        {`${angleA.toFixed(1)}° + ${angleB.toFixed(1)}° + ${angleC.toFixed(1)}° = 180°`}
      </text>
    </g>
  )
}

function ParallelDiagram({ value, palette }: { value: number; palette: DiagramPalette }) {
  const x = 200 + value * 170
  const topIntersection = { x, y: 121 }
  const lowerIntersection = { x: x - 72, y: 247 }
  const angle = (Math.atan2(126, 72) * 180) / Math.PI

  return (
    <g>
      <line x1="65" y1="121" x2="490" y2="121" stroke={palette.primary} strokeWidth="2" />
      <line x1="65" y1="247" x2="490" y2="247" stroke={palette.primary} strokeWidth="2" />
      <line x1={x + 45} y1="42" x2={x - 117} y2="326" stroke={palette.accent} strokeWidth="1.8" />
      <path d={`M ${x - 31} 121 A 31 31 0 0 0 ${x - 16} 148`} fill="none" stroke={palette.accent} strokeWidth="2.2" />
      <path d={`M ${x - 41} 247 A 31 31 0 0 0 ${x - 56} 220`} fill="none" stroke={palette.accent} strokeWidth="2.2" />
      <text x={x - 43} y="158" fill={palette.label} fontSize="16">α</text>
      <text x={x - 43} y="225" fill={palette.label} fontSize="16">α</text>
      <Marker point={topIntersection} label="A" palette={palette} />
      <Marker point={lowerIntersection} label="B" palette={palette} dx={-18} dy={19} />
      <text x="480" y="112" fill={palette.quiet} fontSize="12">l₁</text>
      <text x="480" y="238" fill={palette.quiet} fontSize="12">l₂</text>
      <text x="280" y="332" fill={palette.label} fontSize="13" textAnchor="middle">
        {`内错角 α = ${angle.toFixed(1)}°，因此 l₁ ∥ l₂`}
      </text>
    </g>
  )
}

function CircleDiagram({ value, palette, tangent }: { value: number; palette: DiagramPalette; tangent: boolean }) {
  const origin = { x: 280, y: 177 }
  const radius = 116
  const angle = 0.28 + value * 2.2
  const point = { x: origin.x + Math.cos(angle) * radius, y: origin.y - Math.sin(angle) * radius }
  const second = { x: origin.x + Math.cos(angle + 1.55) * radius, y: origin.y - Math.sin(angle + 1.55) * radius }
  const direction = { x: Math.sin(angle), y: Math.cos(angle) }

  return (
    <g>
      <circle cx={origin.x} cy={origin.y} r={radius} fill="none" stroke={palette.primary} strokeWidth="1.8" />
      <line x1={origin.x} y1={origin.y} x2={point.x} y2={point.y} stroke={palette.accent} strokeWidth="1.8" />
      {tangent ? (
        <line x1={point.x - direction.x * 126} y1={point.y - direction.y * 126} x2={point.x + direction.x * 126} y2={point.y + direction.y * 126} stroke={palette.quiet} strokeWidth="1.7" />
      ) : (
        <>
          <line x1={origin.x} y1={origin.y} x2={second.x} y2={second.y} stroke={palette.quiet} strokeWidth="1.4" />
          <line x1={point.x} y1={point.y} x2={second.x} y2={second.y} stroke={palette.accent} strokeWidth="1.8" />
          <Marker point={second} label="B" palette={palette} />
        </>
      )}
      <Marker point={origin} label="O" palette={palette} />
      <Marker point={point} label="A" palette={palette} />
      <text x="280" y="330" fill={palette.label} fontSize="13" textAnchor="middle">
        {tangent ? '切线在接触点与半径垂直' : 'OA = OB，弦与圆心角保持对应'}
      </text>
    </g>
  )
}

function PolygonDiagram({ value, proposition, palette }: { value: number; proposition: number; palette: DiagramPalette }) {
  const sides = proposition % 3 === 0 ? 6 : proposition % 2 === 0 ? 4 : 5
  const center = { x: 280, y: 178 }
  const radius = 119
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = (Math.PI * 2 * index) / sides - Math.PI / 2 + (value - 0.5) * 0.8
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
  })

  return (
    <g>
      <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke={palette.construction} strokeWidth="1.2" />
      <polygon points={points.map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2" />
      {points.map((point, index) => (
        <g key={index}>
          <Guide x1={center.x} y1={center.y} x2={point.x} y2={point.y} palette={palette} />
          <Marker point={point} label={String.fromCharCode(65 + index)} palette={palette} />
        </g>
      ))}
      <Marker point={center} label="O" palette={palette} />
      <text x="280" y="330" fill={palette.label} fontSize="13" textAnchor="middle">
        {`圆内接正 ${sides} 边形 · 每个圆心角 ${(360 / sides).toFixed(0)}°`}
      </text>
    </g>
  )
}

function AreaDiagram({ value, palette }: { value: number; palette: DiagramPalette }) {
  const shift = (value - 0.5) * 145
  const leftBottom = { x: 116, y: 249 }
  const rightBottom = { x: 391, y: 249 }
  const rightTop = { x: 391 + shift, y: 111 }
  const leftTop = { x: 116 + shift, y: 111 }

  return (
    <g>
      <polygon points={[leftBottom, rightBottom, rightTop, leftTop].map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2" />
      <line x1={leftBottom.x} y1={leftBottom.y} x2={rightTop.x} y2={rightTop.y} stroke={palette.accent} strokeWidth="1.7" />
      <Guide x1={leftTop.x} y1={leftTop.y} x2={leftTop.x} y2={leftBottom.y} palette={palette} />
      <path d={`M ${leftTop.x} ${leftBottom.y - 11} h 11 v 11`} fill="none" stroke={palette.quiet} />
      <Marker point={leftBottom} label="A" palette={palette} dx={-17} dy={18} />
      <Marker point={rightBottom} label="B" palette={palette} dx={8} dy={18} />
      <Marker point={rightTop} label="C" palette={palette} />
      <Marker point={leftTop} label="D" palette={palette} />
      <text x="280" y="320" fill={palette.label} fontSize="13" textAnchor="middle">
        S = 底 × 高；对角线把平行四边形分成等积三角形
      </text>
    </g>
  )
}

function RatioDiagram({ value, palette }: { value: number; palette: DiagramPalette }) {
  const unit = 92 + value * 75
  const first = { x: 109, y: 133 }
  const second = { x: 109 + unit, y: 133 }
  const third = { x: 109 + unit * 2, y: 133 }
  const lowerFirst = { x: 109, y: 231 }
  const lowerSecond = { x: 109 + unit * 0.7, y: 231 }
  const lowerThird = { x: 109 + unit * 1.4, y: 231 }

  return (
    <g>
      <line x1={first.x} y1={first.y} x2={third.x} y2={third.y} stroke={palette.primary} strokeWidth="2.4" />
      <line x1={lowerFirst.x} y1={lowerFirst.y} x2={lowerThird.x} y2={lowerThird.y} stroke={palette.accent} strokeWidth="2.4" />
      {[first, second, third].map((point, index) => <Marker key={`upper-${index}`} point={point} label={String.fromCharCode(65 + index)} palette={palette} />)}
      {[lowerFirst, lowerSecond, lowerThird].map((point, index) => <Marker key={`lower-${index}`} point={point} label={String.fromCharCode(68 + index)} palette={palette} />)}
      <text x="280" y="320" fill={palette.label} fontSize="13" textAnchor="middle">AB : BC = DE : EF</text>
    </g>
  )
}

function greatestCommonDivisor(left: number, right: number): number {
  let first = left
  let second = right
  while (second !== 0) {
    const remainder = first % second
    first = second
    second = remainder
  }
  return first
}

function NumberDiagram({ value, book, proposition, palette }: {
  value: number
  book: number
  proposition: number
  palette: DiagramPalette
}) {
  if (book === 9 && proposition === 20) {
    const selected = value > 0.65 ? [2, 3, 5, 7] : value > 0.35 ? [2, 3, 5] : [2, 3]
    const product = selected.reduce((result, prime) => result * prime, 1)
    return (
      <g>
        {selected.map((prime, index) => (
          <g key={prime}>
            <circle cx={145 + index * 88} cy="152" r="27" fill={palette.fill} stroke={palette.primary} />
            <text x={145 + index * 88} y="158" fill={palette.label} fontSize="18" textAnchor="middle">{prime}</text>
          </g>
        ))}
        <text x="280" y="248" fill={palette.accent} fontSize="21" textAnchor="middle">
          {`${selected.join(' × ')} + 1 = ${product + 1}`}
        </text>
        <text x="280" y="311" fill={palette.label} fontSize="12" textAnchor="middle">这个数不被列出的任何一个素数整除</text>
      </g>
    )
  }

  const first = 18 + Math.round(value * 14)
  const second = 12 + Math.round(value * 9)
  const divisor = greatestCommonDivisor(first, second)
  const scale = 335 / first

  return (
    <g>
      <rect x="105" y="115" width={first * scale} height="35" rx="3" fill={palette.fill} stroke={palette.primary} />
      <rect x="105" y="195" width={second * scale} height="35" rx="3" fill={palette.fill} stroke={palette.accent} />
      {Array.from({ length: Math.floor(first / divisor) + 1 }, (_, index) => (
        <line key={`first-${index}`} x1={105 + index * divisor * scale} x2={105 + index * divisor * scale} y1="115" y2="150" stroke={palette.construction} />
      ))}
      {Array.from({ length: Math.floor(second / divisor) + 1 }, (_, index) => (
        <line key={`second-${index}`} x1={105 + index * divisor * scale} x2={105 + index * divisor * scale} y1="195" y2="230" stroke={palette.construction} />
      ))}
      <text x="86" y="138" fill={palette.label} fontSize="13" textAnchor="end">{first}</text>
      <text x="86" y="218" fill={palette.label} fontSize="13" textAnchor="end">{second}</text>
      <text x="280" y="309" fill={palette.label} fontSize="14" textAnchor="middle">
        {`gcd(${first}, ${second}) = ${divisor}`}
      </text>
    </g>
  )
}

function IrrationalDiagram({ value, palette }: { value: number; palette: DiagramPalette }) {
  const side = 116 + value * 72
  const a = { x: 280 - side / 2, y: 247 }
  const b = { x: 280 + side / 2, y: 247 }
  const c = { x: 280 + side / 2, y: 247 - side }
  const d = { x: 280 - side / 2, y: 247 - side }

  return (
    <g>
      <polygon points={[a, b, c, d].map(coordinate).join(' ')} fill={palette.fill} stroke={palette.primary} strokeWidth="2" />
      <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={palette.accent} strokeWidth="2.2" />
      <Marker point={a} label="A" palette={palette} dx={-17} dy={17} />
      <Marker point={b} label="B" palette={palette} dx={8} dy={17} />
      <Marker point={c} label="C" palette={palette} />
      <Marker point={d} label="D" palette={palette} dx={-16} />
      <text x="280" y="319" fill={palette.label} fontSize="13" textAnchor="middle">AC / AB = √2，二者不可公度</text>
    </g>
  )
}

function verticesForSolid(text: string): Point3[] {
  if (/四面|tetrahed/i.test(text)) return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]
  if (/八面|octahed/i.test(text)) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  if (/二十面|icosahed/i.test(text)) {
    return [
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [0, first, second * GOLDEN_RATIO])),
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [first, second * GOLDEN_RATIO, 0])),
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [first * GOLDEN_RATIO, 0, second])),
    ]
  }
  if (/十二面|dodecahed/i.test(text)) {
    return [
      ...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z): Point3 => [x, y, z]))),
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [0, first / GOLDEN_RATIO, second * GOLDEN_RATIO])),
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [first / GOLDEN_RATIO, second * GOLDEN_RATIO, 0])),
      ...[-1, 1].flatMap((first) => [-1, 1].map((second): Point3 => [first * GOLDEN_RATIO, 0, second / GOLDEN_RATIO])),
    ]
  }
  return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z): Point3 => [x, y, z])))
}

function SolidDiagram({ value, title, englishTitle, palette }: {
  value: number
  title: string
  englishTitle: string
  palette: DiagramPalette
}) {
  const vertices = verticesForSolid(`${title} ${englishTitle}`)
  const squaredDistances = vertices.flatMap((first, left) =>
    vertices.slice(left + 1).map((second) => first.reduce((sum, current, index) => sum + (current - second[index]) ** 2, 0)),
  )
  const edgeLengthSquared = Math.min(...squaredDistances.filter((distance) => distance > 0.001))
  const rotation = value * Math.PI * 1.4
  const inclination = 0.48
  const projected = vertices.map(([x, y, z]) => {
    const rotatedX = x * Math.cos(rotation) + z * Math.sin(rotation)
    const rotatedZ = -x * Math.sin(rotation) + z * Math.cos(rotation)
    const rotatedY = y * Math.cos(inclination) - rotatedZ * Math.sin(inclination)
    const depth = y * Math.sin(inclination) + rotatedZ * Math.cos(inclination)
    const scale = 88 / (1 + depth * 0.11)
    return { x: 280 + rotatedX * scale, y: 179 - rotatedY * scale, depth }
  })
  const edges: { first: number; second: number; depth: number }[] = []

  vertices.forEach((first, left) => {
    vertices.slice(left + 1).forEach((second, offset) => {
      const right = left + 1 + offset
      const distance = first.reduce((sum, current, index) => sum + (current - second[index]) ** 2, 0)
      if (Math.abs(distance - edgeLengthSquared) < 0.001) {
        edges.push({ first: left, second: right, depth: (projected[left].depth + projected[right].depth) / 2 })
      }
    })
  })

  return (
    <g>
      {edges.sort((left, right) => left.depth - right.depth).map((edge) => (
        <line
          key={`${edge.first}-${edge.second}`}
          x1={projected[edge.first].x}
          y1={projected[edge.first].y}
          x2={projected[edge.second].x}
          y2={projected[edge.second].y}
          stroke={edge.depth < 0 ? palette.construction : palette.primary}
          strokeWidth={edge.depth < 0 ? 1.15 : 1.9}
          strokeDasharray={edge.depth < 0 ? '4 5' : undefined}
        />
      ))}
      {projected.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3.1" fill={point.depth > 0 ? palette.accent : palette.quiet} />)}
      <text x="280" y="328" fill={palette.label} fontSize="13" textAnchor="middle">
        {`${vertices.length} 个顶点 · ${edges.length} 条棱 · 拖动改变观察方向`}
      </text>
    </g>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Pure renderer contract is exercised without a browser.
export function resolveEuclidRendererGeometry(rendererId: string): GeometryKind | null {
  return getEuclidRendererDescriptor(rendererId)?.geometry ?? null
}

// eslint-disable-next-line react-refresh/only-export-components -- Trust validation must be testable independently of React rendering.
export function hasCompleteVisualizationAttestation(
  rendererId: string | null | undefined,
  attestation: EuclidVisualizationAttestation | null | undefined,
): attestation is EuclidVisualizationAttestation {
  const renderer = getEuclidRendererDescriptor(rendererId)
  return Boolean(renderer?.scope === 'proposition_specific'
    && attestation
    && attestation.reviewId.trim()
    && attestation.reviewerId.trim()
    && Number.isInteger(attestation.reviewedAt)
    && attestation.reviewedAt >= 0
    && attestation.rendererRevision.trim()
    && isCurrentEuclidRendererRevision(rendererId, attestation.rendererRevision)
    && /^[a-f0-9]{64}$/.test(attestation.contentHash))
}

// eslint-disable-next-line react-refresh/only-export-components -- Presentation downgrade is a pure trust contract.
export function resolveEuclidVisualizationPresentation(
  trustLevel: Exclude<VisualizationTrustLevel, 'none'>,
  rendererId: string | null | undefined,
  attestation?: EuclidVisualizationAttestation | null,
): EuclidVisualizationPresentation {
  if (trustLevel === 'verified' && hasCompleteVisualizationAttestation(rendererId, attestation)) {
    return {
      effectiveTrustLevel: 'verified',
      label: '已核验命题交互构造',
      note: `图形已由 ${attestation.reviewerId} 针对 renderer ${attestation.rendererRevision} 完成人工核验`,
    }
  }
  if (trustLevel === 'verified') {
    return {
      effectiveTrustLevel: 'proposition_specific',
      label: '命题交互图',
      note: '缺少完整人工核验凭据，已安全降级为尚未核验的命题图',
    }
  }
  if (trustLevel === 'proposition_specific') {
    return {
      effectiveTrustLevel: 'proposition_specific',
      label: '命题交互图',
      note: '按本命题单独实现，尚未完成人工图形核验',
    }
  }
  return {
    effectiveTrustLevel: 'concept_illustration',
    label: '相关概念示意',
    note: '用于观察相关结构，不等同于本命题的精确构造',
  }
}

export function EuclidDiagram({
  title,
  englishTitle = '',
  book,
  proposition,
  rendererId,
  trustLevel,
  attestation,
  paperMode = false,
}: DiagramProps) {
  const [value, setValue] = useState(0.5)
  const [dragging, setDragging] = useState(false)
  const accessibleId = useId()

  if (trustLevel === 'none' || !rendererId) return null

  const palette: DiagramPalette = paperMode
    ? { primary: '#877044', accent: '#a65e43', quiet: '#767563', construction: '#beb4a0', label: '#454338', fill: 'rgb(166 139 84 / 0.09)' }
    : { primary: '#d7bc80', accent: '#d68f73', quiet: '#a5a18e', construction: '#726d5d', label: '#ded9cc', fill: 'rgb(199 173 112 / 0.095)' }
  const geometry = resolveEuclidRendererGeometry(rendererId)
  if (!geometry) return null
  const tangency = /切线|tangent/i.test(`${title} ${englishTitle}`)
  const presentation = resolveEuclidVisualizationPresentation(trustLevel, rendererId, attestation)
  const trustLabel = presentation.label
  const trustNote = presentation.note

  function moveFromPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0) return
    setValue(clamp((event.clientX - bounds.left) / bounds.width, 0.08, 0.92))
  }

  return (
    <section
      className={`mt-12 overflow-hidden rounded-[5px] border ${paperMode ? 'border-[#93876b]/25 bg-[#ede7d9]' : 'border-white/[0.08] bg-[#151613]'}`}
      aria-label={trustLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
        <div>
          <p className="inline-flex items-center gap-2 text-[12px] font-medium tracking-wide opacity-80">
            <Compass className="h-4 w-4 text-[#b79d68]" /> {trustLabel} · {FAMILY_LABELS[geometry] ?? '欧几里得几何构造'}
          </p>
          <p className="mt-1 text-[10px] leading-5 opacity-55">{trustNote}</p>
        </div>
        <span className="text-[11px] opacity-60">拖动图形，观察结构变化</span>
      </div>

      <svg
        aria-labelledby={accessibleId}
        className={`block aspect-[560/350] w-full touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        viewBox="0 0 560 350"
        role="img"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          moveFromPointer(event)
        }}
        onPointerMove={(event) => {
          if (dragging) moveFromPointer(event)
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <title id={accessibleId}>{`${title}：${FAMILY_LABELS[geometry] ?? '交互式几何图形'}`}</title>
        {geometry === 'triangle' && <TriangleDiagram value={value} rendererId={rendererId} palette={palette} />}
        {geometry === 'parallel' && <ParallelDiagram value={value} palette={palette} />}
        {geometry === 'circle' && <CircleDiagram value={value} palette={palette} tangent={tangency} />}
        {geometry === 'polygon' && <PolygonDiagram value={value} proposition={proposition} palette={palette} />}
        {geometry === 'area' && <AreaDiagram value={value} palette={palette} />}
        {geometry === 'ratio' && <RatioDiagram value={value} palette={palette} />}
        {geometry === 'number' && <NumberDiagram value={value} book={book} proposition={proposition} palette={palette} />}
        {geometry === 'irrational' && <IrrationalDiagram value={value} palette={palette} />}
        {geometry === 'solid' && <SolidDiagram value={value} title={title} englishTitle={englishTitle} palette={palette} />}
      </svg>

      <div className="flex items-center gap-3 px-4 pb-4 sm:px-5">
        <input
          type="range"
          min="0.08"
          max="0.92"
          step="0.01"
          aria-label="调整几何构造参数"
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="h-1 min-w-0 flex-1 accent-[#c7ad70]"
        />
        <button
          type="button"
          onClick={() => setValue(0.5)}
          className="inline-flex items-center gap-1 text-[11px] opacity-65 transition-opacity hover:opacity-100"
        >
          <RotateCcw className="h-3.5 w-3.5" /> {presentation.effectiveTrustLevel === 'concept_illustration' ? '重置示意' : '恢复构造'}
        </button>
      </div>
    </section>
  )
}
