// Border Control
const { compileAnsiStyle } = require('../ansi-style')
const Box = require('./box')

const DEFAULTS = {
  tl: '╭', tr: '╮', bl: '╰', br: '╯',
  tc: '─', bc: '─', lc: '│', rc: '│'
}

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  
  const innerConstraints = {
    maxWidth: Math.max(0, constraints.maxWidth - 2),
    maxHeight: Math.max(0, constraints.maxHeight - 2),
  }

  let maxWidth = 0
  let totalHeight = 0

  children.forEach(child => {
    const size = measureNode(child, innerConstraints)
    if (node.direction === 'horizontal') {
      maxWidth += size.width
      totalHeight = Math.max(totalHeight, size.height)
    } else {
      maxWidth = Math.max(maxWidth, size.width)
      totalHeight += size.height
    }
  })

  return {
    width: maxWidth + 2,
    height: totalHeight + 2,
  }
}

const onLayout = (node, innerBox) => {
  const { solveLayout } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  
  // A border always has at least a 1-character inset for its outline lines!
  const borderInnerBox = {
    x: innerBox.x + 1,
    y: innerBox.y + 1,
    width: Math.max(0, innerBox.width - 2),
    height: Math.max(0, innerBox.height - 2),
  }
  children.forEach(child => solveLayout(child, borderInnerBox))
}

const onRender = (node, grid) => {
  const box = node.box
  if (!box || box.width <= 0 || box.height <= 0) return

  Box.paintBackground(grid, node)

  const style = compileAnsiStyle(node)
  const tl = node.tl || DEFAULTS.tl
  const tr = node.tr || DEFAULTS.tr
  const bl = node.bl || DEFAULTS.bl
  const br = node.br || DEFAULTS.br
  const tc = node.tc || DEFAULTS.tc
  const bc = node.bc || DEFAULTS.bc
  const lc = node.lc || DEFAULTS.lc
  const rc = node.rc || DEFAULTS.rc

  const rightX = box.x + box.width - 1
  const bottomY = box.y + box.height - 1

  if (box.y >= 0 && box.y < grid.length) {
    const row = grid[box.y]
    if (box.x >= 0 && box.x < row.length && !Box.isClipped(node, box.x, box.y)) row[box.x] = { char: tl, style }
    if (rightX >= 0 && rightX < row.length && !Box.isClipped(node, rightX, box.y)) row[rightX] = { char: tr, style }
  }

  if (bottomY >= 0 && bottomY < grid.length) {
    const row = grid[bottomY]
    if (box.x >= 0 && box.x < row.length && !Box.isClipped(node, box.x, bottomY)) row[box.x] = { char: bl, style }
    if (rightX >= 0 && rightX < row.length && !Box.isClipped(node, rightX, bottomY)) row[rightX] = { char: br, style }
  }

  for (let x = box.x + 1; x < rightX; x++) {
    if (box.y >= 0 && box.y < grid.length && !Box.isClipped(node, x, box.y)) {
      const row = grid[box.y]
      if (x >= 0 && x < row.length) row[x] = { char: tc, style }
    }
    if (bottomY >= 0 && bottomY < grid.length && !Box.isClipped(node, x, bottomY)) {
      const row = grid[bottomY]
      if (x >= 0 && x < row.length) row[x] = { char: bc, style }
    }
  }

  for (let y = box.y + 1; y < bottomY; y++) {
    if (y < 0 || y >= grid.length) continue
    const row = grid[y]
    if (box.x >= 0 && box.x < row.length && !Box.isClipped(node, box.x, y)) row[box.x] = { char: lc, style }
    if (rightX >= 0 && rightX < row.length && !Box.isClipped(node, rightX, y)) row[rightX] = { char: rc, style }
  }

  if (node.inner) {
    const children = Array.isArray(node.inner) ? node.inner : [node.inner]
    children.forEach(child => {
      if (child.control && typeof child.control.onRender === 'function') {
        child.control.onRender(child, grid)
      }
    })
  }
}

module.exports = {
  onMeasure,
  onLayout,
  onRender,
}
