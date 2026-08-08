// Functional double-buffered screen renderer for coms-tui-yaml

const ScreenRenderer = (stdout = process.stdout) => {
  let prevFrame = []

  const draw = (newFrame) => {
    const width = stdout.columns || 80
    const height = stdout.rows || 24
    let ansiPayload = ''
    let graphicsPayload = ''

    for (let y = 0; y < height; y++) {
      const prevRow = prevFrame[y]
      const currRow = newFrame[y]

      for (let x = 0; x < width; x++) {
        const prev = prevRow?.[x]
        const curr = currRow?.[x] || { char: ' ', style: '\x1b[0m' }

        if (!prev || prev.char !== curr.char || prev.style !== curr.style) {
          if (curr.char !== '') {
            // Check if this cell is a Kitty graphic control block
            if (curr.char.startsWith('\x1b_G')) {
              ansiPayload += `\x1b[${y + 1};${x + 1}H\x1b[0m${curr.style || ''} `
              graphicsPayload += `\x1b[${y + 1};${x + 1}H${curr.char}`
            } else {
              ansiPayload += `\x1b[${y + 1};${x + 1}H\x1b[0m${curr.style || ''}${curr.char}`
            }
          }
        }
      }
    }

    if (ansiPayload || graphicsPayload) {
      stdout.write(ansiPayload + graphicsPayload + '\x1b[0m')
      // Deep copy frame state to track changes accurately on the next draw
      prevFrame = JSON.parse(JSON.stringify(newFrame))
    }
  }

  const clear = () => {
    prevFrame = []
    // Evict all Kitty graphics from GPU memory
    stdout.write('\x1b_Ga=d,d=a,q=2\x1b\\')
  }

  const reset = () => {
    prevFrame = []
    // Hard clear standard text, move cursor home, and evict all graphics
    stdout.write('\x1b_Ga=d,d=a,q=2\x1b\\\x1b[2J\x1b[H')
  }

  const invalidate = () => {
    prevFrame = []
  }

  return { draw, clear, reset, invalidate }
}

module.exports = {
  ScreenRenderer,
}
