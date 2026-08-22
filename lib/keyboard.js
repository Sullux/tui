// Standard Keyboard Translation and Stateful Routing Layer

const KEY = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  ENTER: 'enter',
  ESCAPE: 'escape',
  TAB: 'tab',
  BACKSPACE: 'backspace',
  DELETE: 'delete',
  SPACE: 'space',
  HOME: 'home',
  END: 'end',
  PAGE_UP: 'pageup',
  PAGE_DOWN: 'pagedown',
}

const keyToChar = (key) => {
  if (!key) return null
  if (key.length === 1) return key
  if (key === 'space') return ' '
  if (key === 'enter') return '\n'
  if (key === 'tab') return '\t'
  return null
}

const parseKeyPress = (str, key) => {
  const sequence = (key && key.sequence) || str || ''
  let keyName = (key && key.name) || str || ''

  // Normalize name to standard representation
  if (keyName === '\r' || keyName === '\n' || keyName === 'return') keyName = 'enter'
  if (keyName === '\t') keyName = 'tab'
  if (keyName === 'escape' || keyName === '\x1b') keyName = 'escape'
  if (keyName === ' ') keyName = 'space'

  return {
    key: keyName.toLowerCase(),
    char: (keyName.length === 1 || keyName === 'space' || keyName === 'enter' || keyName === 'tab') ? str : null,
    ctrl: !!(key && key.ctrl),
    alt: !!(key && (key.meta || key.alt)),
    shift: !!(key && key.shift),
    sequence,
  }
}

const getStrokeName = (keyPayload) => {
  const modifiers = []
  if (keyPayload.ctrl) modifiers.push('ctrl')
  if (keyPayload.alt) modifiers.push('alt')
  if (keyPayload.shift && (keyPayload.key.length > 1 || keyPayload.ctrl || keyPayload.alt)) {
    modifiers.push('shift')
  }
  modifiers.sort()
  return [...modifiers, keyPayload.key].join('+').toLowerCase()
}

const normalizeStrokePattern = (pattern) => {
  const parts = pattern.toLowerCase().split('+')
  const key = parts.pop()
  const modifiers = parts.filter(p => p === 'ctrl' || p === 'alt' || p === 'shift')
  modifiers.sort()
  return [...modifiers, key].join('+')
}

const parseStrokeWithRepeat = (strokePattern) => {
  const starIdx = strokePattern.indexOf('*')
  if (starIdx === -1) {
    return { pattern: strokePattern, repeat: 1 }
  }
  const pattern = strokePattern.slice(0, starIdx)
  const repeat = parseInt(strokePattern.slice(starIdx + 1), 10) || 1
  return { pattern, repeat }
}

const parseBindingPattern = (bindingStr) => {
  const strokePatterns = bindingStr.split(',')
  const strokes = []
  const timedIndices = {}

  strokePatterns.forEach(strokePattern => {
    const { pattern, repeat } = parseStrokeWithRepeat(strokePattern)
    const normalized = normalizeStrokePattern(pattern)
    
    const startIndex = strokes.length
    for (let r = 0; r < repeat; r++) {
      strokes.push(normalized)
      if (r > 0) {
        timedIndices[startIndex + r] = true
      }
    }
  })

  return { strokes, timedIndices }
}

const expandRangePatterns = (bindingKey) => {
  const match = bindingKey.match(/(\w*)(\d+)\.\.(\w*)(\d+)/)
  if (!match) return [bindingKey]

  const [full, prefix1, num1Str, prefix2, num2Str] = match
  if (prefix1 !== prefix2) return [bindingKey]

  const num1 = parseInt(num1Str, 10)
  const num2 = parseInt(num2Str, 10)
  const keys = []

  const prefix = prefix1
  const paddingLength = num1Str.length
  
  for (let n = num1; n <= num2; n++) {
    const nStr = String(n).padStart(paddingLength, '0')
    const keyInstance = bindingKey.replace(full, `${prefix}${nStr}`)
    keys.push(...expandRangePatterns(keyInstance))
  }

  return keys
}

