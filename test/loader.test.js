const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { LoaderFactory } = require('../index')

test('Loader - parses standard YAML structures and multiline literals', () => {
  const mockFiles = {
    [path.resolve('/app/ui.yaml')]: `
main:
  id: root
  title: Example TUI
  class: [base]
  margin: { t: 1, b: 1, l: 2, r: 2 }
  inlineArray: [one, two, three]
  inlineObject: { key: value, nested: [1, 2] }
  multilineBlock: |
    Line 1 of content
    Line 2 of content
  unquotedString: This is a beautiful unquoted string with no wraps
`
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error(`ENOENT: ${abs}`)
      return mockFiles[abs]
    },
    requireModule: () => {
      return {}
    }
  })

  const result = loader.loadFile('/app/ui.yaml')

  assert.ok(result.main)
  assert.strictEqual(result.main.id, 'root')
  assert.strictEqual(result.main.title, 'Example TUI')
  assert.deepStrictEqual(result.main.class, ['base'])
  assert.deepStrictEqual(result.main.margin, { t: 1, b: 1, l: 2, r: 2 })
  assert.deepStrictEqual(result.main.inlineArray, ['one', 'two', 'three'])
  assert.deepStrictEqual(result.main.inlineObject, { key: 'value', nested: [1, 2] })
  assert.strictEqual(result.main.multilineBlock, 'Line 1 of content\nLine 2 of content\n')
  assert.strictEqual(result.main.unquotedString, 'This is a beautiful unquoted string with no wraps')
})

test('Loader - resolves JS references using the "@" interception protocol', () => {
  const mockFiles = {
    [path.resolve('/app/main.yaml')]: `
main:
  id: myApp
  beforeRendered: '@controllers/main.js:onRender'
  classes:
    bg:
      - '@controllers/theme.js:getSidebarBg'
      - 'blue'
`
  }

  const dummyOnRender = () => 'rendered!'
  const dummyGetSidebarBg = () => '#1a1b26'

  const mockModules = {
    [path.resolve('/app/controllers/main.js')]: {
      onRender: dummyOnRender
    },
    [path.resolve('/app/controllers/theme.js')]: {
      getSidebarBg: dummyGetSidebarBg
    }
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error(`ENOENT: ${abs}`)
      return mockFiles[abs]
    },
    requireModule: (modulePath) => {
      const abs = path.resolve(modulePath)
      if (!mockModules[abs]) throw new Error(`Cannot find module: ${abs}`)
      return mockModules[abs]
    }
  })

  const result = loader.loadFile('/app/main.yaml')

  // Verify the JS references were resolved into actual function pointers!
  assert.strictEqual(result.main.beforeRendered, dummyOnRender)
  assert.strictEqual(result.main.beforeRendered(), 'rendered!')

  assert.deepStrictEqual(result.main.classes.bg, [
    dummyGetSidebarBg,
    'blue'
  ])
  assert.strictEqual(result.main.classes.bg[0](), '#1a1b26')
})

test('Loader - throws clear, descriptive errors for invalid JS reference format', () => {
  const mockFiles = {
    [path.resolve('/app/invalid-ref.yaml')]: `
main:
  onClick: '@actions.js' # missing colon and export
`
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => mockFiles[path.resolve(filePath)],
    requireModule: () => ({})
  })

  assert.throws(() => {
    loader.loadFile('/app/invalid-ref.yaml')
  }, /Invalid JS reference: "@actions.js". Expected format: "@filename.js:exportName"/)
})

test('Loader - throws error when referenced export is missing from module', () => {
  const mockFiles = {
    [path.resolve('/app/missing-export.yaml')]: `
main:
  onClick: '@actions.js:nonExistentAction'
`
  }

  const mockModules = {
    [path.resolve('/app/actions.js')]: {
      someOtherAction: () => {}
    }
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => mockFiles[path.resolve(filePath)],
    requireModule: (modulePath) => mockModules[path.resolve(modulePath)]
  })

  assert.throws(() => {
    loader.loadFile('/app/missing-export.yaml')
  }, /Export "nonExistentAction" not found in module/)
})

