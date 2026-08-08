// Strict Geometry and Style Data Type Normalization Factories

const Measure = (val, fallback = { type: 'auto' }) => {
  if (val === undefined || val === null) {
    return typeof fallback === 'object' && fallback ? Measure(fallback, { type: 'auto' }) : { type: 'auto' }
  }

  // Idempotent check for pre-normalized Measure objects
  if (typeof val === 'object' && val.type && ['absolute', 'percent', 'fill', 'content', 'auto'].includes(val.type)) {
    return val
  }

  if (typeof val === 'number') {
    return { type: 'absolute', value: val }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === 'fill') return { type: 'fill' }
    if (trimmed === 'content') return { type: 'content' }
    if (trimmed === 'auto') return { type: 'auto' }
    if (trimmed.endsWith('%')) {
      const pct = parseFloat(trimmed) / 100
      return isNaN(pct) ? { type: 'auto' } : { type: 'percent', value: pct }
    }
    if (trimmed !== '' && !isNaN(trimmed)) {
      return { type: 'absolute', value: Number(trimmed) }
    }
    return { type: 'auto' }
  }

  if (Array.isArray(val)) {
    return val.length > 0 ? Measure(val[0], fallback) : Measure(fallback)
  }

  if (typeof val === 'object') {
    const raw = val.measure !== undefined ? val.measure : (val.m !== undefined ? val.m : val)
    if (raw !== val) return Measure(raw, fallback)
  }

  return { type: 'auto' }
}

const resolveMeasure = (val, maxLimit = Infinity) => {
  const norm = Measure(val)
  if (norm.type === 'absolute') {
    return Math.min(norm.value, maxLimit)
  }
  if (norm.type === 'percent') {
    return Math.round(maxLimit * norm.value)
  }
  return null
}

const resolveNumeric = (val, fallback = 0) => {
  const norm = Measure(val)
  if (norm.type === 'absolute') return norm.value
  if (norm.type === 'percent') return resolveMeasure(norm, fallback)
  return fallback
}

const Size = (val, fallback = { width: { type: 'auto' }, height: { type: 'auto' } }) => {
  if (val === undefined || val === null) return fallback

  if (typeof val === 'number' || typeof val === 'string') {
    const m = Measure(val)
    return { width: m, height: m }
  }

  if (Array.isArray(val)) {
    if (val.length === 2) {
      return { width: Measure(val[0]), height: Measure(val[1]) }
    }
  }

  if (typeof val === 'object') {
    const raw = val.size !== undefined ? val.size : (val.s !== undefined ? val.s : val)
    if (raw !== val) {
      return Size(raw, fallback)
    }

    const w = raw.width !== undefined ? raw.width : (raw.w !== undefined ? raw.w : fallback.width)
    const h = raw.height !== undefined ? raw.height : (raw.h !== undefined ? raw.h : fallback.height)

    return {
      width: Measure(w),
      height: Measure(h)
    }
  }

  const m = Measure(val)
  return { width: m, height: m }
}

const Margin = (val, fallback = { t: 0, b: 0, l: 0, r: 0 }) => {
  if (val === undefined || val === null) return fallback

  if (typeof val === 'number' || typeof val === 'string') {
    const m = resolveNumeric(val, fallback.t)
    return { t: m, b: m, l: m, r: m }
  }

  if (Array.isArray(val)) {
    if (val.length === 2) {
      const h = resolveNumeric(val[0], fallback.l)
      const v = resolveNumeric(val[1], fallback.t)
      return { l: h, r: h, t: v, b: v }
    }
    if (val.length === 4) {
      return {
        l: resolveNumeric(val[0], fallback.l),
        t: resolveNumeric(val[1], fallback.t),
        r: resolveNumeric(val[2], fallback.r),
        b: resolveNumeric(val[3], fallback.b)
      }
    }
  }

  if (typeof val === 'object') {
    let raw = val
    const hasFlatProps = val.t !== undefined || val.top !== undefined || val.l !== undefined || val.left !== undefined
    
    if (!hasFlatProps) {
      raw = val.margin !== undefined ? val.margin : (val.m !== undefined ? val.m : val)
    }

    if (raw !== val) {
      return Margin(raw, fallback)
    }

    const t = raw.top !== undefined ? raw.top : (raw.t !== undefined ? raw.t : (raw.vertical !== undefined ? raw.vertical : (raw.v !== undefined ? raw.v : (raw.all !== undefined ? raw.all : fallback.t))))
    const b = raw.bottom !== undefined ? raw.bottom : (raw.b !== undefined ? raw.b : (raw.vertical !== undefined ? raw.vertical : (raw.v !== undefined ? raw.v : (raw.all !== undefined ? raw.all : fallback.b))))
    const l = raw.left !== undefined ? raw.left : (raw.l !== undefined ? raw.l : (raw.horizontal !== undefined ? raw.horizontal : (raw.h !== undefined ? raw.h : (raw.all !== undefined ? raw.all : fallback.l))))
    const r = raw.right !== undefined ? raw.right : (raw.r !== undefined ? raw.r : (raw.horizontal !== undefined ? raw.horizontal : (raw.h !== undefined ? raw.h : (raw.all !== undefined ? raw.all : fallback.r))))

    return {
      t: resolveNumeric(t, fallback.t),
      b: resolveNumeric(b, fallback.b),
      l: resolveNumeric(l, fallback.l),
      r: resolveNumeric(r, fallback.r)
    }
  }

  return fallback
}

