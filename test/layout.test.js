const test = require('node:test')
const assert = require('node:assert')
const { solveLayout } = require('../index')
const { ControlCompiler } = require('../lib/control')

test('Layout - solves simple vertical stacking with percentages and margins', () => {
  const rootNode = {
    id: 'root',
    width: 100,
    height: 20,
    direction: 'vertical',
    inner: [
      {
        id: 'header',
        height: 2,
        margin: { l: 2, r: 2, t: 1, b: 1 }
      },
      {
        id: 'content',
        height: '50%' // 50% of 20 = 10
      }
    ]
  }

  solveLayout(rootNode, { x: 0, y: 0, width: 100, height: 20 })

  // Assert root box
  assert.deepStrictEqual(rootNode.box, { x: 0, y: 0, width: 100, height: 20 })

  // Assert header box (applying margin/padding offsets)
  // Outer width 100 - l margin 2 - r margin 2 = 96 width
  // Outer height 2 - t margin 1 - b margin 1 = 0 height (collapsed if space is not available, let's look at offset)
  const header = rootNode.inner[0]
  assert.deepStrictEqual(header.box, { x: 2, y: 1, width: 96, height: 0 })

  // Assert content box (50% of 20 = 10 outer size)
  const content = rootNode.inner[1]
  assert.deepStrictEqual(content.box, { x: 0, y: 2, width: 100, height: 10 })
})

test('Measure Factory - normalizes measures into descriptors and resolves dimensions', () => {
  const { Measure, resolveMeasure } = require('../lib/types')

  // Absolute numbers
  const m1 = Measure(40)
  assert.deepStrictEqual(m1, { type: 'absolute', value: 40 })
  assert.strictEqual(resolveMeasure(m1, 100), 40)

  // Numeric strings
  const m2 = Measure('40')
  assert.deepStrictEqual(m2, { type: 'absolute', value: 40 })

  // Percentages as float ratios
  const m3 = Measure('50%')
  assert.deepStrictEqual(m3, { type: 'percent', value: 0.5 })
  assert.strictEqual(resolveMeasure(m3, 80), 40)

  // Keywords
  const m4 = Measure('fill')
  assert.deepStrictEqual(m4, { type: 'fill' })
  assert.strictEqual(resolveMeasure(m4, 80), null)

  const m5 = Measure('content')
  assert.deepStrictEqual(m5, { type: 'content' })

  const m6 = Measure('auto')
  assert.deepStrictEqual(m6, { type: 'auto' })

  // Idempotent pass-through
  assert.strictEqual(Measure(m3), m3)
})

test('Layout - distributes flex space to horizontal "fill" children', () => {
  const container = {
    id: 'panel',
    width: 60,
    height: 10,
    direction: 'horizontal',
    inner: [
      { id: 'fixedCol', width: 20 },
      { id: 'flexCol1', width: 'fill' },
      { id: 'flexCol2', width: 'fill' }
    ]
  }

  // Solve layout: parent bounds width=60, height=10
  // fixedCol gets width 20. Remaining space = 60 - 20 = 40.
  // flexCol1 and flexCol2 each get width 40 / 2 = 20!
  solveLayout(container, { x: 0, y: 0, width: 60, height: 10 })

  assert.deepStrictEqual(container.box, { x: 0, y: 0, width: 60, height: 10 })

  const fixed = container.inner[0]
  assert.deepStrictEqual(fixed.box, { x: 0, y: 0, width: 20, height: 10 })

  const flex1 = container.inner[1]
  assert.deepStrictEqual(flex1.box, { x: 20, y: 0, width: 20, height: 10 })

  const flex2 = container.inner[2]
  assert.deepStrictEqual(flex2.box, { x: 40, y: 0, width: 20, height: 10 })
})

test('Layout - solves absolute positions inside a canvas', () => {
  const canvasContainer = {
    id: 'myCanvas',
    type: 'canvas',
    width: 50,
    height: 15,
    inner: [
      { id: 'widget1', x: 5, y: 2, width: 10, height: 4 },
      { id: 'widget2', x: 20, y: 8, width: 15, height: 5 }
    ]
  }

  solveLayout(canvasContainer, { x: 0, y: 0, width: 50, height: 15 })

  assert.deepStrictEqual(canvasContainer.box, { x: 0, y: 0, width: 50, height: 15 })

  // widget1 absolute position relative to canvas
  const w1 = canvasContainer.inner[0]
  assert.deepStrictEqual(w1.box, { x: 5, y: 2, width: 10, height: 4 })

  // widget2 absolute position relative to canvas
  const w2 = canvasContainer.inner[1]
  assert.deepStrictEqual(w2.box, { x: 20, y: 8, width: 15, height: 5 })
})

