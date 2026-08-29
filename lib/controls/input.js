// Input Control - Single-line and Multi-line Text Entry Engine
const { compileAnsiStyle } = require('../ansi-style')
const { visualWidth, isWideChar, sanitizeText } = require('../string-utils')
const { wrapText } = require('./text')
const { findLineCol, handleInputKey } = require('../input-utils')
const Box = require('./box')
const Caret = require('./caret')

const onMeasure = (node, constraints) => {
  const val = String(node.value !== undefined ? node.value : (node.text !== undefined ? node.text : ''))
  const isMult = node.multiline || node.wrap || val.includes('\n')
  if (isMult) {
    const maxWidth = Math.max(1, constraints.maxWidth || 80)
    const lines = node.wrap ? wrapText(val || ' ', maxWidth) : (val ? val.split('\n') : [' '])
    const maxLineW = lines.reduce((max, l) => Math.max(max, visualWidth(l)), 0)
    let h = Math.max(1, lines.length)
    if (node.maxHeight) h = Math.min(h, node.maxHeight)
    return { width: Math.min(maxWidth, Math.max(1, maxLineW)), height: h }
  }
  return { width: Math.min(constraints.maxWidth, Math.max(1, visualWidth(val) + 1)), height: 1 }
}

const renderSpans = (spans, startX, startY, innerX, innerWidth, node, grid) => {
  let col = 0
  for (const span of spans) {
    const spanStyle = compileAnsiStyle({ ...node, ...span })
    for (const ch of span.text || '') {
      const chW = isWideChar(ch) ? 2 : 1
      const targetX = startX + col
      if (
        targetX >= innerX &&
        targetX < innerX + innerWidth &&
        targetX >= 0 &&
        targetX < grid[startY]?.length &&
        !Box.isClipped(node, targetX, startY)
      ) {
        grid[startY][targetX] = { char: ch, style: spanStyle }
      }
      col += chW
    }
  }
}

const onRender = (node, grid) => {
  const box = node.box
  if (!box || box.width <= 0 || box.height <= 0) return

  Box.paintBackground(grid, node)

  const pad = node.padding || { t: 0, b: 0, l: 0, r: 0 }
  const inner = {
    x: box.x + pad.l,
    y: box.y + pad.t,
    width: Math.max(0, box.width - pad.l - pad.r),
    height: Math.max(0, box.height - pad.t - pad.b),
  }
  if (inner.width <= 0 || inner.height <= 0) return

  const rawVal = node.value !== undefined ? String(node.value) : (node.text !== undefined ? String(node.text) : '')
  const isPlaceholder = !rawVal && !!node.placeholder
  const baseText = isPlaceholder ? String(node.placeholder) : rawVal
  const displayText = (node.mask && !isPlaceholder) ? node.mask.repeat(rawVal.length) : baseText
  const cursor = typeof node.cursor === 'number' ? Math.max(0, Math.min(rawVal.length, node.cursor)) : rawVal.length

  let caretX = inner.x
  let caretY = inner.y

  const isMult = node.multiline || node.wrap || rawVal.includes('\n') || inner.height > 1

  if (!isMult) {
    const cursorOffset = visualWidth(displayText.slice(0, cursor))
    let scrollX = node.scrollX || 0
    if (cursorOffset < scrollX) scrollX = cursorOffset
    if (cursorOffset >= scrollX + inner.width) scrollX = cursorOffset - inner.width + 1
    node.scrollX = scrollX

    caretX = inner.x + cursorOffset - scrollX
    caretY = inner.y

    const formatFn = typeof node.format === 'function' ? node.format : (typeof node.onFormat === 'function' ? node.onFormat : null)
    if (formatFn && !isPlaceholder) {
      const spans = formatFn(displayText, cursor, grid?.ctx)
      renderSpans(spans, inner.x - scrollX, inner.y, inner.x, inner.width, node, grid)
    } else {
      const placeholderProps = isPlaceholder ? { italic: true, fg: '#666666', ...(node.placeholderStyle || {}) } : {}
      renderSpans([{ text: displayText, ...placeholderProps }], inner.x - scrollX, inner.y, inner.x, inner.width, node, grid)
    }
  } else {
    const lines = node.wrap ? wrapText(displayText, inner.width) : displayText.split('\n')
    const loc = findLineCol(lines, cursor)
    let scrollY = node.scrollY || 0
    if (loc.row < scrollY) scrollY = loc.row
    if (loc.row >= scrollY + inner.height) scrollY = loc.row - inner.height + 1
    node.scrollY = scrollY

    caretX = inner.x + loc.col
    caretY = inner.y + loc.row - scrollY

    const visibleLines = lines.slice(scrollY, scrollY + inner.height)
    visibleLines.forEach((line, rIdx) => {
      const lineY = inner.y + rIdx
      const placeholderProps = isPlaceholder ? { italic: true, fg: '#666666', ...(node.placeholderStyle || {}) } : {}
      renderSpans([{ text: line, ...placeholderProps }], inner.x, lineY, inner.x, inner.width, node, grid)
    })
  }

  // Paint Caret if focused
  if (node.hasFocus && node.caret !== false && node.caret !== null) {
    const caretDef = typeof node.caret === 'string'
      ? { type: 'caret', char: node.caret, mode: 'block' }
      : (typeof node.caret === 'object' ? { type: 'caret', mode: 'invert', ...node.caret } : { type: 'caret', mode: 'invert' })
    caretDef.box = {
      x: caretX,
      y: caretY,
      width: caretDef.width || 1,
      height: caretDef.height || 1,
    }
    caretDef.parent = node
    Caret.onRender(caretDef, grid)
  }
}

module.exports = {
  onMeasure,
  onLayout: () => {},
  onRender,
  onKey: handleInputKey,
  handleInputKey,
}
