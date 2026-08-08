// Functional Layout Coordinator for terminal grid structures
const { resolveDimension } = require('./layout-geometry') // Maintain compatibility with test suites
const { Size, Margin, resolveMeasure } = require('./types')

const defaultControls = {
  layout: require('./controls/layout'),
  canvas: require('./controls/canvas'),
  scroll: require('./controls/scroll'),
  stack: require('./controls/stack'),
  text: require('./controls/text'),
  rich: require('./controls/rich'),
  border: require('./controls/border'),
  image: require('./controls/image'),
}

const getControl = (node) => {
  return node.control || defaultControls[node.type || 'layout'] || defaultControls.layout
}

const measureNode = (node, constraints) => {
  if (node.isVisible === false) return { width: 0, height: 0 }

  const margin = Margin(node.margin)
  const padding = Margin(node.padding)

  const innerConstraints = {
    maxWidth: Math.max(0, constraints.maxWidth - margin.l - margin.r - padding.l - padding.r),
    maxHeight: Math.max(0, constraints.maxHeight - margin.t - margin.b - padding.t - padding.b),
  }

  const { width: normW, height: normH } = Size(node)
  let width = resolveMeasure(normW, constraints.maxWidth)
  let height = resolveMeasure(normH, constraints.maxHeight)

  if (width === null || height === null || normW.type === 'content' || normH.type === 'content') {
    const ctrl = getControl(node)
    const ctrlSize = ctrl.onMeasure(node, innerConstraints)
    if (width === null || normW.type === 'content') width = ctrlSize.width
    if (height === null || normH.type === 'content') height = ctrlSize.height
  }

  return {
    width: Math.min(constraints.maxWidth, width + padding.l + padding.r + margin.l + margin.r),
    height: Math.min(constraints.maxHeight, height + padding.t + padding.b + margin.t + margin.b),
  }
}

const solveLayout = (node, parentBox = { x: 0, y: 0, width: 80, height: 24 }) => {
  if (node.isVisible === false) {
    node.box = { x: 0, y: 0, width: 0, height: 0 }
    return node
  }

  const margin = Margin(node.margin)
  const padding = Margin(node.padding)

  const { width: normW, height: normH } = Size(node)
  const outerWidth = parentBox.allocatedWidth ? parentBox.width : (resolveMeasure(normW, parentBox.width) ?? parentBox.width)
  const outerHeight = parentBox.allocatedHeight ? parentBox.height : (resolveMeasure(normH, parentBox.height) ?? parentBox.height)

  const width = Math.min(outerWidth, parentBox.width)
  const height = Math.min(outerHeight, parentBox.height)

  const x = parentBox.x + margin.l
  const y = parentBox.y + margin.t

  const box = {
    x,
    y,
    width: Math.max(0, width - margin.l - margin.r),
    height: Math.max(0, height - margin.t - margin.b),
  }

  node.box = box
  node.padding = padding

  const innerBox = {
    x: box.x + padding.l,
    y: box.y + padding.t,
    width: Math.max(0, box.width - padding.l - padding.r),
    height: Math.max(0, box.height - padding.t - padding.b),
  }

  const ctrl = getControl(node)
  if (ctrl && typeof ctrl.onLayout === 'function') {
    ctrl.onLayout(node, innerBox)
  }

  return node
}

module.exports = {
  resolveDimension,
  measureNode,
  solveLayout,
}
