const test = require('node:test')
const assert = require('node:assert')
const { ControlCompiler } = require('../lib/control')
const { solveLayout } = require('../lib/layout')
const { paintNode } = require('../index')
const {
  wordBoundaryLeft,
  wordBoundaryRight,
  findLineCol,
  handleInputKey,
} = require('../lib/input-utils')

const createMockGrid = (width, height, fillChar = ' ') => {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      row.push({ char: fillChar, style: '' })
    }
    grid.push(row)
  }
  return grid
}

test('input-utils - word boundary navigation left and right', () => {
  const text = 'hello world,  test-case'

  // Moving left
  assert.strictEqual(wordBoundaryLeft(text, 23), 19) // to start of "case" (after '-')
  assert.strictEqual(wordBoundaryLeft(text, 19), 18) // to '-'
  assert.strictEqual(wordBoundaryLeft(text, 18), 14) // to start of "test"
  assert.strictEqual(wordBoundaryLeft(text, 14), 11) // to ','
  assert.strictEqual(wordBoundaryLeft(text, 11), 6)  // to start of "world"
  assert.strictEqual(wordBoundaryLeft(text, 6), 0)   // to start of "hello"
  assert.strictEqual(wordBoundaryLeft(text, 0), 0)

  // Moving right
  assert.strictEqual(wordBoundaryRight(text, 0), 6)  // to start of "world"
  assert.strictEqual(wordBoundaryRight(text, 6), 11) // to ','
  assert.strictEqual(wordBoundaryRight(text, 11), 14) // to start of "test"
  assert.strictEqual(wordBoundaryRight(text, 14), 18) // to '-'
  assert.strictEqual(wordBoundaryRight(text, 18), 19) // to "case"
  assert.strictEqual(wordBoundaryRight(text, 19), 23) // to end
  assert.strictEqual(wordBoundaryRight(text, 23), 23)
})

test('input-utils - findLineCol resolves 2D coordinates in multiline text', () => {
  const lines = ['First line', 'Second line here', 'Third']
  assert.deepStrictEqual(findLineCol(lines, 0), { row: 0, col: 0 })
  assert.deepStrictEqual(findLineCol(lines, 5), { row: 0, col: 5 })
  assert.deepStrictEqual(findLineCol(lines, 11), { row: 1, col: 0 })
  assert.deepStrictEqual(findLineCol(lines, 17), { row: 1, col: 6 })

  // Trailing newline locates cursor on empty row 1
  const trailingLines = ['Hello', '']
  assert.deepStrictEqual(findLineCol(trailingLines, 6), { row: 1, col: 0 })
})

test('input-utils - handleInputKey handles typing, cursor movements, and deletions', () => {
  const node = {
    value: 'Hello',
    cursor: 5,
  }

  let lastChangedVal = null
  node.onChange = (ctx, payload) => {
    lastChangedVal = payload.value
  }

  // Type exclamation mark
  handleInputKey(node, { key: '!', char: '!' }, null)
  assert.strictEqual(node.value, 'Hello!')
  assert.strictEqual(node.cursor, 6)
  assert.strictEqual(lastChangedVal, 'Hello!')

  // Move left
  handleInputKey(node, { key: 'left' }, null)
  assert.strictEqual(node.cursor, 5)

  // Backspace deletes 'o'
  handleInputKey(node, { key: 'backspace' }, null)
  assert.strictEqual(node.value, 'Hell!')
  assert.strictEqual(node.cursor, 4)
  assert.strictEqual(lastChangedVal, 'Hell!')

  // Home key moves cursor to start
  handleInputKey(node, { key: 'home' }, null)
  assert.strictEqual(node.cursor, 0)

  // Delete key deletes 'H'
  handleInputKey(node, { key: 'delete' }, null)
  assert.strictEqual(node.value, 'ell!')
  assert.strictEqual(node.cursor, 0)

  // End key moves to end
  handleInputKey(node, { key: 'end' }, null)
  assert.strictEqual(node.cursor, 4)

  // Shift+Enter inserts newline
  handleInputKey(node, { key: 'enter', shift: true }, null)
  assert.strictEqual(node.value, 'ell!\n')
  assert.strictEqual(node.cursor, 5)

  // Ctrl+C clears input
  handleInputKey(node, { key: 'c', ctrl: true }, null)
  assert.strictEqual(node.value, '')
  assert.strictEqual(node.cursor, 0)
})

test('input-utils - multi-line Up/Down vertical cursor navigation and pasting', () => {
  const node = {
    value: 'line 1\nline 2 longer\nline 3',
    cursor: 0,
    multiline: true,
  }

  // Paste multiline chunk
  handleInputKey(node, { key: 'paste', text: 'top\n' }, null)
  assert.ok(node.value.startsWith('top\nline 1'))

  // Up/Down navigation
  node.value = 'line one\nline two\nline three'
  node.cursor = 2 // on 'n' in 'line one' (col 2)
  handleInputKey(node, { key: 'down' }, null)
  assert.strictEqual(node.cursor, 11) // row 1, col 2 ('n' in 'line two')

  handleInputKey(node, { key: 'up' }, null)
  assert.strictEqual(node.cursor, 2)
})

