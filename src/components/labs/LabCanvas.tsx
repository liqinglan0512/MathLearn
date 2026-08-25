import { useEffect, useRef } from 'react'
import type { LabDraw } from '@/components/labs/canvasDrawing'

interface LabCanvasProps {
  label: string
  draw: LabDraw
  xRange?: readonly [number, number]
  yRange?: readonly [number, number]
  className?: string
}

export function LabCanvas({
  label,
  draw,
  xRange = [-4, 4],
  yRange = [-3, 3],
  className = 'h-[360px] sm:h-[430px] xl:h-[500px]',
}: LabCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const xMin = xRange[0]
  const xMax = xRange[1]
  const yMin = yRange[0]
  const yMax = yRange[1]

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const paint = () => {
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

      const glow = context.createRadialGradient(
        width * 0.58,
        height * 0.46,
        0,
        width * 0.58,
        height * 0.46,
        width * 0.72,
      )
      glow.addColorStop(0, 'rgba(209, 183, 125, 0.042)')
      glow.addColorStop(1, 'rgba(209, 183, 125, 0)')
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)

      draw(context, {
        width,
        height,
        xMin,
        xMax,
        yMin,
        yMax,
        x: (value) => ((value - xMin) / (xMax - xMin)) * width,
        y: (value) => height - ((value - yMin) / (yMax - yMin)) * height,
      })
    }

    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draw, xMin, xMax, yMin, yMax])

  return (
    <canvas
      ref={ref}
      aria-label={label}
      role="img"
      className={`block w-full ${className}`}
    >
      {label}
    </canvas>
  )
}
