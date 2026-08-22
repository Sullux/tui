const test = require('node:test')
const assert = require('node:assert')
const { compileAnsiStyle } = require('../lib/ansi-style')

test('AnsiStyle - compiles hex and standard colors with modifiers', () => {
  // 1. Check plain text
  assert.strictEqual(compileAnsiStyle({}), '\x1b[0m')

  // 2. Check 24-bit Truecolor hex values
  assert.strictEqual(compileAnsiStyle({ fg: '#1a1b26', bg: '#000000' }), '\x1b[0m\x1b[38;2;26;27;38m\x1b[48;2;0;0;0m')

  // 3. Check 4-bit standard colors and style decorators
  assert.strictEqual(
    compileAnsiStyle({ fg: 'yellow', bg: 'blue', bold: true, underline: true }),
    '\x1b[0m\x1b[1m\x1b[4m\x1b[33m\x1b[44m'
  )

  // 4. Check style inheritance from parent nodes
  const parent = { fg: '#000000', bg: '#FF8800' }
  const child = { parent }
  assert.strictEqual(
    compileAnsiStyle(child),
    '\x1b[0m\x1b[38;2;0;0;0m\x1b[48;2;255;136;0m'
  )

  // 5. Child overrides parent property
  const selectedChild = { bg: '#8899FF', parent }
  assert.strictEqual(
    compileAnsiStyle(selectedChild),
    '\x1b[0m\x1b[38;2;0;0;0m\x1b[48;2;136;153;255m'
  )
})
