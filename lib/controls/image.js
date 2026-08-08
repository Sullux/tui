// Image Control supporting lazy SVG/bitmap compilation, scale modes and Kitty-graphics rendering
const Box = require('./box')
const { getImageAsset } = require('../image-asset')
const { Size, resolveMeasure } = require('../types')
const { compileAnsiStyle } = require('../ansi-style')

const onMeasure = (node, constraints, ctx) => {
  const { width: normW, height: normH } = Size(node)
  const cellPx = ctx?.cellPx || { width: 10, height: 20 }

  const expW = resolveMeasure(normW, constraints.maxWidth)
  const expH = resolveMeasure(normH, constraints.maxHeight)

  const asset = getImageAsset(node, ctx)
  const dim = asset?.dim

  let width = expW
  let height = expH

  if (width === null || height === null) {
    if (dim && dim.aspect) {
      if (width !== null && height === null) {
        // Compute height from explicit width and aspect ratio
        const wPx = width * cellPx.width
        const hPx = wPx / dim.aspect
        height = Math.max(1, Math.round(hPx / cellPx.height))
      } else if (height !== null && width === null) {
        // Compute width from explicit height and aspect ratio
        const hPx = height * cellPx.height
        const wPx = hPx * dim.aspect
        width = Math.max(1, Math.round(wPx / cellPx.width))
      } else {
        // Neither explicit: use intrinsic image pixel dimensions mapped to cell count
        width = Math.max(1, Math.ceil(dim.width / cellPx.width))
        height = Math.max(1, Math.ceil(dim.height / cellPx.height))
      }
    } else {
      if (width === null) width = 30
      if (height === null) height = 12
    }
  }

  return {
    width: Math.min(width, constraints.maxWidth),
    height: Math.min(height, constraints.maxHeight)
  }
}

const onRender = (node, grid, ctx) => {
  const box = node.box
  if (!box || box.width <= 0 || box.height <= 0) return

  const effectiveCtx = ctx || grid?.ctx
  const asset = getImageAsset(node, effectiveCtx, box)
  if (asset?.sequence) node.imageSequence = asset.sequence

  // 1. Fill image bounding box cells with background spacers
  const style = compileAnsiStyle(node)
  for (let y = box.y; y < box.y + box.height; y++) {
    if (y < 0 || y >= grid.length) continue
    const row = grid[y]
    for (let x = box.x; x < box.x + box.width; x++) {
      if (x < 0 || x >= row.length || Box.isClipped(node, x, y)) continue
      row[x] = { char: ' ', style }
    }
  }

  // 2. Commit the terminal escape sequence atomically to the top-left cell
  const imageSeq = asset?.sequence || node.imageSequence
  if (imageSeq && typeof imageSeq === 'string' && imageSeq.startsWith('\x1b_G')) {
    if (box.y >= 0 && box.y < grid.length && !Box.isClipped(node, box.x, box.y)) {
      const row = grid[box.y]
      if (box.x >= 0 && box.x < row.length) {
        row[box.x] = { char: imageSeq, style }
      }
    }
  } else {
    // Fallback placeholder
    if (box.y >= 0 && box.y < grid.length && !Box.isClipped(node, box.x, box.y)) {
      const row = grid[box.y]
      if (box.x >= 0 && box.x < row.length) {
        row[box.x] = { char: '🖼', style: '\x1b[34m' }
        if (box.x + 1 < row.length) {
          row[box.x + 1] = { char: '', style: '\x1b[34m' }
        }
      }
    }
  }
}

module.exports = {
  onMeasure,
  onRender,
}
