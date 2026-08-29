const path = require('node:path')
const { Tui } = require('../../index')
const { createChatState, chatHandlerFactory } = require('./handlers')

const state = createChatState()
const handlers = chatHandlerFactory(state)

const app = Tui({
  view: path.join(__dirname, 'view.yaml'),
  modules: {
    handlers,
  },
})

app.start()
