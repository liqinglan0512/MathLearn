import { useEffect, useRef } from 'react'

interface Particle {
  r: number // 轨道半径比例 0..1
  theta: number
  len: number // 拖尾弧长
  width: number
}

/**
 * Canvas 2D 黑洞吸积盘：
 * - 开普勒角速度（内快外慢）
 * - 多普勒增亮（朝观测者运动的一侧更亮）
 * - 金白色光子环 + 事件视界
 */
export default function BlackHole({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let W = 0
    let H = 0

    const particles: Particle[] = []
    for (let i = 0; i < 420; i++) {
      particles.push({
        r: Math.pow(Math.random(), 0.6), // 内密外疏
        theta: Math.random() * Math.PI * 2,
        len: 0.25 + Math.random() * 0.5,
        width: 0.6 + Math.random() * 1.4,
      })
    }

    function resize() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const TILT = 0.32 // 吸积盘倾角（椭圆压缩比）

    function frame(t: number) {
      ctx.clearRect(0, 0, W, H)
      const cx = W / 2
      const cy = H / 2
      const R = Math.min(W, H) * 0.46 // 外盘半径
      const rh = R * 0.22 // 事件视界半径

      ctx.globalCompositeOperation = 'lighter'

      // 外围辉光
      const halo = ctx.createRadialGradient(cx, cy, rh, cx, cy, R * 1.1)
      halo.addColorStop(0, 'rgba(255, 240, 210, 0.10)')
      halo.addColorStop(0.5, 'rgba(190, 180, 255, 0.05)')
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, W, H)

      // 吸积盘粒子（开普勒转动 + 多普勒增亮）
      for (const p of particles) {
        const radius = rh * 1.4 + p.r * (R - rh * 1.4)
        const omega = 22 / Math.pow(radius, 1.5) // 内快外慢
        const a1 = p.theta + t * 0.001 * omega * 60
        const a2 = a1 + p.len * (rh / radius + 0.3)

        // 多普勒：盘面向左倾，左侧朝观测者运动 → 更亮
        const doppler = 1 + 0.85 * Math.cos(a1 - Math.PI)
        const heat = 1 - p.r // 内圈更热（白），外圈偏金
        const alpha = Math.min(0.75, 0.10 + 0.28 * doppler * (0.35 + heat))

        const rr = Math.round(255)
        const gg = Math.round(210 + 40 * heat)
        const bb = Math.round(150 + 90 * heat)
        ctx.strokeStyle = `rgba(${rr}, ${gg}, ${bb}, ${alpha.toFixed(3)})`
        ctx.lineWidth = p.width * (0.7 + 0.5 * doppler)
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius, radius * TILT, 0, a1, a2)
        ctx.stroke()
      }

      // 光子环（上下两段弧，模拟引力透镜的亮环）
      for (const sign of [1, -1]) {
        ctx.strokeStyle = `rgba(255, 246, 225, ${sign > 0 ? 0.5 : 0.28})`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.ellipse(cx, cy, rh * 1.18, rh * 1.18 * TILT, 0, sign > 0 ? Math.PI : 0, sign > 0 ? Math.PI * 2 : Math.PI)
        ctx.stroke()
      }
      // 环的辉光
      ctx.strokeStyle = 'rgba(255, 240, 200, 0.10)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.ellipse(cx, cy, rh * 1.18, rh * 1.18 * TILT, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.globalCompositeOperation = 'source-over'

      // 事件视界（纯黑，边缘微影）
      const eh = ctx.createRadialGradient(cx, cy, 0, cx, cy, rh)
      eh.addColorStop(0, 'rgba(0,0,0,1)')
      eh.addColorStop(0.85, 'rgba(0,0,0,1)')
      eh.addColorStop(1, 'rgba(0,0,0,0.85)')
      ctx.fillStyle = eh
      ctx.beginPath()
      ctx.ellipse(cx, cy, rh, rh * 0.98, 0, 0, Math.PI * 2)
      ctx.fill()

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
