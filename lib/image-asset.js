const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { getImageDimensions } = require('./image-geometry')
const { getInheritedProp, resolveColor } = require('./ansi-style')
const { Scale } = require('./types')

const svgCache = new Map()
let hasRsvg = null

const checkRsvg = () => {
  if (hasRsvg !== null) return hasRsvg
  try {
    const res = spawnSync('rsvg-convert', ['--version'], { stdio: 'ignore' })
    hasRsvg = res.status === 0
  } catch (_) {
    hasRsvg = false
  }
  return hasRsvg
}

const getImageSourceData = (node) => {
  if (node.text) return node.text
  if (node.content) return node.content
  if (node.data) return node.data

  const filePath = node.file || node.src
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath)
      }
    } catch (_) {}
  }

  return null
}

const getImageAsset = (node, ctx, targetCellBox = null) => {
  const data = getImageSourceData(node)
  if (!data) return null

  const dim = getImageDimensions(data)
  const scale = Scale(node.scale || node.mode || 'fit')

  if (!targetCellBox) {
    return { data, dim, scale }
  }

  // Handle rasterization / compilation for targetCellBox
  const cellPx = ctx?.cellPx || { width: 10, height: 20 }
  const availPxW = Math.max(1, targetCellBox.width * cellPx.width)
  const availPxH = Math.max(1, targetCellBox.height * cellPx.height)

  let rasterPxW = availPxW
  let rasterPxH = availPxH

  const aspect = dim ? dim.aspect : (availPxW / availPxH)

  if (scale.type === 'fit') {
    if (availPxW / availPxH > aspect) {
      rasterPxH = availPxH
      rasterPxW = Math.max(1, Math.round(availPxH * aspect))
    } else {
      rasterPxW = availPxW
      rasterPxH = Math.max(1, Math.round(availPxW / aspect))
    }
  } else if (scale.type === 'zoom') {
    if (availPxW / availPxH > aspect) {
      rasterPxW = availPxW
      rasterPxH = Math.max(1, Math.round(availPxW / aspect))
    } else {
      rasterPxH = availPxH
      rasterPxW = Math.max(1, Math.round(availPxH * aspect))
    }
  } else if (scale.type === 'none' && dim) {
    rasterPxW = dim.width
    rasterPxH = dim.height
  }

  const bg = resolveColor(getInheritedProp(node, 'bg'), ctx?.capabilities) || ''
  const fg = resolveColor(getInheritedProp(node, 'fg'), ctx?.capabilities) || ''

  const cacheKey = `${data.toString('utf8')}_${rasterPxW}_${rasterPxH}_${scale.type}_${bg}_${fg}`
  if (svgCache.has(cacheKey)) {
    return { data, dim, scale, sequence: svgCache.get(cacheKey) }
  }

  let sequence = null

  // If input is SVG string, substitute CSS variables and convert via rsvg-convert
  let rawSvg = typeof data === 'string' ? data : (data.toString('utf8').includes('<svg') ? data.toString('utf8') : null)
  if (rawSvg && checkRsvg()) {
    let renderedSvg = rawSvg
    if (bg) renderedSvg = renderedSvg.replace(/var\(--bg\)/g, bg)
    if (fg) renderedSvg = renderedSvg.replace(/var\(--fg\)/g, fg)

    try {
      const res = spawnSync('rsvg-convert', ['-w', String(rasterPxW), '-h', String(rasterPxH), '-f', 'png'], {
        input: renderedSvg,
        timeout: 1000,
      })

      if (res.status === 0 && res.stdout && res.stdout.length > 0) {
        const base64 = res.stdout.toString('base64')
        if (!getImageAsset.nextId) getImageAsset.nextId = 1000
        const imageId = getImageAsset.nextId++

        sequence = `\x1b_Ga=T,q=2,f=100,i=${imageId},c=${targetCellBox.width},r=${targetCellBox.height};${base64}\x1b\\`
        svgCache.set(cacheKey, sequence)
      }
    } catch (_) {}
  } else if (Buffer.isBuffer(data) && dim && dim.format !== 'svg') {
    // Direct bitmap buffer (PNG/JPEG/GIF)
    const base64 = data.toString('base64')
    if (!getImageAsset.nextId) getImageAsset.nextId = 1000
    const imageId = getImageAsset.nextId++
    sequence = `\x1b_Ga=T,q=2,f=100,i=${imageId},c=${targetCellBox.width},r=${targetCellBox.height};${base64}\x1b\\`
    svgCache.set(cacheKey, sequence)
  }

  return { data, dim, scale, sequence }
}

module.exports = {
  getImageAsset,
  getImageSourceData
}
