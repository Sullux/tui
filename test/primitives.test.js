const test = require('node:test')
const assert = require('node:assert')
const { ControlCompiler, solveLayout, paintNode } = require('../index')

// Helper to create a blank mock grid
const createMockGrid = (width, height, fillChar = ' ') => {
  const grid = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      row.push({ char: fillChar, style: '\x1b[0m' })
    }
    grid.push(row)
  }
  return grid
}

test('Primitives - paints aligned and wrapped Text with backgrounds', () => {
  const rawNode = {
    id: 'textBlock',
    type: 'text',
    text: 'Sullux\nTUI',
    bg: 'blue',
    fg: 'white',
    width: 10,
    height: 4,
    halign: 'center',
    valign: 'center'
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)
  solveLayout(compiled, { x: 0, y: 0, width: 10, height: 4 })

  const grid = createMockGrid(10, 4, '.')
  paintNode(grid, compiled)

  // Expected grid outcomes:
  // - Top and bottom rows should be background padded spaces since vertical alignment is "center"
  // - Row 1 should contain "  Sullux  " (centered)
  // - Row 2 should contain "   TUI    " (centered)
  // - Cells should have blue bg and white fg style escape: \x1b[0m\x1b[37m\x1b[44m

  const style = '\x1b[0m\x1b[37m\x1b[44m'
  
  // Row 0: spaces
  assert.deepStrictEqual(grid[0].slice(0, 10), Array(10).fill({ char: ' ', style }))
  
  // Row 1: "  Sullux  "
  const row1Chars = grid[1].slice(0, 10).map(c => c.char).join('')
  assert.strictEqual(row1Chars, '  Sullux  ')
  assert.strictEqual(grid[1][2].style, style)

  // Row 2: "   TUI    "
  const row2Chars = grid[2].slice(0, 10).map(c => c.char).join('')
  assert.strictEqual(row2Chars, '   TUI    ')
  assert.strictEqual(grid[2][3].style, style)
})

test('Primitives - paints Border frames and nests children inside auto-padding', () => {
  const rawNode = {
    id: 'frame',
    type: 'border',
    width: 6,
    height: 4,
    fg: 'green',
    inner: [
      { id: 'innerMsg', type: 'text', text: 'Ok', fg: 'yellow' }
    ]
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)

  solveLayout(compiled, { x: 0, y: 0, width: 6, height: 4 })
  
  const grid = createMockGrid(6, 4, '.')
  paintNode(grid, compiled)

  // Expected Border output characters:
  // Row 0: ╭ ── ╮
  // Row 1: │ Ok │
  // Row 2: │    │
  // Row 3: ╰ ── ╯

  const borderStyle = '\x1b[0m\x1b[32m'
  const textStyle = '\x1b[0m\x1b[33m'

  // Corners and lines check
  assert.deepStrictEqual(grid[0][0], { char: '╭', style: borderStyle })
  assert.deepStrictEqual(grid[0][5], { char: '╮', style: borderStyle })
  assert.deepStrictEqual(grid[0][2], { char: '─', style: borderStyle })

  // Left and right vertical borders
  assert.deepStrictEqual(grid[1][0], { char: '│', style: borderStyle })
  assert.deepStrictEqual(grid[1][5], { char: '│', style: borderStyle })

  // Inner nested text checks (positioned at offset x=1, y=1 because of border padding!)
  assert.deepStrictEqual(grid[1][1], { char: 'O', style: textStyle })
  assert.deepStrictEqual(grid[1][2], { char: 'k', style: textStyle })

  // Bottom corner check
  assert.deepStrictEqual(grid[3][0], { char: '╰', style: borderStyle })
  assert.deepStrictEqual(grid[3][5], { char: '╯', style: borderStyle })
})

