// ── 10 basic painter pigments ──────────────────────────────────────────────
export const PIGMENTS = [
  { id: 'titanium_white', en: 'Titanium White', hex: '#F2EFE0' },
  { id: 'ivory_black',    en: 'Ivory Black',    hex: '#2A2A28' },
  { id: 'cadmium_yellow', en: 'Cadmium Yellow', hex: '#F0C020' },
  { id: 'yellow_ochre',   en: 'Yellow Ochre',   hex: '#C8922A' },
  { id: 'vermillion',     en: 'Vermillion',     hex: '#CE3020' },
  { id: 'crimson',        en: 'Crimson',        hex: '#B82040' },
  { id: 'ultramarine',    en: 'Ultramarine',    hex: '#2A3899' },
  { id: 'prussian_blue',  en: 'Prussian Blue',  hex: '#1A3A5C' },
  { id: 'viridian',       en: 'Viridian',       hex: '#3A7A6A' },
  { id: 'burnt_umber',    en: 'Burnt Umber',    hex: '#6B3A2A' },
]

// ── Color space conversions ────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToLab(r, g, b) {
  // sRGB → linear
  let rr = r / 255, gg = g / 255, bb = b / 255
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92

  // linear → XYZ (D65)
  const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047
  const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000
  const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883

  const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116

  return {
    L: 116 * f(y) - 16,
    a: 500 * (f(x) - f(y)),
    b: 200 * (f(y) - f(z)),
  }
}

function deltaE(lab1, lab2) {
  return Math.sqrt(
    (lab1.L - lab2.L) ** 2 +
    (lab1.a - lab2.a) ** 2 +
    (lab1.b - lab2.b) ** 2
  )
}

// ── Pre-compute LAB values for all pigments ────────────────────────────────
const PIGMENTS_LAB = PIGMENTS.map(p => {
  const { r, g, b } = hexToRgb(p.hex)
  return { ...p, lab: rgbToLab(r, g, b) }
})

// ── Main API ───────────────────────────────────────────────────────────────

/**
 * Given an RGB color, return the top N closest pigments with distance scores.
 * Scores are normalised: 100 = perfect match, 0 = furthest away.
 */
export function findClosestPigments(r, g, b, n = 3) {
  const targetLab = rgbToLab(r, g, b)

  const ranked = PIGMENTS_LAB
    .map(p => ({ ...p, distance: deltaE(targetLab, p.lab) }))
    .sort((a, b) => a.distance - b.distance)

  const maxDist = ranked[ranked.length - 1].distance || 1
  return ranked.slice(0, n).map(p => ({
    ...p,
    score: Math.round((1 - p.distance / maxDist) * 100),
  }))
}

/** Convert rgb values to a css hex string */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