const Padding = (val, fallback = { t: 0, b: 0, l: 0, r: 0 }) => {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'object') {
    let raw = val
    const hasFlatProps = val.t !== undefined || val.top !== undefined || val.l !== undefined || val.left !== undefined
    if (!hasFlatProps) {
      raw = val.padding !== undefined ? val.padding : (val.p !== undefined ? val.p : val)
    }
    return Margin(raw, fallback)
  }
  return Margin(val, fallback)
}

const Point = (val, fallback = { x: 0, y: 0 }) => {
  if (val === undefined || val === null) return fallback

  if (typeof val === 'number') {
    const m = Measure(val)
    return { x: m, y: m }
  }

  if (Array.isArray(val)) {
    if (val.length === 2) {
      return { x: Measure(val[0]), y: Measure(val[1]) }
    }
  }

  if (typeof val === 'object') {
    const raw = val.point !== undefined ? val.point : (val.p !== undefined ? val.p : val)
    if (raw !== val) {
      return Point(raw, fallback)
    }
    return {
      x: Measure(raw.x !== undefined ? raw.x : fallback.x),
      y: Measure(raw.y !== undefined ? raw.y : fallback.y)
    }
  }

  return fallback
}

const Bounds = (val, fallback = { x: 0, y: 0, width: 0, height: 0 }) => {
  if (val === undefined || val === null) return fallback

  if (Array.isArray(val)) {
    if (val.length === 2) {
      const pt = Point(val[0])
      const sz = Size(val[1])
      return { x: pt.x, y: pt.y, width: sz.width, height: sz.height }
    }
  }

  if (typeof val === 'object') {
    const raw = val.bounds !== undefined ? val.bounds : (val.b !== undefined ? val.b : val)
    if (raw !== val) {
      return Bounds(raw, fallback)
    }

    const pt = Point(raw.point || raw.p || raw)
    const sz = Size(raw.size || raw.s || raw)

    return {
      x: pt.x ?? fallback.x,
      y: pt.y ?? fallback.y,
      width: sz.width ?? fallback.width,
      height: sz.height ?? fallback.height
    }
  }

  return fallback
}

const Orientation = (val, fallback = 'vertical') => {
  if (val === 'horizontal' || val === 'h') return 'horizontal'
  if (val === 'vertical' || val === 'v') return 'vertical'
  return fallback
}

const HAlign = (val, fallback = 'stretch') => {
  if (val === 'left' || val === 'l') return 'left'
  if (val === 'right' || val === 'r') return 'right'
  if (val === 'center' || val === 'c') return 'center'
  if (val === 'stretch' || val === 's') return 'stretch'
  return fallback
}

const VAlign = (val, fallback = 'stretch') => {
  if (val === 'top' || val === 't') return 'top'
  if (val === 'bottom' || val === 'b') return 'bottom'
  if (val === 'middle' || val === 'm' || val === 'center' || val === 'c') return 'middle'
  if (val === 'stretch' || val === 's') return 'stretch'
  return fallback
}

const Color = (val, fallback = null) => {
  if (val === undefined || val === null) return fallback
  return val
}

const Scale = (val = 'fit') => {
  if (typeof val === 'object' && val && val.type && ['fit', 'zoom', 'stretch', 'none'].includes(val.type)) {
    return val
  }
  const norm = String(val || 'fit').toLowerCase().trim()
  if (norm === 'contain' || norm === 'fit') return { type: 'fit' }
  if (norm === 'cover' || norm === 'zoom') return { type: 'zoom' }
  if (norm === 'fill' || norm === 'stretch') return { type: 'stretch' }
  if (norm === 'none') return { type: 'none' }
  return { type: 'fit' }
}

module.exports = {
  Measure,
  resolveMeasure,
  Size,
  Margin,
  Padding,
  Point,
  Bounds,
  Orientation,
  HAlign,
  VAlign,
  Color,
  Scale
}
