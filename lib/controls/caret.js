// Caret Control - Paints customized cursor glyphs, inversions, and multi-cell dimensions
const { compileAnsiStyle } = require('../ansi-style')
const Box = require('./box')

const onMeasure = (node, constraints) => ({
  width: node.width || 1,
  height: node.height || 1,
})

const onRender = (node, grid) => {
  if (node.isVisible === false) return

  const box = node.box || { x: 0, y: 0, width: node.width || 1, height: node.height || 1 }
  const width = box.width || 1
  const height = box.height || 1
  const mode = node.mode || (node.char ? 'block' : 'invert')

  for (let r = 0; r < height; r++) {
    const y = box.y + r
    if (y < 0 || y >= grid.length) continue
    const row = grid[y]

    for (let c = 0; c < width; c++) {
      const x = box.x + c
      if (x < 0 || x >= row.length || Box.isClipped(node, x, y)) continue

      const cell = row[x] || { char: ' ', style: '' }

      if (mode === 'invert') {
        const style = compileAnsiStyle({ ...node, invert: true })
        row[x] = { char: node.char || cell.char || ' ', style }
      } else if (mode === 'bar') {
        const style = compileAnsiStyle(node)
        row[x] = { char: node.char || '│', style }
      } else if (mode === 'underline') {
        const style = compileAnsiStyle({ ...node, underline: true })
        row[x] = { char: cell.char !== ' ' ? cell.char : (node.char || '_'), style }
      } else {
        const style = compileAnsiStyle(node)
        row[x] = { char: node.char || cell.char || ' ', style }
      }
    }
  }

  // Render any child nodes (for composite / nested carets)
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
  onLayout: () => {},
  onRender,
}
