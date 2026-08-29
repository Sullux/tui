const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { Readable, Writable } = require('node:stream')
const { Tui } = require('../index')
const { createChatState, chatHandlerFactory } = require('../examples/chat/handlers')

test('Examples - Chat App boots, renders view, and processes interactive messages', async () => {
  const stdin = new Readable({ read() {} })
  stdin.isTTY = true
  stdin.setRawMode = () => {}

  let outputBuffer = ''
  const stdout = new Writable({
    write(chunk, enc, cb) {
      outputBuffer += chunk.toString()
      if (cb) cb()
    }
  })
  stdout.columns = 100
  stdout.rows = 30

  const state = createChatState()
  const handlers = chatHandlerFactory(state)

  const app = Tui({
    view: path.join(__dirname, '../examples/chat/view.yaml'),
    modules: {
      handlers,
    },
    stdin,
    stdout,
    truecolor: false,
  })

  app.start()
  await new Promise((r) => setImmediate(r))

  // console.log('BUFFER IS:', JSON.stringify(outputBuffer))
  assert.ok(outputBuffer.length > 0)

  // Send a chat message
  handlers.onSubmitMessage(app.ctx, { value: 'List active deployments' })
  assert.strictEqual(state.messages['agent-console'].length, 3)
  assert.strictEqual(state.messages['agent-console'][2].text, 'List active deployments')

  // Switch channel with Tab
  handlers.onGlobalKey(app.ctx, { key: 'tab', stopPropagation() {} })
  assert.strictEqual(state.activeChannel, 'deployments')

  // Type into the focused input box
  stdin.emit('keypress', 'H', { name: 'h' })
  stdin.emit('keypress', 'e', { name: 'e' })
  stdin.emit('keypress', 'l', { name: 'l' })
  stdin.emit('keypress', 'l', { name: 'l' })
  stdin.emit('keypress', 'o', { name: 'o' })
  assert.strictEqual(app.ctx.elementById('chatInput').value, 'Hello')

  // Ctrl+C clears input
  stdin.emit('keypress', '\x03', { name: 'c', ctrl: true })
  assert.strictEqual(app.ctx.elementById('chatInput').value, '')

  // Type new message with Shift+Enter for multiline
  stdin.emit('keypress', 'L', { name: 'l' })
  stdin.emit('keypress', '1', { name: '1' })
  stdin.emit('keypress', '\x1b[13;2u', { name: 'enter', shift: true })
  stdin.emit('keypress', 'L', { name: 'l' })
  stdin.emit('keypress', '2', { name: '2' })
  assert.strictEqual(app.ctx.elementById('chatInput').value, 'L1\nL2')

  // Press Enter to submit message
  stdin.emit('keypress', '\r', { name: 'enter' })
  await new Promise((r) => setTimeout(r, 50))

  assert.strictEqual(state.messages['deployments'].length, 2)
  assert.strictEqual(state.messages['deployments'][1].text, 'L1\nL2')
  assert.strictEqual(state.messages['deployments'][1].sender, 'User')
  assert.strictEqual(app.ctx.elementById('chatInput').value, '')

  app.stop()

  app.stop()
})
