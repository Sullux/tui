const test = require('node:test')
const assert = require('node:assert')
const { breakAfterChar, visualWidth, isWideChar, sanitizeText } = require('../lib/string-utils')

test('string-utils - breakAfterChar handles clean word breaks and hard breaks', () => {
  // Charles' Example 1: Clean word break
  const ex1 = breakAfterChar('the quick brown fox jumps over the lazy dogs', 12)
  assert.deepStrictEqual(ex1, {
    text: 'the quick',
    extra: 'brown fox jumps over the lazy dogs',
    isHardBreak: false,
  })

  // Charles' Example 2: Hard break (unbreakable word, 12 chars max)
  // 'this_is_a_run_on_word' -> 12 chars is 'this_is_a_ru', remaining is 'n_on_word'
  const ex2 = breakAfterChar('this_is_a_run_on_word', 12)
  assert.deepStrictEqual(ex2, {
    text: 'this_is_a_ru',
    extra: 'n_on_word',
    isHardBreak: true,
  })

  // Example 3: Full string fits
  const ex3 = breakAfterChar('hello world', 20)
  assert.deepStrictEqual(ex3, {
    text: 'hello world',
    extra: '',
    isHardBreak: false,
  })

  // Example 4: Wide character emoji handling (width = 2 for emoji)
  const ex4 = breakAfterChar('🖼️ image description goes here', 10)
  assert.strictEqual(visualWidth(ex4.text) <= 10, true)

  // Example 5: Non-positive maxLength
  const ex5 = breakAfterChar('test', 0)
  assert.deepStrictEqual(ex5, {
    text: '',
    extra: 'test',
    isHardBreak: false,
  })
})
