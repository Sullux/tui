// Pure String, Cursor, and Keyboard Manipulation Utilities for Text Input
const { visualWidth, sanitizeText } = require('./string-utils')

const isWhitespace = (ch) => /\s/.test(ch)
const isPunctuation = (ch) => /[^\w\s]/.test(ch)

const wordBoundaryLeft = (text = '', index = 0) => {
  if (index <= 0) return 0
  let i = Math.min(index, text.length)

  while (i > 0 && isWhitespace(text[i - 1])) i--
  if (i === 0) return 0

  const isPunct = isPunctuation(text[i - 1])
  while (i > 0 && !isWhitespace(text[i - 1]) && (isPunctuation(text[i - 1]) === isPunct)) {
    i--
  }
  return i
}

const wordBoundaryRight = (text = '', index = 0) => {
  const len = text.length
  if (index >= len) return len
  let i = Math.max(0, index)

  const isPunct = isPunctuation(text[i])
  if (isWhitespace(text[i])) {
    while (i < len && isWhitespace(text[i])) i++
  } else {
    while (i < len && !isWhitespace(text[i]) && (isPunctuation(text[i]) === isPunct)) i++
    while (i < len && isWhitespace(text[i])) i++
  }
  return Math.min(len, i)
}

const findLineCol = (lines = [], cursorIndex = 0) => {
  let count = 0
  for (let r = 0; r < lines.length; r++) {
    const lineLen = lines[r].length
    if (cursorIndex <= count + lineLen) {
      const colChars = lines[r].slice(0, cursorIndex - count)
      return { row: r, col: visualWidth(colChars) }
    }
    count += lineLen + 1
  }
  const lastRow = Math.max(0, lines.length - 1)
  const lastCol = lines[lastRow] ? visualWidth(lines[lastRow]) : 0
  return { row: lastRow, col: lastCol }
}

const handleInputKey = (node, event, ctx) => {
  if (node.readOnly || node.disabled || node.enabled === false) return

  let val = node.value !== undefined ? String(node.value) : (node.text !== undefined ? String(node.text) : '')
  const prevVal = val
  let cur = typeof node.cursor === 'number' ? node.cursor : val.length
  cur = Math.max(0, Math.min(val.length, cur))

  const key = event.key
  let handled = true

  if (key === 'left') {
    cur = (event.ctrl || event.alt) ? wordBoundaryLeft(val, cur) : Math.max(0, cur - 1)
  } else if (key === 'right') {
    cur = (event.ctrl || event.alt) ? wordBoundaryRight(val, cur) : Math.min(val.length, cur + 1)
  } else if (key === 'home' || (event.ctrl && key === 'a')) {
    cur = node.multiline ? val.lastIndexOf('\n', cur - 1) + 1 : 0
  } else if (key === 'end' || (event.ctrl && key === 'e')) {
    cur = node.multiline ? (val.indexOf('\n', cur) === -1 ? val.length : val.indexOf('\n', cur)) : val.length
  } else if (key === 'backspace' || (event.ctrl && key === 'w')) {
    if (event.ctrl || event.alt || (event.ctrl && key === 'w')) {
      const prev = wordBoundaryLeft(val, cur)
      val = val.slice(0, prev) + val.slice(cur)
      cur = prev
    } else if (cur > 0) {
      val = val.slice(0, cur - 1) + val.slice(cur)
      cur -= 1
    }
  } else if (key === 'delete' || (event.alt && key === 'd')) {
    if (event.ctrl || event.alt) {
      const next = wordBoundaryRight(val, cur)
      val = val.slice(0, cur) + val.slice(next)
    } else if (cur < val.length) {
      val = val.slice(0, cur) + val.slice(cur + 1)
    }
  } else if (event.ctrl && key === 'u') {
    val = val.slice(cur)
    cur = 0
  } else if (event.ctrl && key === 'k') {
    val = val.slice(0, cur)
  } else if (key === 'enter') {
    if (node.multiline) {
      val = val.slice(0, cur) + '\n' + val.slice(cur)
      cur += 1
    } else if (node.onSubmit) {
      node.onSubmit(ctx, { value: val })
    }
  } else if (!event.ctrl && !event.alt && (event.char || (key && key.length === 1 && key !== 'tab' && key !== 'escape'))) {
    const ch = event.char || key
    if (!node.maxLength || val.length < node.maxLength) {
      val = val.slice(0, cur) + ch + val.slice(cur)
      cur += ch.length
    }
  } else {
    handled = false
  }

  if (handled) {
    node.value = val
    node.text = val
    node.cursor = cur
    if (val !== prevVal && node.onChange) {
      node.onChange(ctx, { value: val, cursor: cur, prevValue: prevVal })
    }
    if (ctx && typeof ctx.triggerRedraw === 'function') {
      ctx.triggerRedraw()
    }
  }
}

module.exports = {
  isWhitespace,
  isPunctuation,
  wordBoundaryLeft,
  wordBoundaryRight,
  findLineCol,
  handleInputKey,
}
