// Text Control
const { compileAnsiStyle } = require('../ansi-style')
const { breakAfterChar, visualWidth, isWideChar, sanitizeText } = require('../string-utils')
const Box = require('./box')

// Standard word-wrapping helper using visual width of wide characters
const wrapText = (text = '', maxWidth) => {
  if (maxWidth <= 0) return []
  const rawLines = text.split('\n')
  const wrapped = []

  for (const rawLine of rawLines) {
    if (rawLine === '') {
      wrapped.push('')
      continue
    }
    let current = rawLine
    while (current.length > 0) {
      if (visualWidth(current) <= maxWidth) {
        wrapped.push(current)
        break
      }
      const res = breakAfterChar(current, maxWidth)
      if (res.text.length > 0) {
        wrapped.push(res.text)
      } else if (res.extra === current) {
        wrapped.push(current.slice(0, 1))
        current = current.slice(1)
        continue
      }
      current = res.extra
    }
  }

  return wrapped
}

const onMeasure = (node, constraints) => {
  const rawText = sanitizeText(String(node.text || ''))
  const lines = node.wrap ? wrapText(rawText, constraints.maxWidth) : rawText.split('\n')
  const width = lines.reduce((max, line) => Math.max(max, visualWidth(line)), 0)
  return {
    width,
    height: lines.length,
  }
}

const onRender = (node, grid) => {
  const box = node.box
  if (!box || box.width <= 0 || box.height <= 0) return

  const style = compileAnsiStyle(node)
  Box.paintBackground(grid, node)

  const padding = node.padding || { t: 0, b: 0, l: 0, r: 0 }
  const inner = {
    x: box.x + padding.l,
    y: box.y + padding.t,
    width: Math.max(0, box.width - padding.l - padding.r),
    height: Math.max(0, box.height - padding.t - padding.b),
  }

  if (inner.width <= 0 || inner.height <= 0 || !node.text) return

  const rawText = sanitizeText(String(node.text))
  const lines = node.wrap ? wrapText(rawText, inner.width) : rawText.split('\n')
  const visibleLines = lines.slice(0, inner.height)

  let yOffset = 0
  const valign = node.valign || 'top'
  if (valign === 'bottom' || valign === 'b') {
    yOffset = Math.max(0, inner.height - visibleLines.length)
  } else if (valign === 'center' || valign === 'c') {
    yOffset = Math.max(0, Math.floor((inner.height - visibleLines.length) / 2))
  }

  visibleLines.forEach((line, i) => {
    const targetY = inner.y + yOffset + i
    if (targetY < 0 || targetY >= grid.length) return
    const row = grid[targetY]

    const lineWidth = visualWidth(line)
    let xOffset = 0
    const halign = node.halign || 'left'
    if (halign === 'right' || halign === 'r') {
      xOffset = Math.max(0, inner.width - lineWidth)
    } else if (halign === 'center' || halign === 'c') {
      xOffset = Math.max(0, Math.floor((inner.width - lineWidth) / 2))
    }

    const startX = inner.x + xOffset
    const chars = Array.from(line)
    let colOffset = 0

    for (let charIdx = 0; charIdx < chars.length; charIdx++) {
      const char = chars[charIdx]
      const charW = isWideChar(char) ? 2 : 1

      if (colOffset + charW > inner.width) break

      const targetX = startX + colOffset
      if (targetX >= 0 && targetX < row.length && !Box.isClipped(node, targetX, targetY)) {
        row[targetX] = { char, style }
      }

      if (charW === 2) {
        colOffset++
        const nextX = startX + colOffset
        if (nextX >= 0 && nextX < row.length && !Box.isClipped(node, nextX, targetY)) {
          row[nextX] = { char: '', style }
        }
      }

      colOffset++
    }
  })
}

module.exports = {
  wrapText,
  onMeasure,
  onLayout: () => {},
  onRender,
}
