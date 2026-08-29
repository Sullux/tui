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
  let ctrl = !!(key && key.ctrl)
  let alt = !!(key && (key.meta || key.alt))
  let shift = !!(key && key.shift)

  // Handle CSI-u / kitty keyboard escape sequences for modified enter
  if (sequence === '\x1b[13;2u' || sequence === '\x1b[27;2;13~' || sequence === '\x1bOM') {
    keyName = 'enter'
    shift = true
  } else if (sequence === '\x1b[13;5u' || sequence === '\x1b[27;5;13~') {
    keyName = 'enter'
    ctrl = true
  } else if (sequence === '\x1b[13;3u' || sequence === '\x1b\r') {
    keyName = 'enter'
    alt = true
  }

  // Map ASCII control codes (1-26) when raw input is not parsed by readline
  if (str && str.length === 1 && !key?.name) {
    const code = str.charCodeAt(0)
    if (code >= 1 && code <= 26 && code !== 9 && code !== 10 && code !== 13) {
      keyName = String.fromCharCode(96 + code)
      ctrl = true
    }
  }

  // Normalize name to standard representation
  if (keyName === '\r' || keyName === '\n' || keyName === 'return') keyName = 'enter'
  if (keyName === '\t') keyName = 'tab'
  if (keyName === 'escape' || keyName === '\x1b') keyName = 'escape'
  if (keyName === ' ') keyName = 'space'

  return {
    key: keyName.toLowerCase(),
    char: (keyName.length === 1 || keyName === 'space' || keyName === 'enter' || keyName === 'tab') ? str : null,
    ctrl,
    alt,
    shift,
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

const parseInputChunk = (chunk, state = { pasteBuffer: null }) => {
  const str = typeof chunk === 'string' ? chunk : (chunk ? chunk.toString('utf8') : '')
  const events = []

  let i = 0
  while (i < str.length) {
    // Check if currently inside bracketed paste block
    if (state.pasteBuffer !== null) {
      const endMarker = '\x1b[201~'
      const endIdx = str.indexOf(endMarker, i)
      if (endIdx !== -1) {
        state.pasteBuffer += str.slice(i, endIdx)
        events.push({ key: 'paste', text: state.pasteBuffer, paste: true })
        state.pasteBuffer = null
        i = endIdx + endMarker.length
      } else {
        state.pasteBuffer += str.slice(i)
        i = str.length
      }
      continue
    }

    // Check for start of bracketed paste
    const startMarker = '\x1b[200~'
    if (str.startsWith(startMarker, i)) {
      i += startMarker.length
      const endMarker = '\x1b[201~'
      const endIdx = str.indexOf(endMarker, i)
      if (endIdx !== -1) {
        const text = str.slice(i, endIdx)
        events.push({ key: 'paste', text, paste: true })
        i = endIdx + endMarker.length
      } else {
        state.pasteBuffer = str.slice(i)
        i = str.length
      }
      continue
    }

    // Ignore terminal query/graphics responses (\x1b_G... or \x1bP...)
    if (str.startsWith('\x1b_G', i) || str.startsWith('\x1bP', i)) {
      const stIdx = str.indexOf('\x1b\\', i)
      const belIdx = str.indexOf('\x07', i)
      if (stIdx !== -1) {
        i = stIdx + 2
      } else if (belIdx !== -1) {
        i = belIdx + 1
      } else {
        i = str.length
      }
      continue
    }

    // Parse ANSI escape sequences
    if (str[i] === '\x1b') {
      const rest = str.slice(i)

      // CSI u or Kitty keyboard: \x1b[<num>;<mod>u or \x1b[<num>u
      const csiUMatch = rest.match(/^\x1b\[(\d+)(?:;(\d+))?u/)
      if (csiUMatch) {
        const charCode = parseInt(csiUMatch[1], 10)
        const mod = parseInt(csiUMatch[2] || '1', 10) - 1
        const shift = !!(mod & 1)
        const alt = !!(mod & 2)
        const ctrl = !!(mod & 4)

        const key = charCode === 13 ? 'enter' : (charCode === 9 ? 'tab' : (charCode === 27 ? 'escape' : String.fromCharCode(charCode).toLowerCase()))
        events.push({
          key,
          char: (key.length === 1 && !ctrl && !alt) ? String.fromCharCode(charCode) : null,
          shift,
          alt,
          ctrl,
          sequence: csiUMatch[0],
        })
        i += csiUMatch[0].length
        continue
      }

      // modifyOtherKeys: \x1b[27;<mod>;<num>~
      const mokMatch = rest.match(/^\x1b\[27;(\d+);(\d+)~/)
      if (mokMatch) {
        const mod = parseInt(mokMatch[1], 10) - 1
        const charCode = parseInt(mokMatch[2], 10)
        const shift = !!(mod & 1)
        const alt = !!(mod & 2)
        const ctrl = !!(mod & 4)

        const key = charCode === 13 ? 'enter' : (charCode === 9 ? 'tab' : (charCode === 27 ? 'escape' : String.fromCharCode(charCode).toLowerCase()))
        events.push({
          key,
          char: (key.length === 1 && !ctrl && !alt) ? String.fromCharCode(charCode) : null,
          shift,
          alt,
          ctrl,
          sequence: mokMatch[0],
        })
        i += mokMatch[0].length
        continue
      }

      // Arrows with modifiers: \x1b[1;<mod>[A-Z]
      const modArrowMatch = rest.match(/^\x1b\[1;(\d+)([A-HFS])/)
      if (modArrowMatch) {
        const mod = parseInt(modArrowMatch[1], 10) - 1
        const shift = !!(mod & 1)
        const alt = !!(mod & 2)
        const ctrl = !!(mod & 4)
        const code = modArrowMatch[2]
        const keyMap = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end' }
        events.push({
          key: keyMap[code] || 'unknown',
          char: null,
          shift,
          alt,
          ctrl,
          sequence: modArrowMatch[0],
        })
        i += modArrowMatch[0].length
        continue
      }

      // Standard escape sequences
      const standardSeqMap = {
        '\x1b[A': { key: 'up' },
        '\x1b[B': { key: 'down' },
        '\x1b[C': { key: 'right' },
        '\x1b[D': { key: 'left' },
        '\x1b[H': { key: 'home' },
        '\x1b[F': { key: 'end' },
        '\x1b[1~': { key: 'home' },
        '\x1b[4~': { key: 'end' },
        '\x1b[7~': { key: 'home' },
        '\x1b[8~': { key: 'end' },
        '\x1b[2~': { key: 'insert' },
        '\x1b[3~': { key: 'delete' },
        '\x1b[5~': { key: 'pageup' },
        '\x1b[6~': { key: 'pagedown' },
        '\x1b[Z': { key: 'tab', shift: true },
        '\x1bOA': { key: 'up' },
        '\x1bOB': { key: 'down' },
        '\x1bOC': { key: 'right' },
        '\x1bOD': { key: 'left' },
        '\x1bOH': { key: 'home' },
        '\x1bOF': { key: 'end' },
        '\x1bOM': { key: 'enter', shift: true },
        '\x1b\r': { key: 'enter', alt: true },
        '\x1b\n': { key: 'enter', alt: true },
      }

      let matchedSeq = null
      for (const [seq, parsed] of Object.entries(standardSeqMap)) {
        if (rest.startsWith(seq)) {
          matchedSeq = { seq, parsed }
          break
        }
      }

      if (matchedSeq) {
        events.push({
          key: matchedSeq.parsed.key,
          char: null,
          shift: !!matchedSeq.parsed.shift,
          alt: !!matchedSeq.parsed.alt,
          ctrl: !!matchedSeq.parsed.ctrl,
          sequence: matchedSeq.seq,
        })
        i += matchedSeq.seq.length
        continue
      }

      // Alt + character
      if (rest.length > 1 && rest[1] >= ' ' && rest[1] <= '~') {
        events.push({
          key: rest[1].toLowerCase(),
          char: rest[1],
          alt: true,
          shift: rest[1] >= 'A' && rest[1] <= 'Z',
          ctrl: false,
          sequence: rest.slice(0, 2),
        })
        i += 2
        continue
      }

      events.push({
        key: 'escape',
        char: null,
        shift: false,
        alt: false,
        ctrl: false,
        sequence: '\x1b',
      })
      i += 1
      continue
    }

    // Single character or ASCII control code
    const char = str[i]
    const code = str.charCodeAt(i)

    if (code === 13) {
      events.push({ key: 'enter', char: '\n', shift: false, alt: false, ctrl: false, sequence: '\r' })
    } else if (code === 10) {
      // LF in raw terminal mode is Shift+Enter or Ctrl+Enter
      events.push({ key: 'enter', char: '\n', shift: true, alt: false, ctrl: false, sequence: '\n' })
    } else if (code === 9) {
      events.push({ key: 'tab', char: '\t', shift: false, alt: false, ctrl: false, sequence: '\t' })
    } else if (code === 127 || code === 8) {
      events.push({ key: 'backspace', char: null, shift: false, alt: false, ctrl: false, sequence: char })
    } else if (code >= 1 && code <= 26) {
      const letter = String.fromCharCode(96 + code)
      events.push({ key: letter, char: null, shift: false, alt: false, ctrl: true, sequence: char })
    } else if (char === ' ') {
      events.push({ key: 'space', char: ' ', shift: false, alt: false, ctrl: false, sequence: ' ' })
    } else {
      events.push({
        key: char.toLowerCase(),
        char,
        shift: char !== char.toLowerCase(),
        alt: false,
        ctrl: false,
        sequence: char,
      })
    }

    i += 1
  }

  return events
}

module.exports = {
  KEY,
  keyToChar,
  parseKeyPress,
  parseInputChunk,
  getStrokeName,
  KeyHandler,
}
