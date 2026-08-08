// Canvas Layout Control
const Box = require('./box')

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  let width = 0
  let height = 0

  children.forEach(child => {
    const size = measureNode(child, constraints)
    const xOffset = child.x ?? 0
    const yOffset = child.y ?? 0
    width = Math.max(width, size.width + xOffset)
    height = Math.max(height, size.height + yOffset)
  })

  return { width, height }
}

const onLayout = (node, innerBox) => {
  const { solveLayout } = require('../layout')
  const { Size, resolveMeasure } = require('../types')
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []

  children.forEach(child => {
    const childNode = child
    const { width: normW, height: normH } = Size(childNode)
    const childParentBox = {
      x: innerBox.x + (childNode.x ?? 0),
      y: innerBox.y + (childNode.y ?? 0),
      width: resolveMeasure(normW, innerBox.width) ?? Math.max(0, innerBox.width - (childNode.x ?? 0)),
      height: resolveMeasure(normH, innerBox.height) ?? Math.max(0, innerBox.height - (childNode.y ?? 0)),
      allocatedWidth: normW.type !== 'auto',
      allocatedHeight: normH.type !== 'auto',
    }
    solveLayout(childNode, childParentBox)
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