test('Layout - solves vertical layout with explicit trailing fill spacer', () => {
  const { ControlCompiler } = require('../index')

  const rawLayout = {
    id: 'myLayout',
    type: 'layout',
    direction: 'vertical',
    width: 30,
    height: 15,
    inner: [
      { id: 'item1', height: 2 },
      { id: 'item2', height: 3 },
      { id: 'spacer', height: 'fill' }
    ]
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawLayout)

  assert.strictEqual(compiled.type, 'layout')
  assert.strictEqual(compiled.inner.length, 3)
  
  const spacer = compiled.inner[2]
  assert.strictEqual(spacer.type, 'layout')
  assert.strictEqual(spacer.height, 'fill')

  solveLayout(compiled, { x: 0, y: 0, width: 30, height: 15 })

  // Verify positions:
  // item1: height 2, y offset 0
  assert.deepStrictEqual(compiled.inner[0].box, { x: 0, y: 0, width: 30, height: 2 })
  // item2: height 3, y offset 2
  assert.deepStrictEqual(compiled.inner[1].box, { x: 0, y: 2, width: 30, height: 3 })
  // spacer: fills remaining 10 height, y offset 5
  assert.deepStrictEqual(compiled.inner[2].box, { x: 0, y: 5, width: 30, height: 10 })
})

test('Layout - solves wrap control horizontal row wrapping', () => {
  const rawNode = {
    id: 'wrapContainer',
    type: 'wrap',
    direction: 'horizontal',
    inner: [
      { id: 'w1', type: 'text', width: 10, height: 1, text: 'Item 1' },
      { id: 'w2', type: 'text', width: 12, height: 1, text: 'Item 2' },
      { id: 'w3', type: 'text', width: 10, height: 1, text: 'Item 3' },
    ],
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)
  solveLayout(compiled, { x: 0, y: 0, width: 20, height: 10 })

  // w1: x=0, y=0, w=10, h=1
  assert.deepStrictEqual(compiled.inner[0].box, { x: 0, y: 0, width: 10, height: 1 })
  // w2: w1 (10) + w2 (12) = 22 > 20 -> wraps to row 2 at x=0, y=1
  assert.deepStrictEqual(compiled.inner[1].box, { x: 0, y: 1, width: 12, height: 1 })
  // w3: row 2 currently width 12 + w3 (10) = 22 > 20 -> wraps to row 3 at x=0, y=2
  assert.deepStrictEqual(compiled.inner[2].box, { x: 0, y: 2, width: 10, height: 1 })
})

test('Layout - solves scroll offsets, contentSize, maxScroll, and auto-clamping', () => {
  const container = {
    id: 'myScroll',
    type: 'scroll',
    direction: 'v', // Orientation shorthand
    scroll: 999, // Exceeds max scroll, should clamp to maxScroll (15 - 10 = 5)
    width: 20,
    height: 10,
    inner: [
      { id: 'contentNode', type: 'text', text: 'Scrolled Content', height: 15 }
    ]
  }

  solveLayout(container, { x: 0, y: 0, width: 20, height: 10 })

  // Check content size and maxScroll metadata attached to node
  assert.deepStrictEqual(container.contentSize, { width: 16, height: 15 })
  assert.strictEqual(container.maxScroll, 5)
  assert.strictEqual(container.effectiveScroll, 5) // Clamped 999 -> 5

  // Check child box: should be shifted upwards by effectiveScroll=5 (y = -5)
  const child = container.inner[0]
  assert.deepStrictEqual(child.box, { x: 0, y: -5, width: 20, height: 15 })

  // Check child clipping viewport bounds (matches container's inner bounds)
  assert.deepStrictEqual(child.clip, { x: 0, y: 0, width: 20, height: 10 })
})

test('Layout - supports custom onLayout resolver callbacks', () => {
  const container = {
    id: 'myCustomLayout',
    width: 50,
    height: 10,
    control: {
      onMeasure: () => ({ width: 50, height: 10 }),
      onLayout: (node, innerBox) => {
        const children = Array.isArray(node.inner) ? node.inner : [node.inner]
        children.forEach((child, idx) => {
          solveLayout(child, {
            x: innerBox.x + idx * 5,
            y: innerBox.y + idx * 2,
            width: 5,
            height: 2,
            allocatedWidth: true,
            allocatedHeight: true,
          })
        })
      },
      onRender: () => {},
    },
    inner: [
      { id: 'diag1' },
      { id: 'diag2' }
    ]
  }

  solveLayout(container, { x: 0, y: 0, width: 50, height: 10 })

  // Verify custom diagonal coordinates
  assert.deepStrictEqual(container.inner[0].box, { x: 0, y: 0, width: 5, height: 2 })
  assert.deepStrictEqual(container.inner[1].box, { x: 5, y: 2, width: 5, height: 2 })
})



