// Translates compiled node colors and styles into standard terminal escape strings

const hexToRgb = (hex = '') => {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  }
}

const FG_MAP = {
  black: '30', red: '31', green: '32', yellow: '33',
  blue: '34', magenta: '35', cyan: '36', white: '37',
  default: '39'
}

const BG_MAP = {
  black: '40', red: '41', green: '42', yellow: '43',
  blue: '44', magenta: '45', cyan: '46', white: '47',
  default: '49'
}

const resolveColor = (color, capabilities = { truecolor: true }) => {
  if (Array.isArray(color)) {
    for (const item of color) {
      const resolved = resolveColor(item, capabilities)
      if (resolved) return resolved
    }
    return null
  }
  if (typeof color === 'string' && color.startsWith('#') && !capabilities.truecolor) {
    return null // skip hex if truecolor not supported
  }
  return color
}

const getInheritedProp = (node, prop) => {
  let current = node
  while (current) {
    if (current[prop] !== undefined && current[prop] !== null) {
      return current[prop]
    }
    current = current.parent
  }
  return undefined
}

const compileAnsiStyle = (node = {}, capabilities = { truecolor: true }) => {
  let style = '\x1b[0m' // Reset first

  const bold = getInheritedProp(node, 'bold')
  const italic = getInheritedProp(node, 'italic')
  const underline = getInheritedProp(node, 'underline')
  const invert = getInheritedProp(node, 'invert')

  if (bold) style += '\x1b[1m'
  if (italic) style += '\x1b[3m'
  if (underline) style += '\x1b[4m'
  if (invert) style += '\x1b[7m'

  const rawFg = getInheritedProp(node, 'fg')
  const fg = resolveColor(rawFg, capabilities)
  if (fg) {
    if (fg.startsWith('#')) {
      const rgb = hexToRgb(fg)
      style += `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
    } else if (FG_MAP[fg]) {
      style += `\x1b[${FG_MAP[fg]}m`
    }
  }

  const rawBg = getInheritedProp(node, 'bg')
  const bg = resolveColor(rawBg, capabilities)
  if (bg) {
    if (bg.startsWith('#')) {
      const rgb = hexToRgb(bg)
      style += `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`
    } else if (BG_MAP[bg]) {
      style += `\x1b[${BG_MAP[bg]}m`
    }
  }

  return style
}

module.exports = {
  resolveColor,
  compileAnsiStyle,
  getInheritedProp
}