test('Primitives - paints GPU-cached Image sequences and reserves spacing', () => {
  const rawNode = {
    id: 'graphics',
    type: 'image',
    width: 3,
    height: 2,
    imageSequence: '\x1b_Gi=123;base64...\x1b\\'
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)
  solveLayout(compiled, { x: 0, y: 0, width: 3, height: 2 })

  const grid = createMockGrid(3, 2, '.')
  paintNode(grid, compiled)

  // Expected outcome:
  // - Top-left cell contains the full atomic escape sequence
  // - Other cells of the 3x2 box are space-padded to ensure no background text shows through
  assert.strictEqual(grid[0][0].char, '\x1b_Gi=123;base64...\x1b\\')
  assert.strictEqual(grid[0][1].char, ' ')
  assert.strictEqual(grid[0][2].char, ' ')
  assert.strictEqual(grid[1][0].char, ' ')
  assert.strictEqual(grid[1][1].char, ' ')
  assert.strictEqual(grid[1][2].char, ' ')
})

test('Primitives - tokenizes inline rich text spans into words, spaces and newlines', () => {
  const { tokenizeSpans } = require('../lib/controls/rich')

  const spans = [
    { text: 'Hello  world\n' },
    { text: 'Sullux', bold: true }
  ]

  const tokens = tokenizeSpans(spans, { bg: 'blue' })

  assert.strictEqual(tokens.length, 5)
  assert.strictEqual(tokens[0].text, 'Hello')
  assert.strictEqual(tokens[1].text, '  ')
  assert.strictEqual(tokens[2].text, 'world')
  assert.strictEqual(tokens[3].type, 'newline')
  assert.strictEqual(tokens[4].text, 'Sullux')
  assert.strictEqual(tokens[4].span.bold, true)
  assert.strictEqual(tokens[4].span.bg, 'blue') // inherited
})

test('Primitives - paints styled wrapping rich text flow with inherited parent traits', () => {
  const rawNode = {
    id: 'richPara',
    type: 'rich',
    width: 15,
    height: 3,
    bg: 'blue',
    inner: [
      { text: 'This is a red word ', fg: 'red' },
      { text: 'and green!', fg: 'green', bold: true }
    ]
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)
  solveLayout(compiled, { x: 0, y: 0, width: 15, height: 3 })

  const grid = createMockGrid(15, 3, '.')
  paintNode(grid, compiled)

  // Expected wrap at width 15:
  // - Line 0: "This is a red  " (Red text style: \x1b[0m\x1b[31m\x1b[44m)
  // - Line 1: "word and green!" (Style switches mid-line to green bold at index 9: \x1b[0m\x1b[1m\x1b[32m\x1b[44m)

  const redStyle = '\x1b[0m\x1b[31m\x1b[44m'
  const greenStyle = '\x1b[0m\x1b[1m\x1b[32m\x1b[44m'

  // Assert line 0 text and style
  const line0 = grid[0].map(c => c.char).join('')
  assert.ok(line0.startsWith('This is a red'))
  assert.strictEqual(grid[0][0].style, redStyle)

  // Assert line 1 text and style switching
  const line1 = grid[1].map(c => c.char).join('')
  assert.strictEqual(line1, 'word and green!')
  assert.strictEqual(grid[1][0].style, redStyle)   // "word and "
  assert.strictEqual(grid[1][9].style, greenStyle) // "green!" (starts at index 9)
})

test('Primitives - compiles inline SVG with variable substitution and rsvg-convert', () => {
  const rawNode = {
    id: 'svgIcon',
    type: 'image',
    width: 4,
    height: 2,
    bg: '#FF0000',
    fg: '#00FF00',
    text: '<svg><rect width="100%" height="100%" fill="var(--bg)" stroke="var(--fg)" /></svg>'
  }

  const compiler = ControlCompiler()
  const compiled = compiler.compileNode(rawNode)
  solveLayout(compiled, { x: 0, y: 0, width: 4, height: 2 })

  const grid = createMockGrid(4, 2, '.')
  paintNode(grid, compiled)

  // Verify that imageSequence was lazily compiled and matches Kitty format
  assert.ok(compiled.imageSequence)
  assert.ok(compiled.imageSequence.startsWith('\x1b_G'))
  assert.ok(compiled.imageSequence.includes('c=4,r=2'))
  
  // Verify that the top-left cell has our compiled image sequence
  assert.strictEqual(grid[0][0].char, compiled.imageSequence)
  // Verify spacer blocks
  assert.strictEqual(grid[0][1].char, ' ')
  assert.strictEqual(grid[1][1].char, ' ')
})


