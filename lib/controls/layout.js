// Flow Layout Control
const Box = require('./box')

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  const direction = node.direction || 'vertical'
  let width = 0
  let height = 0

  children.forEach(child => {
    const size = measureNode(child, constraints)
    if (direction === 'horizontal') {
      width += size.width
      height = Math.max(height, size.height)
    } else {
      width = Math.max(width, size.width)
      height += size.height
    }
  })

  return { width, height }
}

const onLayout = (node, innerBox) => {
  const { solveLayout, measureNode } = require('../layout')
  const { Measure, resolveMeasure } = require('../types')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  const direction = node.direction || 'vertical'

  const totalLimit = direction === 'horizontal' ? innerBox.width : innerBox.height
  let allocatedSum = 0
  let fillCount = 0

  const measuredChildren = children.map(child => {
    const childNode = child
    const sizeProp = direction === 'horizontal' ? childNode.width : childNode.height
    const normProp = Measure(sizeProp)
    
    let size = resolveMeasure(normProp, totalLimit)
    if (size === null) {
      if (normProp.type === 'fill') {
        fillCount++
      } else if (normProp.type === 'auto' || normProp.type === 'content') {
        if (direction === 'vertical') {
          const childWidth = resolveMeasure(childNode.width, innerBox.width) ?? innerBox.width
          const childSize = measureNode(childNode, { maxWidth: childWidth, maxHeight: innerBox.height })
          size = Math.max(1, childSize.height)
          allocatedSum += size
        } else {
          const childHeight = resolveMeasure(childNode.height, innerBox.height) ?? innerBox.height
          const childSize = measureNode(childNode, { maxWidth: innerBox.width, maxHeight: childHeight })
          size = Math.max(1, childSize.width)
          allocatedSum += size
        }
      } else {
        size = 0
      }
    } else {
      allocatedSum += size
    }

    return { node: childNode, size }
  })

  const remainingSpace = Math.max(0, totalLimit - allocatedSum)
  const fillBlockSize = fillCount > 0 ? Math.floor(remainingSpace / fillCount) : 0

  let currentOffset = direction === 'horizontal' ? innerBox.x : innerBox.y

  measuredChildren.forEach(item => {
    const childNode = item.node
    const allocatedSize = item.size !== null ? item.size : fillBlockSize

    const childParentBox = {
      x: direction === 'horizontal' ? currentOffset : innerBox.x,
      y: direction === 'vertical' ? currentOffset : innerBox.y,
      width: direction === 'horizontal' ? allocatedSize : innerBox.width,
      height: direction === 'vertical' ? allocatedSize : innerBox.height,
      allocatedWidth: direction === 'horizontal',
      allocatedHeight: direction === 'vertical',
    }

    solveLayout(childNode, childParentBox)
    currentOffset += allocatedSize
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
