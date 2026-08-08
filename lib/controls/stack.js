// Stack Layout Control (Wrapping Sibling Flow)
const Box = require('./box')

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  const direction = node.direction || 'vertical'
  const isHorizontal = direction === 'horizontal'

  let width = 0
  let height = 0
  let curX = 0
  let curY = 0
  let lineSize = 0

  children.forEach(child => {
    const size = measureNode(child, constraints)
    
    if (isHorizontal) {
      if (curX + size.width > constraints.maxWidth && curX > 0) {
        curX = 0
        curY += lineSize
        lineSize = 0
      }
      curX += size.width
      lineSize = Math.max(lineSize, size.height)
      width = Math.max(width, curX)
      height = Math.max(height, curY + lineSize)
    } else {
      if (curY + size.height > constraints.maxHeight && curY > 0) {
        curY = 0
        curX += lineSize
        lineSize = 0
      }
      curY += size.height
      lineSize = Math.max(lineSize, size.width)
      width = Math.max(width, curX + lineSize)
      height = Math.max(height, curY)
    }
  })

  return { width, height }
}

const onLayout = (node, innerBox) => {
  const { solveLayout, measureNode } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  const direction = node.direction || 'vertical'
  const isHorizontal = direction === 'horizontal'

  let curX = innerBox.x
  let curY = innerBox.y
  let lineSize = 0

  children.forEach(child => {
    const childNode = child
    const { Size, resolveMeasure } = require('../types')
    const { width: normW, height: normH } = Size(childNode)
    
    const size = measureNode(childNode, { maxWidth: innerBox.width, maxHeight: innerBox.height })
    let childWidth = resolveMeasure(normW, innerBox.width) ?? size.width
    let childHeight = resolveMeasure(normH, innerBox.height) ?? size.height

    if (isHorizontal) {
      if (curX + childWidth > innerBox.x + innerBox.width && curX > innerBox.x) {
        curX = innerBox.x
        curY += lineSize
        lineSize = 0
      }
      
      const childParentBox = {
        x: curX,
        y: curY,
        width: childWidth,
        height: childHeight,
        allocatedWidth: true,
        allocatedHeight: true,
      }
      solveLayout(childNode, childParentBox)

      curX += childWidth
      lineSize = Math.max(lineSize, childHeight)
    } else {
      if (curY + childHeight > innerBox.y + innerBox.height && curY > innerBox.y) {
        curY = innerBox.y
        curX += lineSize
        lineSize = 0
      }

      const childParentBox = {
        x: curX,
        y: curY,
        width: childWidth,
        height: childHeight,
        allocatedWidth: true,
        allocatedHeight: true,
      }
      solveLayout(childNode, childParentBox)

      curY += childHeight
      lineSize = Math.max(lineSize, childWidth)
    }
  })
}

const onRender = (node, grid) => {
  Box.paintBackground(grid, node)
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
