import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { findClosestPigments, rgbToHex } from '../utils/colorUtils'

export default function PigmentPanel({ color }) {
  const chartRef = useRef(null)

  const matches = color ? findClosestPigments(color.r, color.g, color.b) : []
  const hex = color ? rgbToHex(color.r, color.g, color.b) : null

  // D3: horizontal bars showing similarity score for each match
  useEffect(() => {
    if (!color || matches.length === 0) return
    const el = chartRef.current
    d3.select(el).selectAll('*').remove()

    const W = el.clientWidth || 260
    const barH = 28
    const gap = 10
    const labelW = 60
    const H = matches.length * (barH + gap)

    const svg = d3.select(el)
      .append('svg')
      .attr('width', W)
      .attr('height', H)

    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([labelW, W - 8])

    matches.forEach((p, i) => {
      const y = i * (barH + gap)
      const g = svg.append('g').attr('transform', `translate(0,${y})`)

      // pigment color swatch (small square)
      g.append('rect')
        .attr('x', 0).attr('y', 4)
        .attr('width', 16).attr('height', 16)
        .attr('rx', 3)
        .attr('fill', p.hex)
        .attr('stroke', '#ffffff22')
        .attr('stroke-width', 1)

      // Chinese name
      g.append('text')
        .attr('x', 22).attr('y', 16)
        .attr('fill', '#e0e0e0')
        .attr('font-size', '12px')
        .text(p.zh)

      // background track
      g.append('rect')
        .attr('x', labelW).attr('y', 6)
        .attr('width', W - labelW - 8).attr('height', barH - 12)
        .attr('rx', 4)
        .attr('fill', '#2a2a2a')

      // filled bar with pigment color (tinted)
      g.append('rect')
        .attr('x', labelW).attr('y', 6)
        .attr('width', 0).attr('height', barH - 12)
        .attr('rx', 4)
        .attr('fill', p.hex)
        .attr('opacity', 0.75)
        .transition().duration(400).ease(d3.easeCubicOut)
        .attr('width', xScale(p.score) - labelW)

      // score label
      g.append('text')
        .attr('x', W - 4).attr('y', 16)
        .attr('text-anchor', 'end')
        .attr('fill', '#888')
        .attr('font-size', '11px')
        .text(`${p.score}%`)
    })
  }, [color])

  if (!color) {
    return (
      <div className="panel empty-panel">
        <p className="panel-hint">将鼠标移到画上</p>
      </div>
    )
  }

  return (
    <div className="panel">
      {/* picked color */}
      <div className="picked-section">
        <div className="color-swatch" style={{ background: hex }} />
        <div className="color-info">
          <span className="color-hex">{hex}</span>
          <span className="color-rgb">rgb({color.r}, {color.g}, {color.b})</span>
        </div>
      </div>

      <div className="divider" />

      {/* closest pigments */}
      <p className="section-label">最接近的颜料</p>
      <div ref={chartRef} className="chart-container" />

      {/* pigment name list */}
      <div className="pigment-list">
        {matches.map((p, i) => (
          <div key={p.id} className="pigment-row">
            <span className="rank">#{i + 1}</span>
            <div className="pigment-swatch" style={{ background: p.hex }} />
            <div className="pigment-names">
              <span className="pigment-zh">{p.zh}</span>
              <span className="pigment-en">{p.en}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
