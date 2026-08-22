const test = require('node:test')
const assert = require('node:assert')
const { ContextFactory } = require('../index')
const { parseKeyPress } = require('../lib/keyboard')

test('Context - traverses vDOM and resolves IDs, tags, and custom predicates', () => {
  const vdomRoot = {
    id: 'app',
    tags: ['container'],
    inner: [
      { id: 'sidebar', tags: ['container', 'active'], inner: [] },
      { id: 'textbox', tags: ['input'], props: { text: 'Hello' } }
    ]
  }

  const ctx = ContextFactory({ vdomRoot })

  // 1. Fetch by ID
  const sidebar = ctx.elementById('sidebar')
  assert.ok(sidebar)
  assert.strictEqual(sidebar.id, 'sidebar')

  // 2. Fetch by Tag
  const containers = ctx.elementsTagged('container')
  assert.strictEqual(containers.length, 2)
  assert.strictEqual(containers[0].id, 'app')
  assert.strictEqual(containers[1].id, 'sidebar')

  // 3. Fetch by Predicate
  const inputs = ctx.elementsMatching(node => node.props && node.props.text === 'Hello')
  assert.strictEqual(inputs.length, 1)
  assert.strictEqual(inputs[0].id, 'textbox')
})

test('Context - handles program focus cycles and blur/focus lifecycles', () => {
  let blurCount = 0
  let focusCount = 0

  const vdomRoot = {
    id: 'app',
    inner: [
      {
        id: 'input1',
        focusable: true,
        onBlur: () => { blurCount++ },
        onFocus: () => { focusCount++ }
      },
      {
        id: 'input2',
        focusable: true,
        onFocus: () => { focusCount++ }
      },
      {
        id: 'disabledNode',
        focusable: true,
        disabled: true // should be skipped during cycling
      }
    ]
  }

  let redraws = 0
  const ctx = ContextFactory({
    vdomRoot,
    onRedrawNeeded: () => { redraws++ }
  })

  // Set initial focus
  ctx.setFocus('input1')
  assert.strictEqual(ctx.focusedId, 'input1')
  assert.strictEqual(focusCount, 1)
  assert.strictEqual(redraws, 1)

  // Cycle focus forwards (should cycle to input2, skipping disabledNode)
  ctx.focusNext()
  assert.strictEqual(ctx.focusedId, 'input2')
  assert.strictEqual(blurCount, 1)  // input1 was blurred
  assert.strictEqual(focusCount, 2)  // input2 was focused

  // Cycle focus backwards (should cycle back to input1)
  ctx.focusPrev()
  assert.strictEqual(ctx.focusedId, 'input1')
})

test('Context - geometry measurement helpers measure inner width/height defaulting to ctx.element', () => {
  const parentNode = {
    id: 'sidebar',
    width: '40', // string number
    height: 20,
    padding: [1, 2], // horizontal 1, vertical 2 => left 1, right 1, top 2, bottom 2
    margin: [0, 1]   // horizontal 0, vertical 1 => top 1, bottom 1
  }

  const childNode = {
    id: 'conversationList',
    parent: parentNode,
    width: 'fill',
    padding: 2, // 2 on all sides
    margin: [1, 0] // left 1, right 1
  }

  const ctx = ContextFactory({})

  // 1. Measure parent explicitly
  const parentInnerW = ctx.measureInnerWidth(parentNode)
  assert.strictEqual(parentInnerW, 38) // 40 - padH(2) - marH(0) = 38

  const parentInnerH = ctx.measureInnerHeight(parentNode)
  assert.strictEqual(parentInnerH, 14) // 20 - padV(4) - marV(2) = 14

  // 2. Measure child using createScopedContext delegate
  const scopedCtx = ctx.createScopedContext(childNode)

  const childInnerW = scopedCtx.measureInnerWidth() // defaults to scopedCtx.element
  assert.strictEqual(childInnerW, 32) // parentInnerW(38) - childPadH(4) - childMarH(2) = 32

  // 3. Measure using detached function reference (destructuring / detached reference - NO 'this' required)
  const measure = scopedCtx.measureInnerWidth
  assert.strictEqual(measure(), 32)


})


test('Context - executes standard keyboard event Capture, Target, and Bubble pipeline', () => {
  const eventsCaptured = []

  const vdomRoot = {
    id: 'root-container',
    onKeyPreview: (ctx, ev) => { eventsCaptured.push(`preview-root:${ev.key}`) },
    onKeyBubble: (ctx, ev) => { eventsCaptured.push(`bubble-root:${ev.key}`) },
    inner: [
      {
        id: 'parent-box',
        onKeyPreview: (ctx, ev) => {
          eventsCaptured.push(`preview-parent:${ev.key}`)
          if (ev.key === 'escape') ev.stopPropagation() // halt propagation early on preview!
        },
        onKeyBubble: (ctx, ev) => { eventsCaptured.push(`bubble-parent:${ev.key}`) },
        inner: [
          {
            id: 'textbox',
            focusable: true,
            onKey: (ctx, ev) => { eventsCaptured.push(`target-textbox:${ev.key}`) },
            onKeyBubble: (ctx, ev) => { eventsCaptured.push(`bubble-textbox:${ev.key}`) }
          }
        ]
      }
    ]
  }

  const ctx = ContextFactory({
    vdomRoot,
    focusedId: 'textbox'
  })

  // 1. Standard keypress dispatch (no stopping)
  ctx.dispatchKey(parseKeyPress('a'))

  assert.deepStrictEqual(eventsCaptured, [
    'preview-root:a',
    'preview-parent:a',
    'target-textbox:a',
    'bubble-textbox:a',
    'bubble-parent:a',
    'bubble-root:a'
  ])

  // Clear log
  eventsCaptured.length = 0

  // 2. Intercept and halt propagation on Escape in parent preview phase
  ctx.dispatchKey(parseKeyPress('\x1b', { name: 'escape' }))

  // Should halt after preview-parent and never fire target or bubble events!
  assert.deepStrictEqual(eventsCaptured, [
    'preview-root:escape',
    'preview-parent:escape'
  ])
})
