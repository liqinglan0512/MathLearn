import { useEffect, useRef, useState } from 'react'
import BlackHole from '@/components/BlackHole'

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

const float PI = 3.14159265359;

float hash(vec2 point) {
  point = fract(point * vec2(123.34, 345.45));
  point += dot(point, point + 34.345);
  return fract(point.x * point.y);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 offset = fract(point);
  offset *= offset * (3.0 - 2.0 * offset);

  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), offset.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), offset.x),
    offset.y
  );
}

float stars(vec2 coordinates, float scale, float threshold) {
  vec2 grid = coordinates * scale;
  vec2 cell = floor(grid);
  vec2 center = fract(grid) - 0.5;
  float seed = hash(cell);
  float exists = smoothstep(threshold, 1.0, seed);
  float core = exp(-dot(center, center) * 85.0);
  float glimmer = 0.78 + 0.22 * sin(u_time * 0.65 + seed * 90.0);
  return exists * core * glimmer;
}

vec3 diskEmission(vec3 point, vec3 rayDirection, float crossing) {
  float radius = length(point.xz);
  float innerEdge = smoothstep(0.54, 0.82, radius);
  float outerEdge = 1.0 - smoothstep(2.1, 3.65, radius);
  float heat = clamp((2.8 - radius) / 2.1, 0.0, 1.0);
  float angle = atan(point.z, point.x);
  float orbit = angle - u_time * 0.36 / (pow(radius, 1.45) + 0.18);

  float turbulence = noise(vec2(orbit * 3.3, radius * 7.5 - u_time * 0.08));
  turbulence = mix(turbulence, noise(vec2(orbit * 8.0, radius * 17.0)), 0.32);
  float filaments = 0.48 + 0.52 * sin(
    orbit * 12.0 + radius * 25.0 + turbulence * 8.0
  );

  vec3 tangent = normalize(vec3(-point.z, 0.0, point.x));
  float doppler = pow(clamp(1.0 + dot(tangent, -rayDirection) * 0.62, 0.38, 1.65), 2.0);
  vec3 temperature = mix(vec3(1.0, 0.39, 0.095), vec3(1.0, 0.92, 0.73), heat);
  temperature = mix(temperature, vec3(1.0, 0.985, 0.92), pow(heat, 4.0) * 0.52);

  float density = innerEdge * outerEdge * (0.31 + turbulence * 0.57 + filaments * 0.23);
  return temperature * density * doppler * crossing;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float aspect = u_resolution.x / u_resolution.y;

  // Place the singularity away from the editorial copy on the left of the hero.
  vec2 framing = vec2(aspect * 0.18, -0.005);
  vec2 view = uv - framing;

  vec3 color = vec3(0.007, 0.008, 0.014);
  float nebula = noise(uv * 1.9 + vec2(4.3, -2.1));
  color += vec3(0.011, 0.014, 0.029) * nebula * smoothstep(-0.65, 0.35, view.x);

  float distantStars = stars(uv + vec2(3.4, 8.1), 76.0, 0.972);
  distantStars += stars(uv + vec2(-5.8, 2.2), 133.0, 0.988) * 0.56;
  color += vec3(0.57, 0.68, 0.91) * distantStars * 0.5;

  vec3 camera = vec3(0.0, 1.12, 7.2);
  vec3 forward = normalize(vec3(0.0, 0.025, 0.0) - camera);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 direction = normalize(forward * 1.85 + right * view.x + up * view.y);

  vec3 position = camera;
  vec3 accretion = vec3(0.0);
  float swallowed = 0.0;

  // Integrate bent light paths through a thin, rotating accretion plane.
  for (int step = 0; step < 76; step++) {
    float radiusSquared = dot(position, position);
    float radius = sqrt(radiusSquared);

    if (radius < 0.40) {
      swallowed = 1.0;
      break;
    }

    float stride = 0.068 + min(radius * 0.023, 0.16);
    vec3 previous = position;
    direction = normalize(direction - position * (0.33 * stride / (radiusSquared * radius + 0.035)));
    position += direction * stride;

    if (previous.y * position.y <= 0.0) {
      float intersection = clamp(previous.y / (previous.y - position.y), 0.0, 1.0);
      vec3 hit = mix(previous, position, intersection);
      float diskRadius = length(hit.xz);

      if (diskRadius > 0.53 && diskRadius < 3.7) {
        float grazing = clamp(0.095 / (abs(direction.y) + 0.07), 0.35, 1.7);
        accretion += diskEmission(hit, direction, grazing) * 0.74;
      }
    }

    if (position.z < -5.5 || radius > 10.5) {
      break;
    }
  }

  color += accretion;

  // A restrained analytic halo makes the secondary Einstein arcs legible even
  // on mobile GPUs whose integration precision is limited to mediump floats.
  float radial = length(view);
  float photonRing = exp(-abs(radial - 0.122) * 112.0);
  photonRing *= 0.34 + 0.56 * smoothstep(0.045, 0.16, abs(view.y));

  float arcShape = abs(length(vec2(view.x / 0.223, view.y / 0.173)) - 1.0);
  float lensedArcs = exp(-arcShape * 18.0);
  lensedArcs *= smoothstep(0.038, 0.115, abs(view.y));
  lensedArcs *= 1.0 - smoothstep(0.09, 0.23, abs(view.x));

  vec3 warmWhite = vec3(1.0, 0.82, 0.54);
  color += warmWhite * (photonRing * 0.53 + lensedArcs * 0.31);

  float equatorialWidth = 0.011 + abs(view.x) * 0.022;
  float equatorial = exp(-abs(view.y + view.x * 0.014) / equatorialWidth);
  equatorial *= smoothstep(0.084, 0.14, abs(view.x));
  equatorial *= 1.0 - smoothstep(0.48, 1.04, abs(view.x));
  float approaching = mix(1.42, 0.61, smoothstep(-0.28, 0.28, view.x));
  color += vec3(1.0, 0.66, 0.30) * equatorial * approaching * 0.34;

  float shadow = smoothstep(0.097, 0.113, radial);
  color *= mix(shadow, min(shadow, 0.055), swallowed);

  // Preserve contrast underneath the heading; the canvas remains decorative.
  color *= mix(0.49, 1.0, smoothstep(-aspect * 0.44, aspect * 0.04, view.x));
  color += (hash(gl_FragCoord.xy + fract(u_time) * 17.0) - 0.5) * 0.015;
  color = max(color, vec3(0.0));
  color = vec3(1.0) - exp(-color * 1.32);

  gl_FragColor = vec4(color, 1.0);
}
`

const MAX_RENDER_PIXELS = 560_000
const FRAME_INTERVAL_MS = 1000 / 30

function compileShader(context: WebGLRenderingContext, type: number, source: string) {
  const shader = context.createShader(type)
  if (!shader) return null

  context.shaderSource(shader, source)
  context.compileShader(shader)

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    console.warn('Black-hole shader compilation failed:', context.getShaderInfoLog(shader))
    context.deleteShader(shader)
    return null
  }

  return shader
}

export default function WebGLBlackHole({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [useCanvasFallback, setUseCanvasFallback] = useState(false)

  useEffect(() => {
    if (useCanvasFallback) return

    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let animationFrame = 0
    let previousFrame = 0
    let elapsed = 0

    const activateFallback = () => {
      queueMicrotask(() => {
        if (!disposed) setUseCanvasFallback(true)
      })
    }

    const context = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    })

    if (!context) {
      activateFallback()
      return () => {
        disposed = true
      }
    }

    const vertexShader = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = context.createProgram()
    const buffer = context.createBuffer()

    if (!vertexShader || !fragmentShader || !program || !buffer) {
      if (vertexShader) context.deleteShader(vertexShader)
      if (fragmentShader) context.deleteShader(fragmentShader)
      if (program) context.deleteProgram(program)
      if (buffer) context.deleteBuffer(buffer)
      activateFallback()
      return () => {
        disposed = true
      }
    }

    context.attachShader(program, vertexShader)
    context.attachShader(program, fragmentShader)
    context.linkProgram(program)

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      console.warn('Black-hole shader linking failed:', context.getProgramInfoLog(program))
      context.deleteShader(vertexShader)
      context.deleteShader(fragmentShader)
      context.deleteProgram(program)
      context.deleteBuffer(buffer)
      activateFallback()
      return () => {
        disposed = true
      }
    }

    context.useProgram(program)
    context.bindBuffer(context.ARRAY_BUFFER, buffer)
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      context.STATIC_DRAW,
    )

    const positionAttribute = context.getAttribLocation(program, 'a_position')
    context.enableVertexAttribArray(positionAttribute)
    context.vertexAttribPointer(positionAttribute, 2, context.FLOAT, false, 0, 0)

    const resolutionUniform = context.getUniformLocation(program, 'u_resolution')
    const timeUniform = context.getUniformLocation(program, 'u_time')
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

    const draw = (timestamp: number) => {
      if (disposed || document.hidden) return

      if (!motionPreference.matches && timestamp - previousFrame < FRAME_INTERVAL_MS) {
        animationFrame = requestAnimationFrame(draw)
        return
      }

      if (previousFrame && !motionPreference.matches) {
        elapsed += Math.min((timestamp - previousFrame) / 1000, 0.09)
      }
      previousFrame = timestamp

      context.viewport(0, 0, canvas.width, canvas.height)
      context.uniform2f(resolutionUniform, canvas.width, canvas.height)
      context.uniform1f(timeUniform, elapsed)
      context.drawArrays(context.TRIANGLE_STRIP, 0, 4)

      if (!motionPreference.matches) {
        animationFrame = requestAnimationFrame(draw)
      }
    }

    const restart = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
      previousFrame = 0
      if (!document.hidden && !disposed) {
        if (motionPreference.matches) {
          draw(performance.now())
        } else {
          animationFrame = requestAnimationFrame(draw)
        }
      }
    }

    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth))
      const height = Math.max(1, Math.round(canvas.clientHeight))
      const deviceRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      const pixelBudgetRatio = Math.min(1, Math.sqrt(MAX_RENDER_PIXELS / (width * height * deviceRatio ** 2)))
      const pixelRatio = deviceRatio * pixelBudgetRatio

      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
      restart()
    }

    const handleVisibility = () => restart()
    const handleMotionChange = () => restart()
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(animationFrame)
      activateFallback()
    }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)
    canvas.addEventListener('webglcontextlost', handleContextLost)

    motionPreference.addEventListener('change', handleMotionChange)

    resize()

    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      canvas.removeEventListener('webglcontextlost', handleContextLost)

      motionPreference.removeEventListener('change', handleMotionChange)

      context.deleteBuffer(buffer)
      context.deleteProgram(program)
      context.deleteShader(vertexShader)
      context.deleteShader(fragmentShader)
    }
  }, [useCanvasFallback])

  if (useCanvasFallback) return <BlackHole className={className} />

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
