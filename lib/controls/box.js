// Core Box helper for background fills, boundary clipping, and coordinate offsets
const { compileAnsiStyle } = require('../ansi-style')

const isClipped = (node, x, y) => {
  if (node.clip) {
    const c = node.clip
    return x < c.x || x >= c.x + c.width || y < c.y || y >= c.y + c.height
  }
  return false
}

const paintBackground = (grid, node) => {
  const box = node.box
  if (!box || box.width <= 0 || box.height <= 0) return

  if (node.bg && node.bg !== 'transparent') {
    const style = compileAnsiStyle(node)
    for (let y = box.y; y < box.y + box.height; y++) {
      if (y < 0 || y >= grid.length) continue
      const row = grid[y]
      for (let x = box.x; x < box.x + box.width; x++) {
        if (x < 0 || x >= row.length || isClipped(node, x, y)) continue
        row[x] = { char: ' ', style }
      }
    }
  }
}

module.exports = {
  isClipped,
  paintBackground,
}
