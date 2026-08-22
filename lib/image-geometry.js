const parsePngDimensions = (buf) => {
  if (buf.length < 24) return null
  // PNG signature check
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  if (!width || !height) return null
  return { width, height, aspect: width / height, format: 'png' }
}

const parseGifDimensions = (buf) => {
  if (buf.length < 10) return null
  const sig = buf.toString('ascii', 0, 6)
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null
  const width = buf.readUInt16LE(6)
  const height = buf.readUInt16LE(8)
  if (!width || !height) return null
  return { width, height, aspect: width / height, format: 'gif' }
}

const parseJpegDimensions = (buf) => {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let offset = 2
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) break
    const marker = buf[offset + 1]
    // Baseline/Progressive SOF markers: 0xC0..0xC3, 0xC5..0xC7, 0xC9..0xCB, 0xCD..0xCF
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 > buf.length) break
      const height = buf.readUInt16BE(offset + 5)
      const width = buf.readUInt16BE(offset + 7)
      if (!width || !height) break
      return { width, height, aspect: width / height, format: 'jpeg' }
    }
    const blockLength = buf.readUInt16BE(offset + 2)
    offset += 2 + blockLength
  }
  return null
}

const parseSvgDimensions = (str) => {
  if (typeof str !== 'string' && !Buffer.isBuffer(str)) return null
  const xml = str.toString('utf8')
  if (!xml.includes('<svg')) return null

  let width = null
  let height = null

  // Check viewBox attribute first e.g. viewBox="0 0 100 200"
  const viewBoxMatch = xml.match(/viewBox\s*=\s*["']\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)\s*["']/i)
  if (viewBoxMatch) {
    const vbW = parseFloat(viewBoxMatch[3])
    const vbH = parseFloat(viewBoxMatch[4])
    if (vbW > 0 && vbH > 0) {
      width = vbW
      height = vbH
    }
  }

  // Override with explicit width/height if numeric (px)
  const wMatch = xml.match(/\bwidth\s*=\s*["']\s*([\d.]+)(px)?\s*["']/i)
  const hMatch = xml.match(/\bheight\s*=\s*["']\s*([\d.]+)(px)?\s*["']/i)
  if (wMatch) width = parseFloat(wMatch[1])
  if (hMatch) height = parseFloat(hMatch[1])

  if (!width || !height) return null
  return { width, height, aspect: width / height, format: 'svg' }
}

const getImageDimensions = (input) => {
  if (!input) return null

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') || trimmed.includes('<svg')) {
      const res = parseSvgDimensions(trimmed)
      if (res) return res
    }
    // Attempt buffer conversion if base64 or raw string
    try {
      const buf = Buffer.from(input, input.includes(';base64,') ? 'base64' : 'utf8')
      return getImageDimensions(buf)
    } catch (_) {
      return null
    }
  }

  if (Buffer.isBuffer(input)) {
    return (
      parsePngDimensions(input) ||
      parseJpegDimensions(input) ||
      parseGifDimensions(input) ||
      parseSvgDimensions(input)
    )
  }

  return null
}

module.exports = {
  getImageDimensions,
}