const findExactMatch = (buffer, compiledBindings, rapidInterval) => {
  for (const binding of compiledBindings) {
    if (buffer.length !== binding.strokes.length) {
      continue
    }

    let match = true
    for (let i = 0; i < buffer.length; i++) {
      const bufItem = buffer[i]
      const bindStroke = binding.strokes[i]

      if (bufItem.stroke !== bindStroke) {
        match = false
        break
      }

      if (binding.timedIndices[i]) {
        const prevItem = buffer[i - 1]
        if (!prevItem || (bufItem.time - prevItem.time > rapidInterval)) {
          match = false
          break
        }
      }
    }

    if (match) {
      return binding.handler
    }
  }
  return null
}

const matchKeySpec = (buffer, compiledBindings, rapidInterval) => {
  let hasPartial = false
  let exactMatch = null

  for (const binding of compiledBindings) {
    if (buffer.length > binding.strokes.length) {
      continue
    }

    let match = true
    for (let i = 0; i < buffer.length; i++) {
      const bufItem = buffer[i]
      const bindStroke = binding.strokes[i]

      if (bufItem.stroke !== bindStroke) {
        match = false
        break
      }

      if (binding.timedIndices[i]) {
        const prevItem = buffer[i - 1]
        if (!prevItem || (bufItem.time - prevItem.time > rapidInterval)) {
          match = false
          break
        }
      }
    }

    if (match) {
      if (buffer.length === binding.strokes.length) {
        exactMatch = binding.handler
      } else {
        hasPartial = true
      }
    }
  }

  if (hasPartial) {
    return true
  }

  return exactMatch || false
}

const KeyHandler = (bindings, options = {}) => {
  const rapidKeyInterval = options.rapidKeyInterval !== undefined ? options.rapidKeyInterval : 500
  const compiledBindings = []

  for (const [pattern, handler] of Object.entries(bindings)) {
    if (pattern === 'rapidKeyInterval') continue
    
    const expandedPatterns = expandRangePatterns(pattern)
    expandedPatterns.forEach(expandedPattern => {
      const { strokes, timedIndices } = parseBindingPattern(expandedPattern)
      compiledBindings.push({
        strokes,
        timedIndices,
        handler,
      })
    })
  }

  let buffer = []

  return (ctx, keyPayload) => {
    const stroke = getStrokeName(keyPayload)
    const time = Date.now()

    // Expiry check: trigger current buffer exact match if all partial matches have expired
    if (buffer.length > 0) {
      const currentMatch = findExactMatch(buffer, compiledBindings, rapidKeyInterval)
      if (currentMatch) {
        let allExpired = true
        for (const binding of compiledBindings) {
          if (binding.strokes.length > buffer.length) {
            const nextIdx = buffer.length
            if (binding.timedIndices[nextIdx]) {
              const lastItem = buffer[buffer.length - 1]
              if (lastItem && (time - lastItem.time <= rapidKeyInterval)) {
                allExpired = false
                break
              }
            } else {
              allExpired = false
              break
            }
          }
        }

        if (allExpired) {
          const handler = currentMatch
          const lastPayload = buffer[buffer.length - 1].payload
          buffer = []
          handler(ctx, lastPayload)
        }
      }
    }

    buffer.push({ stroke, time, payload: keyPayload })

    let matchResult = null
    while (buffer.length > 0) {
      matchResult = matchKeySpec(buffer, compiledBindings, rapidKeyInterval)
      if (matchResult !== false) {
        break
      }
      buffer = buffer.slice(1)
    }

    if (matchResult === false) {
      buffer = []
      return
    }

    if (typeof matchResult === 'function') {
      const handler = matchResult
      buffer = []
      return handler(ctx, keyPayload)
    }
  }
}

module.exports = {
  KEY,
  keyToChar,
  parseKeyPress,
  getStrokeName,
  KeyHandler,
}
