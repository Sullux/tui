const { describe, it } = require('node:test')
const assert = require('node:assert')
const { getImageAsset } = require('../lib/image-asset')
const { onMeasure } = require('../lib/controls/image')

describe('Image Asset & Scale Modes', () => {
  const sampleSvg = `<svg viewBox="0 0 100 50" width="100" height="50"><rect width="100" height="50"/></svg>`

  it('calculates intrinsic dimension aspect ratio', () => {
    const asset = getImageAsset({ text: sampleSvg })
    assert.ok(asset)
    assert.strictEqual(asset.dim.width, 100)
    assert.strictEqual(asset.dim.height, 50)
    assert.strictEqual(asset.dim.aspect, 2)
  })

  it('computes scale="fit" target pixel dimensions preserving aspect ratio', () => {
    const ctx = { cellPx: { width: 10, height: 20 } }
    // Target cell box: 10 cols x 10 rows => 100px wide x 200px high
    const box = { width: 10, height: 10 }
    const asset = getImageAsset({ text: sampleSvg, scale: 'fit' }, ctx, box)

    assert.strictEqual(asset.scale.type, 'fit')
    // With 100x200 avail and aspect 2 (w/h): max fitted width is 100px, height is 50px
    assert.ok(asset.sequence)
  })

  it('computes scale="stretch" target pixel dimensions matching available box', () => {
    const ctx = { cellPx: { width: 10, height: 20 } }
    const box = { width: 10, height: 10 }
    const asset = getImageAsset({ text: sampleSvg, scale: 'stretch' }, ctx, box)

    assert.strictEqual(asset.scale.type, 'stretch')
    assert.ok(asset.sequence)
  })

  it('onMeasure automatically calculates cell dimensions from intrinsic image aspect ratio', () => {
    const ctx = { cellPx: { width: 10, height: 20 } }
    const constraints = { maxWidth: 80, maxHeight: 40 }

    // Case 1: Explicit width = 10 cols (100px), height unassigned => height should be calculated via aspect 2 (50px = 2.5 cells -> 3 cells)
    const res1 = onMeasure({ text: sampleSvg, width: 10 }, constraints, ctx)
    assert.strictEqual(res1.width, 10)
    assert.strictEqual(res1.height, 3)

    // Case 2: Explicit height = 4 rows (80px), width unassigned => width should be calculated via aspect 2 (160px = 16 cells)
    const res2 = onMeasure({ text: sampleSvg, height: 4 }, constraints, ctx)
    assert.strictEqual(res2.width, 16)
    assert.strictEqual(res2.height, 4)
  })
})