test('Caret Control - renders inverted character or custom caret shapes', () => {
  const compiler = ControlCompiler()
  const caretNode = compiler.compileNode({
    type: 'caret',
    mode: 'bar',
    char: '│',
    fg: 'cyan',
  })

  solveLayout(caretNode, { x: 2, y: 1, width: 1, height: 2 })
  const grid = createMockGrid(5, 4, '.')
  paintNode(grid, caretNode)

  assert.strictEqual(grid[1][2].char, '│')
  assert.strictEqual(grid[2][2].char, '│')
})

test('Input Control - single-line rendering, placeholder, and auto-scrolling', () => {
  const compiler = ControlCompiler()

  // 1. Placeholder when empty
  const emptyInput = compiler.compileNode({
    type: 'input',
    id: 'nameInput',
    placeholder: 'Enter name...',
    width: 20,
    height: 1,
  })
  solveLayout(emptyInput, { x: 0, y: 0, width: 20, height: 1 })
  const grid1 = createMockGrid(20, 1, ' ')
  paintNode(grid1, emptyInput)
  const renderedPlaceholder = grid1[0].map(c => c.char).join('')
  assert.ok(renderedPlaceholder.startsWith('Enter name...'))

  // 2. Text value and viewport scroll
  const longInput = compiler.compileNode({
    type: 'input',
    id: 'longInput',
    value: '0123456789ABCDEF',
    cursor: 16,
    width: 10,
    height: 1,
    hasFocus: true,
  })
  solveLayout(longInput, { x: 0, y: 0, width: 10, height: 1 })
  const grid2 = createMockGrid(10, 1, ' ')
  paintNode(grid2, longInput)

  // With box width 10 and cursor 16, scrollX shifts so the end of text and caret are visible
  assert.ok(longInput.scrollX > 0)
  const lineContent = grid2[0].map(c => c.char).join('')
  assert.ok(lineContent.includes('ABCDEF'))

  // 3. Unfocused Caret rendering
  const unfocusedInput = compiler.compileNode({
    type: 'input',
    value: 'test',
    cursor: 2,
    width: 10,
    height: 1,
    hasFocus: false,
    unfocusedCaret: { bg: '#414868', fg: '#c0caf5' },
  })
  solveLayout(unfocusedInput, { x: 0, y: 0, width: 10, height: 1 })
  const grid3 = createMockGrid(10, 1, ' ')
  paintNode(grid3, unfocusedInput)
  // Cursor at index 2 ('s') should preserve the character 's' while applying the dark gray background
  assert.strictEqual(grid3[0][2].char, 's')
  assert.ok(grid3[0][2].style.includes('48;2;65;72;104'))
})

test('Input Control - formatting callback renders styled spans', () => {
  const compiler = ControlCompiler()
  const customInput = compiler.compileNode({
    type: 'input',
    value: 'bold normal',
    width: 20,
    height: 1,
    format: (text) => [
      { text: 'bold', bold: true, fg: 'yellow' },
      { text: ' normal', fg: 'white' },
    ],
  })

  solveLayout(customInput, { x: 0, y: 0, width: 20, height: 1 })
  const grid = createMockGrid(20, 1, ' ')
  paintNode(grid, customInput)

  // 'bold' characters have bold style
  assert.ok(grid[0][0].style.includes('\x1b[1m'))
  // ' ' and 'normal' characters have standard/white style
  assert.strictEqual(grid[0][4].char, ' ')
})

test('Input Control - Tui application integration with focus and live typing', async () => {
  const { Readable, Writable } = require('node:stream')
  const { Tui } = require('../index')

  const stdin = new Readable({ read() {} })
  stdin.isTTY = true
  stdin.setRawMode = () => {}

  const stdout = new Writable({
    write(chunk, enc, cb) {
      this.data = (this.data || '') + chunk.toString()
      if (cb) cb()
    }
  })
  stdout.columns = 80
  stdout.rows = 24

  let submittedText = null

  const view = {
    type: 'layout',
    id: 'root',
    inner: [
      {
        type: 'input',
        id: 'msgInput',
        value: '',
        placeholder: 'Say something...',
        onSubmit: (ctx, payload) => {
          submittedText = payload.value
        }
      }
    ]
  }

  const app = Tui({ view, stdin, stdout, truecolor: false })
  app.start()

  await new Promise(r => setImmediate(r))

  // Auto-focuses the input control
  assert.strictEqual(app.ctx.focusedId, 'msgInput')

  // Type "Hi"
  stdin.emit('keypress', 'H', { name: 'h' })
  stdin.emit('keypress', 'i', { name: 'i' })

  // Press enter to submit
  stdin.emit('keypress', '\r', { name: 'enter' })

  assert.strictEqual(submittedText, 'Hi')
  assert.strictEqual(app.ctx.elementById('msgInput').value, '')

  app.stop()
})
