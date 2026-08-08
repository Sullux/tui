const test = require('node:test')
const assert = require('node:assert')
const { ControlCompiler } = require('../index')
const { Margin } = require('../lib/types')
const { compileAnsiStyle } = require('../lib/ansi-style')

test('ControlCompiler - normalizes raw nodes with merged classes, shorthands and capabilities', () => {
  const classesMap = {
    card: {
      bg: ['#1a1b26', 'blue'],
      fg: 'white',
      padding: { v: 1 }
    }
  }

  const rawNode = {
    id: 'myCard',
    class: 'card',
    margin: { all: 2 },
    wrap: true,
    halign: 'center',
    text: 'Functional TUI Design',
    inner: [
      { id: 'childText', fg: ['#ff9e64', 'yellow'], text: 'Nested node' }
    ]
  }

  // Compile with Truecolor support
  const compiler = ControlCompiler({ truecolor: true }, classesMap)
  const compiled = compiler.compileNode(rawNode)

  // Assert basic and specific attributes
  assert.strictEqual(compiled.id, 'myCard')
  assert.strictEqual(compiled.wrap, true)
  assert.strictEqual(compiled.halign, 'center')
  assert.strictEqual(compiled.text, 'Functional TUI Design')

  // Assert compiled styles are passed through unmodified (to be resolved at render time)
  assert.deepStrictEqual(compiled.bg, ['#1a1b26', 'blue']) // From class "card"
  assert.strictEqual(compiled.fg, 'white')                 // From class "card"
  assert.deepStrictEqual(compiled.padding, { v: 1 })        // Copied directly from class
  assert.deepStrictEqual(compiled.margin, { all: 2 })        // Copied directly from rawNode

  // Assert Margin / padding types expand shorthands correctly at resolve time
  assert.deepStrictEqual(Margin(compiled.padding), { t: 1, b: 1, l: 0, r: 0 })
  assert.deepStrictEqual(Margin(compiled.margin), { t: 2, b: 2, l: 2, r: 2 })

  // Assert recursive compilation of inner child
  assert.ok(compiled.inner)
  assert.strictEqual(compiled.inner.length, 1)
  assert.strictEqual(compiled.inner[0].id, 'childText')
  assert.deepStrictEqual(compiled.inner[0].fg, ['#ff9e64', 'yellow'])
  assert.strictEqual(compiled.inner[0].text, 'Nested node')
})

test('ControlCompiler - handles standard 16-color ANSI fallback overrides', () => {
  const classesMap = {
    alert: {
      bg: ['#ff2400', 'red'],
      fg: 'white'
    }
  }

  const rawNode = {
    id: 'box',
    class: 'alert'
  }

  // Compile with standard non-Truecolor terminal capabilities
  const compiler = ControlCompiler({ truecolor: false }, classesMap)
  const compiled = compiler.compileNode(rawNode)

  // Slices truecolor hex and resolves on-the-fly during active paint styling checks
  assert.deepStrictEqual(compiled.bg, ['#ff2400', 'red'])
  assert.strictEqual(compiled.fg, 'white')

  const styleNonTruecolor = compileAnsiStyle(compiled, { truecolor: false })
  assert.ok(styleNonTruecolor.includes('41m')) // Contains red background code

  const styleTruecolor = compileAnsiStyle(compiled, { truecolor: true })
  assert.ok(styleTruecolor.includes('48;2;255;36;0m')) // Contains RGB truecolor code
})

test('ControlCompiler - evaluates dynamic function-valued properties on compilation', () => {
  let activeText = 'Draft Content'
  let activeHeight = 5

  const rawNode = {
    id: 'dynamicInput',
    type: 'text',
    text: () => activeText,
    height: () => activeHeight,
    onKey: () => 'do-nothing' // Event handlers should remain functions, NOT be evaluated!
  }

  const compiler = ControlCompiler()
  
  // 1. Initial compilation
  const compiled1 = compiler.compileNode(rawNode)
  assert.strictEqual(compiled1.text, 'Draft Content')
  assert.strictEqual(compiled1.height, 5)
  assert.strictEqual(typeof compiled1.onKey, 'function') // Retained as callback

  // 2. Change state and recompile
  activeText = 'Updated Draft'
  activeHeight = 10
  
  const compiled2 = compiler.compileNode(rawNode)
  assert.strictEqual(compiled2.text, 'Updated Draft')
  assert.strictEqual(compiled2.height, 10)
  assert.strictEqual(typeof compiled2.onKey, 'function') // Still function callback
})

