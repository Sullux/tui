const test = require('node:test')
const assert = require('node:assert')
const { Writable, Readable } = require('node:stream')
const { Tui } = require('../index')

const createMockStdin = () => {
  const s = new Readable({ read() {} })
  s.isTTY = true
  s.setRawMode = () => {}
  return s
}

const createMockStdout = () => {
  const s = new Writable({
    write(chunk, encoding, callback) {
      this.data = (this.data || '') + chunk.toString()
      if (callback) callback()
    }
  })
  s.columns = 80
  s.rows = 24
  return s
}

const waitTick = () => new Promise(resolve => setImmediate(resolve))
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;?]*[a-zA-Z]/g, '')

test('Tui Factory - can initialize, start and cleanly stop with mock streams', async () => {
  const stdin = createMockStdin()
  const stdout = createMockStdout()

  const view = {
    type: 'layout',
    id: 'root',
    inner: [
      {
        type: 'text',
        id: 'label',
        text: 'Test Dashboard'
      }
    ]
  }

  const app = Tui({
    view,
    stdin,
    stdout,
    truecolor: false
  })

  let exited = false
  let exitErr = null
  app.onExit((err) => {
    exited = true
    exitErr = err
  })

  // Start the application
  app.start()
  
  // Wait for asynchronous paint tick
  await waitTick()

  // Verify that start initialized the alternate screen buffer and cleared/painted elements
  assert.ok(stdout.data.includes('\x1b[?1049h') || stdout.data.includes('\u001b[?1049h')) // Entered alternate screen buffer
  
  const cleanData = stripAnsi(stdout.data)
  assert.ok(cleanData.includes('Test Dashboard')) // Painted layout content

  // Manually trigger a stop
  app.stop()

  assert.strictEqual(exited, true)
  assert.strictEqual(exitErr, null)
  assert.ok(stdout.data.includes('\x1b[?1049l') || stdout.data.includes('\u001b[?1049l')) // Restored main screen buffer
})

test('Tui Factory - supports virtual modules and dynamically resolves variables on redraw', async () => {
  const stdin = createMockStdin()
  const stdout = createMockStdout()

  let mockCount = 100

  const view = {
    type: 'layout',
    id: 'root',
    inner: [
      {
        type: 'text',
        id: 'countLabel',
        text: '@appModule:getCount'
      }
    ]
  }

  const app = Tui({
    view,
    stdin,
    stdout,
    truecolor: false,
    modules: {
      appModule: {
        getCount: () => `Count: ${mockCount}`
      }
    }
  })

  app.start()
  
  // Wait for initial paint
  await waitTick()

  // Assert first paint has original value
  const cleanData1 = stripAnsi(stdout.data)
  assert.ok(cleanData1.includes('Count: 100'))
  assert.strictEqual(app.ctx.elementById('countLabel').text, 'Count: 100')

  // Update mock state and force redrawing
  mockCount = 250
  app.redraw()

  // Wait for setImmediate microtask queue to execute the frame repaint
  await waitTick()
  
  // Assert direct compiled state after redraw
  assert.strictEqual(app.ctx.elementById('countLabel').text, 'Count: 250')
  app.stop()
})

test('Tui Factory - routes keypress events through the focus pipeline', async () => {
  const stdin = createMockStdin()
  const stdout = createMockStdout()

  let keyTriggered = false
  let pressedKeyName = null

  const view = {
    type: 'layout',
    id: 'root',
    inner: [
      {
        type: 'text',
        id: 'inputBox',
        focusable: true,
        onKey: (ctx, event) => {
          keyTriggered = true
          pressedKeyName = event.key
        }
      }
    ]
  }

  const app = Tui({
    view,
    stdin,
    stdout,
    truecolor: false
  })

  app.start()
  
  // Wait for initial paint to compile VDOM & register standard programmatic focus
  await waitTick()

  // Root layout focused the first focusable node automatically
  assert.strictEqual(app.ctx.focusedId, 'inputBox')

  // Simulate keypress event directly on mock stdin stream
  stdin.emit('keypress', 'a', { name: 'a' })

  assert.strictEqual(keyTriggered, true)
  assert.strictEqual(pressedKeyName, 'a')

  app.stop()
})

test('Tui Factory - passes valid ctx to $ function invocations during redraw', async () => {
  const stdin = createMockStdin()
  const stdout = createMockStdout()

  let receivedCtx = null

  const view = {
    type: 'layout',
    id: 'root',
    inner: {
      '$testModule:renderItem': {
        type: 'text',
        text: 'Item Text'
      }
    }
  }

  const app = Tui({
    view,
    stdin,
    stdout,
    truecolor: false,
    modules: {
      testModule: {
        renderItem: (ctx, args) => {
          receivedCtx = ctx
          return {
            ...args,
            text: ctx ? ctx.breakAfterChar('Hello World', 5).text : 'FAILED'
          }
        }
      }
    }
  })

  app.start()
  await waitTick()

  assert.ok(receivedCtx !== null)
  assert.strictEqual(typeof receivedCtx.breakAfterChar, 'function')

  const cleanData = stripAnsi(stdout.data)
  assert.ok(cleanData.includes('Hello'))

  app.stop()
})

