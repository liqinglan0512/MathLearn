import { useEffect, useRef } from 'react'

type Point = { x: number; y: number; depth: number }

const GOLD = '199, 173, 112'
const IVORY = '231, 220, 191'
const TAU = Math.PI * 2

/** All visible lines are sections of one continuously deformed saddle surface. */
export default function MathManifold({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true, desynchronized: true })
    if (!canvas || !context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(pointer: fine)')
    let frame = 0
    let width = 1
    let height = 1
    let previousFrame = 0
    let visible = true
    let elapsed = 0
    let targetX = 0
    let targetY = 0
    let pointerX = 0
    let pointerY = 0

    const project = (u: number, v: number, time: number): Point => {
      const pulse = Math.sin(time * 0.34) * 0.038
      const x = u * 1.22
      const y = (u * u - v * v) * (0.26 + pulse) + Math.sin(u * 1.26) * Math.cos(v * 1.12) * 0.11
      const z = v * 1.08

      const yaw = -0.63 + Math.sin(time * 0.16) * 0.055 + pointerX * 0.16
      const pitch = 0.83 + Math.cos(time * 0.12) * 0.025 + pointerY * 0.12
      const cosYaw = Math.cos(yaw)
      const sinYaw = Math.sin(yaw)
      const rotatedX = x * cosYaw - z * sinYaw
      const rotatedZ = x * sinYaw + z * cosYaw
      const cosPitch = Math.cos(pitch)
      const sinPitch = Math.sin(pitch)
      const rotatedY = y * cosPitch - rotatedZ * sinPitch
      const depth = y * sinPitch + rotatedZ * cosPitch
      const perspective = 4.2 / (4.2 + depth * 0.28)
      const scale = Math.min(width * 0.31, height * 0.43)

      return {
        x: width * 0.51 + rotatedX * scale * perspective,
        y: height * 0.48 + rotatedY * scale * perspective,
        depth,
      }
    }

    const trace = (fixed: number, axis: 'u' | 'v', time: number, emphasis = false) => {
      const steps = width < 520 ? 56 : 88
      const domain = 1.7
      let midpointDepth = 0
      context.beginPath()

      for (let step = 0; step <= steps; step += 1) {
        const coordinate = -domain + (step / steps) * domain * 2
        const point = axis === 'u'
          ? project(fixed, coordinate, time)
          : project(coordinate, fixed, time)
        if (step === Math.floor(steps / 2)) midpointDepth = point.depth
        if (step === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
      }

      const depthVisibility = Math.max(0.4, Math.min(1, 0.71 - midpointDepth * 0.12))
      const edgeFade = 0.45 + (1 - Math.min(1, Math.abs(fixed) / domain)) * 0.55
      const baseOpacity = emphasis ? 0.66 : axis === 'u' ? 0.27 : 0.15
      context.strokeStyle = `rgba(${emphasis ? IVORY : GOLD}, ${baseOpacity * depthVisibility * edgeFade})`
      context.lineWidth = emphasis ? 1.22 : axis === 'u' ? 0.82 : 0.68
      context.stroke()
    }

    const traceGeodesic = (time: number) => {
      const steps = width < 520 ? 68 : 120
      context.beginPath()
      for (let step = 0; step <= steps; step += 1) {
        const coordinate = -1.62 + (step / steps) * 3.24
        const bending = Math.sin(coordinate * 1.12 + time * 0.09) * 0.48
        const point = project(coordinate * 0.75, bending, time)
        if (step === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
      }
      const breathing = 0.45 + (Math.sin(time * 0.42) * 0.5 + 0.5) * 0.21
      context.strokeStyle = `rgba(${IVORY}, ${breathing})`
      context.lineWidth = 1.34
      context.stroke()
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      context.beginPath()
      context.ellipse(width * 0.51, height * 0.49, width * 0.37, height * 0.32, -0.16, 0, TAU)
      context.strokeStyle = `rgba(${GOLD}, 0.035)`
      context.lineWidth = 0.7
      context.stroke()

      const count = width < 520 ? 17 : 23
      for (let index = 0; index < count; index += 1) {
        trace(-1.7 + (index / (count - 1)) * 3.4, 'v', time)
      }
      for (let index = 0; index < count; index += 1) {
        trace(-1.7 + (index / (count - 1)) * 3.4, 'u', time, index === Math.floor(count / 2))
      }
      traceGeodesic(time)
    }

    const animate = (timestamp: number) => {
      if (!visible || document.hidden) {
        frame = 0
        return
      }

      if (timestamp - previousFrame >= 1000 / 30) {
        const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.08) : 0
        previousFrame = timestamp
        if (!reducedMotion.matches) elapsed += delta
        pointerX += (targetX - pointerX) * 0.065
        pointerY += (targetY - pointerY) * 0.065
        draw(elapsed)
      }

      if (!reducedMotion.matches) frame = requestAnimationFrame(animate)
      else frame = 0
    }

    const requestRender = () => {
      if (visible && !document.hidden && !frame) {
        previousFrame = 0
        frame = requestAnimationFrame(animate)
      }
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = Math.max(bounds.width, 1)
      height = Math.max(bounds.height, 1)
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw(elapsed)
      requestRender()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return
      const bounds = canvas.getBoundingClientRect()
      targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2))
      targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2))
      requestRender()
    }

    const onVisibilityChange = () => requestRender()
    const onMotionChange = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      requestRender()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) requestRender()
    }, { threshold: 0.02 })
    intersectionObserver.observe(canvas)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.addEventListener('change', onMotionChange)
    resize()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      reducedMotion.removeEventListener('change', onMotionChange)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
