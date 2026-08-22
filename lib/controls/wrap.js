// Wrap Layout Control (WrapPanel)
const Box = require('./box')

const getChildren = (node) => {
  if (!node.inner) return []
  return Array.isArray(node.inner) ? node.inner : [node.inner]
}

const onMeasure = (node, constraints) => {
  const { measureNode } = require('../layout')
  const children = getChildren(node)
  const direction = node.direction || 'horizontal'
  const maxWidth = constraints.maxWidth || Infinity
  const maxHeight = constraints.maxHeight || Infinity

  if (children.length === 0) {
    return { width: 0, height: 0 }
  }

  if (direction === 'horizontal') {
    let curX = 0
    let curY = 0
    let curRowHeight = 0
    let maxRowWidth = 0

    children.forEach(child => {
      const childSize = measureNode(child, { maxWidth, maxHeight })
      const itemW = childSize.width
      const itemH = childSize.height

      if (curX + itemW > maxWidth && curX > 0) {
        maxRowWidth = Math.max(maxRowWidth, curX)
        curY += curRowHeight
        curX = 0
        curRowHeight = 0
      }

      curX += itemW
      curRowHeight = Math.max(curRowHeight, itemH)
      maxRowWidth = Math.max(maxRowWidth, curX)
    })

    const totalHeight = curY + curRowHeight
    return { width: maxRowWidth, height: totalHeight }
  } else {
    let curX = 0
    let curY = 0
    let curColWidth = 0
    let maxColHeight = 0

    children.forEach(child => {
      const childSize = measureNode(child, { maxWidth, maxHeight })
      const itemW = childSize.width
      const itemH = childSize.height

      if (curY + itemH > maxHeight && curY > 0) {
        maxColHeight = Math.max(maxColHeight, curY)
        curX += curColWidth
        curY = 0
        curColWidth = 0
      }

      curY += itemH
      curColWidth = Math.max(curColWidth, itemW)
      maxColHeight = Math.max(maxColHeight, curY)
    })

    const totalWidth = curX + curColWidth
    return { width: totalWidth, height: maxColHeight }
  }
}

const onLayout = (node, innerBox) => {
  const { solveLayout, measureNode } = require('../layout')
  const children = getChildren(node)
  const direction = node.direction || 'horizontal'

  if (children.length === 0) return

  if (direction === 'horizontal') {
    const rows = []
    let currentRow = { items: [], width: 0, height: 0 }

    children.forEach(child => {
      const childSize = measureNode(child, { maxWidth: innerBox.width, maxHeight: innerBox.height })
      const w = childSize.width
      const h = childSize.height

      if (currentRow.items.length > 0 && currentRow.width + w > innerBox.width) {
        rows.push(currentRow)
        currentRow = { items: [], width: 0, height: 0 }
      }

      currentRow.items.push({ child, width: w, height: h })
      currentRow.width += w
      currentRow.height = Math.max(currentRow.height, h)
    })

    if (currentRow.items.length > 0) {
      rows.push(currentRow)
    }

    let curY = innerBox.y

    rows.forEach(row => {
      let curX = innerBox.x

      row.items.forEach(item => {
        const childBox = {
          x: curX,
          y: curY,
          width: item.width,
          height: item.height,
        }
        solveLayout(item.child, childBox)
        curX += item.width
      })

      curY += row.height
    })
  } else {
    const cols = []
    let currentCol = { items: [], width: 0, height: 0 }

    children.forEach(child => {
      const childSize = measureNode(child, { maxWidth: innerBox.width, maxHeight: innerBox.height })
      const w = childSize.width
      const h = childSize.height

      if (currentCol.items.length > 0 && currentCol.height + h > innerBox.height) {
        cols.push(currentCol)
        currentCol = { items: [], width: 0, height: 0 }
      }

      currentCol.items.push({ child, width: w, height: h })
      currentCol.height += h
      currentCol.width = Math.max(currentCol.width, w)
    })

    if (currentCol.items.length > 0) {
      cols.push(currentCol)
    }

    let curX = innerBox.x

    cols.forEach(col => {
      let curY = innerBox.y

      col.items.forEach(item => {
        const childBox = {
          x: curX,
          y: curY,
          width: item.width,
          height: item.height,
        }
        solveLayout(item.child, childBox)
        curY += item.height
      })

      curX += col.width
    })
  }
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
