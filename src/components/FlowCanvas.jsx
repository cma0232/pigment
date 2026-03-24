import { useRef, useEffect } from 'react'

const PARTICLE_COUNT = 3500
const GRID_RES       = 4      // flow field grid size in pixels
const BASE_SPEED     = 1.8
const MAX_LIFE       = 180    // frames before a particle resets
const FADE_ALPHA     = 0.08   // background overlay alpha per frame (controls trail length)
const MOUSE_RADIUS   = 160    // pixels of mouse influence (in canvas-internal pixels)

// ── Sobel-based flow field ─────────────────────────────────────────────────
function buildFlowField(imgData, w, h) {
  const cols = Math.ceil(w / GRID_RES)
  const rows = Math.ceil(h / GRID_RES)
  const field = new Float32Array(cols * rows)

  const lum = (x, y) => {
    x = Math.max(0, Math.min(w - 1, x))
    y = Math.max(0, Math.min(h - 1, y))
    const i = (y * w + x) * 4
    return 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * GRID_RES
      const py = r * GRID_RES
      const gx = -lum(px-1,py-1) + lum(px+1,py-1) - 2*lum(px-1,py) + 2*lum(px+1,py) - lum(px-1,py+1) + lum(px+1,py+1)
      const gy = -lum(px-1,py-1) - 2*lum(px,py-1) - lum(px+1,py-1) + lum(px-1,py+1) + 2*lum(px,py+1) + lum(px+1,py+1)
      // perpendicular to gradient → particles flow along edges/brushstrokes
      field[r * cols + c] = Math.atan2(gy, gx) + Math.PI / 2
    }
  }
  return { field, cols, rows }
}

// ── Particle class ─────────────────────────────────────────────────────────
class Particle {
  constructor(w, h) { this.w = w; this.h = h; this.reset() }

  reset() {
    this.x  = Math.random() * this.w
    this.y  = Math.random() * this.h
    this.px = this.x
    this.py = this.y
    this.life    = Math.random() * MAX_LIFE
    this.maxLife = MAX_LIFE
    this.speed   = BASE_SPEED * (0.7 + Math.random() * 0.6)
  }

  update(field, cols, mx, my) {
    const c = Math.floor(this.x / GRID_RES)
    const r = Math.floor(this.y / GRID_RES)
    if (c < 0 || c >= cols || r < 0 || r >= Math.ceil(this.h / GRID_RES)) { this.reset(); return }

    let angle = field[r * cols + c]

    // mouse vortex
    if (mx !== null && my !== null) {
      const dx = this.x - mx, dy = this.y - my
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist < MOUSE_RADIUS && dist > 0.1) {
        const vortex = Math.atan2(dy, dx) + Math.PI / 2
        const t = Math.pow(1 - dist / MOUSE_RADIUS, 1.5) * 0.95
        angle = angle * (1 - t) + vortex * t
      }
    }

    this.px = this.x
    this.py = this.y
    this.x += Math.cos(angle) * this.speed
    this.y += Math.sin(angle) * this.speed
    this.life--

    if (this.life <= 0 || this.x < 0 || this.x >= this.w || this.y < 0 || this.y >= this.h) this.reset()
  }

  draw(ctx, pixels, imgW) {
    const ix = Math.floor(this.x), iy = Math.floor(this.y)
    if (ix < 0 || ix >= imgW || iy < 0 || iy >= Math.floor(ctx.canvas.height)) return
    const i = (iy * imgW + ix) * 4
    const alpha = (this.life / this.maxLife) * 0.65
    ctx.strokeStyle = `rgba(${pixels[i]},${pixels[i+1]},${pixels[i+2]},${alpha})`
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(this.px, this.py)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function FlowCanvas({ sourceCanvas }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const mouseRef  = useRef({ x: null, y: null })

  useEffect(() => {
    if (!sourceCanvas) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = sourceCanvas.width
    const H = sourceCanvas.height
    canvas.width  = W
    canvas.height = H

    // grab pixel data from the source painting
    const srcCtx  = sourceCanvas.getContext('2d', { willReadFrequently: true })
    const imgData = srcCtx.getImageData(0, 0, W, H)
    const pixels  = imgData.data

    // build flow field
    const { field, cols } = buildFlowField(pixels, W, H)

    // spawn particles
    const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle(W, H))

    // draw faint original image as base so painting is still visible
    ctx.globalAlpha = 0.25
    ctx.drawImage(sourceCanvas, 0, 0)
    ctx.globalAlpha = 1

    // ── native DOM mouse listeners (more reliable than React synthetic events) ──
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width  / rect.width
      const scaleY = canvas.height / rect.height
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top)  * scaleY,
      }
    }
    const onMouseLeave = () => { mouseRef.current = { x: null, y: null } }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)

    let rafId
    const tick = () => {
      // dim background each frame → creates fading trails
      ctx.fillStyle = `rgba(17,17,17,${FADE_ALPHA})`
      ctx.fillRect(0, 0, W, H)

      const { x: mx, y: my } = mouseRef.current
      for (const p of particles) {
        p.update(field, cols, mx, my)
        p.draw(ctx, pixels, W)
      }

      // draw a soft glow ring at cursor to show influence radius
      if (mx !== null && my !== null) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(mx, my, MOUSE_RADIUS, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    stateRef.current = { rafId }

    return () => {
      cancelAnimationFrame(stateRef.current?.rafId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [sourceCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="painting-canvas flow-canvas"
    />
  )
}
