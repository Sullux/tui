// Scroll Viewport Control
const Box = require('./box')
const { Orientation } = require('../types')

const getChildren = (node) => {
  if (!node.inner) return []
  return Array.isArray(node.inner) ? node.inner : [node.inner]
}

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = getChildren(node)
  const direction = Orientation(node.direction || 'vertical')
  const isHorizontal = direction === 'horizontal'

  const innerConstraints = {
    maxWidth: isHorizontal ? Infinity : constraints.maxWidth,
    maxHeight: !isHorizontal ? Infinity : constraints.maxHeight,
  }

  let contentWidth = 0
  let contentHeight = 0

  children.forEach(child => {
    const size = measureNode(child, innerConstraints)
    if (isHorizontal) {
      contentWidth += size.width
      contentHeight = Math.max(contentHeight, size.height)
    } else {
      contentWidth = Math.max(contentWidth, size.width)
      contentHeight += size.height
    }
  })

  node.contentSize = { width: contentWidth, height: contentHeight }
  return { width: contentWidth, height: contentHeight }
}

const onLayout = (node, innerBox) => {
  const { solveLayout, measureNode } = require('../layout')
  const children = getChildren(node)
  const direction = Orientation(node.direction || 'vertical')
  const isHorizontal = direction === 'horizontal'

  const innerConstraints = {
    maxWidth: isHorizontal ? Infinity : innerBox.width,
    maxHeight: !isHorizontal ? Infinity : innerBox.height,
  }

  let contentWidth = 0
  let contentHeight = 0

  children.forEach(child => {
    const size = measureNode(child, innerConstraints)
    if (isHorizontal) {
      contentWidth += size.width
      contentHeight = Math.max(contentHeight, size.height)
    } else {
      contentWidth = Math.max(contentWidth, size.width)
      contentHeight += size.height
    }
  })

  const contentSize = { width: contentWidth, height: contentHeight }
  const viewportSize = isHorizontal ? innerBox.width : innerBox.height
  const contentLength = isHorizontal ? contentWidth : contentHeight
  const maxScroll = Math.max(0, contentLength - viewportSize)

  const rawScroll = node.scroll !== undefined ? Number(node.scroll) : (isHorizontal ? (node.scrollX || 0) : (node.scrollY || 0))
  const effectiveScroll = Math.min(Math.max(0, rawScroll), maxScroll)

  node.contentSize = contentSize
  node.maxScroll = maxScroll
  node.effectiveScroll = effectiveScroll

  const scrollX = isHorizontal ? effectiveScroll : 0
  const scrollY = !isHorizontal ? effectiveScroll : 0

  const scrollBox = {
    x: innerBox.x - scrollX,
    y: innerBox.y - scrollY,
    width: isHorizontal ? Math.max(innerBox.width, contentWidth) : innerBox.width,
    height: !isHorizontal ? Math.max(innerBox.height, contentHeight) : innerBox.height,
    allocatedWidth: isHorizontal,
    allocatedHeight: !isHorizontal,
  }

  const virtualContainer = {
    inner: children,
    direction,
    width: scrollBox.width,
    height: scrollBox.height,
    control: require('./layout'),
  }
  solveLayout(virtualContainer, scrollBox)

  const applyClip = (n) => {
    n.clip = {
      x: innerBox.x,
      y: innerBox.y,
      width: innerBox.width,
      height: innerBox.height,
    }
    if (n.inner) {
      const kids = Array.isArray(n.inner) ? n.inner : [n.inner]
      kids.forEach(applyClip)
    }
  }
  children.forEach(applyClip)
}

const onRender = (node, grid) => {
  Box.paintBackground(grid, node)
  const children = getChildren(node)
  children.forEach(child => {
    if (child.control && typeof child.control.onRender === 'function') {
      child.control.onRender(child, grid)
    }
  })
}

module.exports = {
  onMeasure,
  onLayout,
  onRender,
}
