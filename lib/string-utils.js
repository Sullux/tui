// Wide-Character and Emojis Column Width Utilities

const isWideChar = (char) => {
  if (!char) return false
  const code = char.codePointAt(0)
  if (!code) return false
  return (
    (code >= 0x1F300 && code <= 0x1F9FF) || // Misc Symbols & Pictographs, Emoji
    (code >= 0x2600 && code <= 0x27BF) ||   // Symbols, Dingbats
    (code >= 0x1F000 && code <= 0x1F0FF) || // Domino, Mahjong, Playing Cards
    (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
    (code >= 0x1F680 && code <= 0x1F6FF) || // Transport
    (code >= 0x1F900 && code <= 0x1F9FF) || // Supplemental Symbols
    (code >= 0x2F00 && code <= 0x2FDF) ||   // Kangxi Radicals
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols
    (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) ||   // Katakana
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Ideographs
    (code >= 0xAC00 && code <= 0xD7AF)      // Hangul
  )
}

const visualWidth = (text) => {
  if (typeof text === 'string' && text.startsWith('\x1b_G')) {
    return 1
  }
  let w = 0
  for (const char of Array.from(text || '')) {
    w += isWideChar(char) ? 2 : 1
  }
  return w
}

const sanitizeText = (text) => {
  if (typeof text !== 'string') return text
  return text
    .replace(/[\u00ad\u0300-\u036f\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
}

const breakAfterChar = (text, maxLength) => {
  const str = typeof text === 'string' ? text : String(text || '')
  if (maxLength <= 0) {
    return { text: '', extra: str, isHardBreak: false }
  }

  const sanitized = sanitizeText(str)
  const chars = Array.from(sanitized)

  let currentWidth = 0
  let breakIndex = -1
  let fitCharCount = 0

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const charWidth = isWideChar(char) ? 2 : 1

    if (currentWidth + charWidth > maxLength) {
      break
    }

    currentWidth += charWidth
    fitCharCount = i + 1

    if (/\s/.test(char)) {
      if (breakIndex === -1 || !/\s/.test(chars[i - 1])) {
        breakIndex = i
      }
    }
  }

  if (fitCharCount >= chars.length) {
    return { text: sanitized, extra: '', isHardBreak: false }
  }

  if (breakIndex > 0) {
    const textPart = chars.slice(0, breakIndex).join('')
    let extraIndex = breakIndex
    while (extraIndex < chars.length && /\s/.test(chars[extraIndex])) {
      extraIndex++
    }
    const extraPart = chars.slice(extraIndex).join('')
    return { text: textPart, extra: extraPart, isHardBreak: false }
  }

  const textPart = chars.slice(0, fitCharCount).join('')
  const extraPart = chars.slice(fitCharCount).join('')
  return { text: textPart, extra: extraPart, isHardBreak: true }
}

module.exports = {
  isWideChar,
  visualWidth,
  sanitizeText,
  breakAfterChar,
}