test('Loader - handles recursive Method 2 templates blocks, aliasing and namespacing', () => {
  const mockFiles = {
    [path.resolve('/app/dashboard.yaml')]: `
templates:
  '@controls/form.yaml':
    - checkbox
    - textbox: textentry
  '@controls/spinner.yaml:classes': '*'
  spinnerGroup: '@controls/spinner.yaml' # Namespace entire file

main:
  type: layout
  inner:
    - type: textentry
      text: "Input field"
    - type: checkbox
      checked: true
    - type: barSpinner
      speed: 10
    - type: spinnerGroup.circleSpinner
      size: 5
`,
    [path.resolve('/app/controls/form.yaml')]: `
classes:
  checkbox:
    type: border
    text: "[x]"
  textbox:
    type: border
    text: "___"
`,
    [path.resolve('/app/controls/spinner.yaml')]: `
classes:
  barSpinner:
    type: text
    text: "---"
  circleSpinner:
    type: text
    text: "ooo"
`
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error(`ENOENT: ${abs}`)
      return mockFiles[abs]
    },
    requireModule: () => ({})
  })

  const result = loader.loadFile('/app/dashboard.yaml')

  // Verify that templates contains the imported, resolved, and merged templates
  assert.ok(result.templates)
  
  // 1. Selective imports (checkbox and aliased textbox -> textentry)
  assert.deepStrictEqual(result.templates.checkbox, { type: 'border', text: '[x]' })
  assert.deepStrictEqual(result.templates.textentry, { type: 'border', text: '___' })

  // 2. Star import (*) from spinner
  assert.deepStrictEqual(result.templates.barSpinner, { type: 'text', text: '---' })
  assert.deepStrictEqual(result.templates.circleSpinner, { type: 'text', text: 'ooo' })

  // 3. Namespace entire file under "spinnerGroup"
  assert.deepStrictEqual(result.templates.spinnerGroup, {
    classes: {
      barSpinner: { type: 'text', text: '---' },
      circleSpinner: { type: 'text', text: 'ooo' }
    }
  })
})

test('Loader - supports inline YAML references and recursive loading', () => {
  const mockFiles = {
    [path.resolve('/app/main.yaml')]: `
main:
  type: layout
  inner:
    - type: '@controls/button.yaml:primaryButton'
      text: 'Click me'
`,
    [path.resolve('/app/controls/button.yaml')]: `
classes:
  primaryButton:
    type: border
    bg: blue
    fg: white
`
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error(`ENOENT: ${abs}`)
      return mockFiles[abs]
    },
    requireModule: () => ({})
  })

  const result = loader.loadFile('/app/main.yaml')

  // The inline type reference should have been compiled directly into the returned JS tree!
  assert.strictEqual(result.main.inner[0].type.type, 'border')
  assert.strictEqual(result.main.inner[0].type.bg, 'blue')
  assert.strictEqual(result.main.inner[0].type.fg, 'white')
})

test('Loader - resolves $ function invocations with arguments', () => {
  const mockFiles = {
    [path.resolve('/app/main.yaml')]: `
main:
  type: layout
  templates:
    conversation:
      type: text
  inner:
    "$items.js:generateItems":
      type: conversation
      selected: activeStyle
      count: 2
`
  }

  const mockItems = {
    generateItems: (ctx, args) => {
      const { type, selected, count } = args
      return Array.from({ length: count }, (_, i) => ({
        type,
        class: i === 0 ? [selected] : [],
        text: 'Item ' + (i + 1),
      }))
    }
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error('ENOENT: ' + abs)
      return mockFiles[abs]
    },
    requireModule: (filePath) => {
      if (filePath.includes('items.js')) return mockItems
      return {}
    }
  })

  const rawTree = loader.loadFile('/app/main.yaml')
  assert.strictEqual(typeof rawTree.main.inner, 'function')

  const { ControlCompiler } = require('../lib/control')
  const compiler = ControlCompiler()
  const compiledTree = compiler.compileNode(rawTree.main)

  assert.strictEqual(compiledTree.inner.length, 2)
  assert.strictEqual(compiledTree.inner[0].type, 'text')
  assert.deepStrictEqual(compiledTree.inner[0].class, ['activeStyle'])
  assert.strictEqual(compiledTree.inner[0].text, 'Item 1')
  assert.strictEqual(compiledTree.inner[1].text, 'Item 2')
})

test('Loader - handles inline layout fragment spreading and array flat-mapping', () => {
  const mockFiles = {
    [path.resolve('/app/main.yaml')]: `
main:
  type: layout
  inner:
    - '@controls/header.yaml' # Embed single element
    - '@controls/buttons.yaml': '*' # Spread array of child elements
    - type: text
      text: 'Footer'
`,
    [path.resolve('/app/controls/header.yaml')]: `
type: text
text: 'Hello Title'
`,
    [path.resolve('/app/controls/buttons.yaml')]: `
- type: border
  text: 'Button A'
- type: border
  text: 'Button B'
`
  }

  const loader = LoaderFactory({
    readFileSync: (filePath) => {
      const abs = path.resolve(filePath)
      if (!mockFiles[abs]) throw new Error(`ENOENT: ${abs}`)
      return mockFiles[abs]
    },
    requireModule: () => ({})
  })

  const result = loader.loadFile('/app/main.yaml')

  // The inner array should have been flattened!
  // Sibling layout array count should be: 1 (header) + 2 (buttons) + 1 (footer) = 4 elements!
  assert.ok(result.main.inner)
  assert.strictEqual(result.main.inner.length, 4)
  assert.strictEqual(result.main.inner[0].type, 'text')
  assert.strictEqual(result.main.inner[0].text, 'Hello Title')
  assert.strictEqual(result.main.inner[1].text, 'Button A')
  assert.strictEqual(result.main.inner[2].text, 'Button B')
  assert.strictEqual(result.main.inner[3].text, 'Footer')
})
