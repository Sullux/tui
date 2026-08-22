const test = require('node:test')
const assert = require('node:assert')
const { KEY, keyToChar, parseKeyPress, getStrokeName, KeyHandler } = require('../lib/keyboard')

test('Keyboard - parseKeyPress and keyToChar translation helpers', () => {
  // 1. Regular character
  const kp1 = parseKeyPress('a', { name: 'a' })
  assert.strictEqual(kp1.key, 'a')
  assert.strictEqual(kp1.char, 'a')
  assert.strictEqual(kp1.ctrl, false)
  assert.strictEqual(kp1.alt, false)

  // 2. Modifiers and escape sequences
  const kp2 = parseKeyPress('\x1b[A', { name: 'up', ctrl: true, meta: true })
  assert.strictEqual(kp2.key, 'up')
  assert.strictEqual(kp2.char, null)
  assert.strictEqual(kp2.ctrl, true)
  assert.strictEqual(kp2.alt, true)

  // 3. Special keys normalization
  const kp3 = parseKeyPress('\r', { name: 'return' })
  assert.strictEqual(kp3.key, 'enter')
  assert.strictEqual(kp3.char, '\r')

  // 4. keyToChar conversions
  assert.strictEqual(keyToChar('a'), 'a')
  assert.strictEqual(keyToChar('space'), ' ')
  assert.strictEqual(keyToChar('enter'), '\n')
  assert.strictEqual(keyToChar('up'), null)
})

test('Keyboard - getStrokeName modifier sorting and normalization', () => {
  const kp = { key: 'a', ctrl: true, alt: true, shift: true }
  const stroke = getStrokeName(kp)
  assert.strictEqual(stroke, 'alt+ctrl+shift+a') // sorted alphabetically
})

test('Keyboard - KeyHandler routing and untimed sequence matching', () => {
  let saveTriggered = 0
  let helpTriggered = 0

  const handler = KeyHandler({
    'ctrl+s': () => { saveTriggered++ },
    'escape,h': () => { helpTriggered++ }
  })

  const mockCtx = {}

  // 1. Single stroke match
  handler(mockCtx, parseKeyPress('s', { name: 's', ctrl: true }))
  assert.strictEqual(saveTriggered, 1)

  // 2. Multi-key untimed sequence match
  handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
  assert.strictEqual(helpTriggered, 0) // waiting for 'h'

  handler(mockCtx, parseKeyPress('h', { name: 'h' }))
  assert.strictEqual(helpTriggered, 1) // triggered!
})

test('Keyboard - KeyHandler suffix buffer trimming on mismatch', () => {
  let helpTriggered = 0
  let aTriggered = 0

  const handler = KeyHandler({
    'escape,h': () => { helpTriggered++ },
    'a': () => { aTriggered++ }
  })

  const mockCtx = {}

  // User presses escape (partial match for sequence)
  handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
  
  // User types 'a' (no match for escape,a)
  // Suffix trimming sheds 'escape', matches single 'a', executes!
  handler(mockCtx, parseKeyPress('a', { name: 'a' }))

  assert.strictEqual(helpTriggered, 0)
  assert.strictEqual(aTriggered, 1)
})

test('Keyboard - KeyHandler double-press rapid repeat with static timing', () => {
  let quitTriggered = 0
  let escTriggered = 0

  const handler = KeyHandler({
    'escape*2': () => { quitTriggered++ },
    'escape': () => { escTriggered++ }
  }, { rapidKeyInterval: 100 }) // set tight 100ms timing for test

  const mockCtx = {}

  // 1. Fast double press (within 100ms)
  handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
  // wait 20ms
  handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
  assert.strictEqual(quitTriggered, 1)
  assert.strictEqual(escTriggered, 0)

  // 2. Slow double press (violating 100ms threshold)
  handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
  
  // Wait 150ms to exceed threshold
  return new Promise((resolve) => {
    setTimeout(() => {
      handler(mockCtx, parseKeyPress('\x1b', { name: 'escape' }))
      
      // The second press should execute single 'escape' handler, not 'escape*2'
      assert.strictEqual(quitTriggered, 1) // remains 1
      assert.strictEqual(escTriggered, 1)  // incremented!
      resolve()
    }, 150)
  })
})

test('Keyboard - KeyHandler pre-expanded range patterns', () => {
  let itemIndex = -1

  const handler = KeyHandler({
    'n1..n3': (ctx, kp) => {
      itemIndex = parseInt(kp.key.slice(1), 10)
    }
  })

  const mockCtx = {}

  handler(mockCtx, parseKeyPress('n2', { name: 'n2' }))
  assert.strictEqual(itemIndex, 2)

  handler(mockCtx, parseKeyPress('n3', { name: 'n3' }))
  assert.strictEqual(itemIndex, 3)

  handler(mockCtx, parseKeyPress('n4', { name: 'n4' }))
  assert.strictEqual(itemIndex, 3) // untouched, 'n4' is out of range
})