test('ControlCompiler - handles nested classes scoping and deep merging templates', () => {
  const classesMap = {
    card: {
      type: 'border',
      padding: 1,
      style: {
        theme: 'dark'
      }
    }
  }

  const rawNode = {
    type: 'layout',
    classes: {
      fancyCard: {
        class: 'card',
        bg: 'blue',
        style: {
          sub: 'fancy'
        }
      }
    },
    inner: [
      {
        id: 'childNode',
        class: 'fancyCard',
        text: 'Hello fancy'
      }
    ]
  }

  const compiler = ControlCompiler({ truecolor: true }, classesMap)
  const compiled = compiler.compileNode(rawNode)

  assert.ok(compiled.inner)
  const child = compiled.inner[0]

  // Should have compiled class: card (border, theme: dark) -> class: fancyCard (blue, sub: fancy)
  assert.strictEqual(child.type, 'border')
  assert.strictEqual(child.bg, 'blue')
  assert.deepStrictEqual(Margin(child.padding), { t: 1, b: 1, l: 1, r: 1 })
  assert.deepStrictEqual(child.style, { theme: 'dark', sub: 'fancy' })
  assert.strictEqual(child.text, 'Hello fancy')
})

test('ControlCompiler - resolves walk-up local property references', () => {
  const rawNode = {
    type: 'layout',
    style: {
      primary: '#7aa2f7',
      paddingVal: 3
    },
    inner: [
      {
        id: 'child1',
        type: 'text',
        fg: ':style.primary',
        padding: ':style.paddingVal',
        text: 'Hello'
      }
    ]
  }

  const compiler = ControlCompiler({ truecolor: true })
  const compiled = compiler.compileNode(rawNode)

  const child = compiled.inner[0]
  assert.strictEqual(child.fg, '#7aa2f7')
  assert.deepStrictEqual(Margin(child.padding), { t: 3, b: 3, l: 3, r: 3 })
})

test('ControlCompiler - registers custom layouts and attaches custom solvers/renderers', () => {
  const customSolver = () => {}
  const customPainter = () => {}
  const customLayouts = {
    myWidget: {
      onLayout: customSolver,
      onRender: customPainter
    }
  }

  const rawNode = {
    id: 'widgetNode',
    type: 'myWidget',
    text: 'custom'
  }

  const compiler = ControlCompiler({ truecolor: true }, {}, customLayouts)
  const compiled = compiler.compileNode(rawNode)

  assert.strictEqual(compiled.type, 'myWidget')
  assert.strictEqual(compiled.control.onLayout, customSolver)
  assert.strictEqual(compiled.control.onRender, customPainter)
})

test('ControlCompiler - handles unknown type gracefully with fallback text control', () => {
  const rawNode = {
    id: 'unknownNode',
    type: 'nonExistentType'
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)

  assert.strictEqual(compiled.type, 'nonExistentType')
  assert.ok(compiled.control)
  assert.strictEqual(compiled.text, "Error: layout type 'nonExistentType' not found")
})

test('ControlCompiler - parses isVisible visibility switch', () => {
  const rawNode = {
    id: 'visibleNode',
    isVisible: false
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)

  assert.strictEqual(compiled.isVisible, false)
})

test('ControlCompiler - resolves walk-up local reference class definitions', () => {
  const rawNode = {
    type: 'layout',
    classes: {
      indigo: { bg: '#8899FF', fg: '#000000' },
      active: ':classes.indigo',
    },
    inner: [
      {
        id: 'child1',
        type: 'text',
        class: ':classes.indigo',
        text: 'Direct colon ref',
      },
      {
        id: 'child2',
        type: 'text',
        class: 'active',
        text: 'Indirect colon ref',
      },
    ],
  }

  const compiler = ControlCompiler({ truecolor: true })
  const compiled = compiler.compileNode(rawNode)

  const child1 = compiled.inner[0]
  assert.strictEqual(child1.bg, '#8899FF')
  assert.strictEqual(child1.fg, '#000000')

  const child2 = compiled.inner[1]
  assert.strictEqual(child2.bg, '#8899FF')
  assert.strictEqual(child2.fg, '#000000')
})
