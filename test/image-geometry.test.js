const { describe, it } = require('node:test')
const assert = require('node:assert')
const { getImageDimensions } = require('../lib/image-geometry')

describe('Image Geometry Parser', () => {
  it('parses SVG string dimensions from viewBox and attributes', () => {
    const svg = `<svg viewBox="0 0 100 50" width="200" height="100"></svg>`
    const dim = getImageDimensions(svg)
    assert.deepStrictEqual(dim, { width: 200, height: 100, aspect: 2, format: 'svg' })
  })

  it('parses PNG buffer dimensions', () => {
    const buf = Buffer.alloc(24)
    buf[0] = 0x89
    buf[1] = 0x50
    buf[2] = 0x4e
    buf[3] = 0x47
    buf.writeUInt32BE(640, 16)
    buf.writeUInt32BE(480, 20)

    const dim = getImageDimensions(buf)
    assert.deepStrictEqual(dim, { width: 640, height: 480, aspect: 640 / 480, format: 'png' })
  })

  it('parses GIF buffer dimensions', () => {
    const buf = Buffer.alloc(10)
    buf.write('GIF89a', 0, 6, 'ascii')
    buf.writeUInt16LE(320, 6)
    buf.writeUInt16LE(240, 8)

    const dim = getImageDimensions(buf)
    assert.deepStrictEqual(dim, { width: 320, height: 240, aspect: 320 / 240, format: 'gif' })
  })

  it('parses JPEG buffer dimensions', () => {
    const buf = Buffer.from([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x02, // APP0
      0xff, 0xc0, 0x00, 0x0b, 0x08, // SOF0
      0x01, 0xe0, // height 480
      0x02, 0x80, // width 640
      0x03, 0x01, 0x11, 0x00
    ])

    const dim = getImageDimensions(buf)
    assert.deepStrictEqual(dim, { width: 640, height: 480, aspect: 640 / 480, format: 'jpeg' })
  })

  it('returns null for unrecognized formats or invalid buffers', () => {
    assert.strictEqual(getImageDimensions(Buffer.from('hello world')), null)
    assert.strictEqual(getImageDimensions(null), null)
  })
})
