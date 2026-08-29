const formatTimestamp = (ts) => {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const initialChannels = [
  { id: 'general', name: '# general', unread: 0 },
  { id: 'agent-console', name: '# agent-console', unread: 2 },
  { id: 'deployments', name: '# deployments', unread: 0 },
]

const initialMessages = {
  general: [
    { sender: 'System', text: 'Welcome to the TUI reference chat!', time: Date.now() - 60000, system: true },
    { sender: 'Team Member', text: 'Welcome to the new TUI console!', time: Date.now() - 30000 },
  ],
  'agent-console': [
    { sender: 'System', text: 'Connected to local Agent Daemon v1.0.0', time: Date.now() - 120000, system: true },
    { sender: 'Agent', text: 'Ready for instructions. Try typing a question, task, or multiline code.', time: Date.now() - 90000, agent: true },
  ],
  deployments: [
    { sender: 'CI/CD', text: 'Package @sullux/tui published successfully to registry.', time: Date.now() - 300000, success: true },
  ],
}

const createChatState = () => ({
  channels: initialChannels,
  activeChannel: 'agent-console',
  messages: initialMessages,
  showHelp: false,
})

const chatHandlerFactory = (state) => {
  const getActiveMessages = () => state.messages[state.activeChannel] || []

  const getMessageNodes = () => {
    const list = getActiveMessages()
    return list.map((msg) => {
      const isUser = msg.sender === 'User'
      const timeStr = formatTimestamp(msg.time)

      let headerFg = '#e0af68'
      let headerPrefix = ''
      let bg = '#191d2c'

      if (isUser) {
        bg = '#162b4d'
        headerFg = '#7aa2f7'
        headerPrefix = '● '
      } else if (msg.system) {
        bg = '#151524'
        headerFg = '#bb9af7'
        headerPrefix = '⚙ '
      } else if (msg.agent) {
        bg = '#132133'
        headerFg = '#7dcfff'
        headerPrefix = '🤖 '
      } else if (msg.success) {
        bg = '#12221b'
        headerFg = '#9ece6a'
        headerPrefix = '✔ '
      }

      return {
        type: 'layout',
        direction: 'vertical',
        bg,
        padding: isUser
          ? { top: 1, bottom: 1, left: 6, right: 1 }
          : { top: 1, bottom: 1, left: 1, right: 6 },
        inner: [
          {
            type: 'rich',
            inner: [
              { type: 'text', text: `[${timeStr}] `, fg: '#565f89' },
              { type: 'text', text: `${headerPrefix}${msg.sender}: `, bold: true, fg: headerFg },
              {
                type: 'text',
                text: msg.text,
                fg: isUser ? '#e2e8f0' : (msg.system ? '#a9b1d6' : (msg.success ? '#9ece6a' : '#c0caf5')),
                italic: !!msg.system,
              },
            ],
          },
        ],
      }
    })
  }

  const getChannelNodes = () => {
    return state.channels.map((chan) => {
      const isActive = chan.id === state.activeChannel
      return {
        type: 'text',
        text: `${isActive ? '▶ ' : '  '}${chan.name}${chan.unread > 0 ? ` (${chan.unread})` : ''}\n`,
        bold: isActive,
        fg: isActive ? '#7aa2f7' : '#9aa5ce',
        bg: isActive ? '#24283b' : undefined,
      }
    })
  }

  const getActiveChannelTitle = () => {
    const chan = state.channels.find((c) => c.id === state.activeChannel)
    return chan ? chan.name : '# chat'
  }

  const onSubmitMessage = (ctx, payload) => {
    const val = payload.value?.trim()
    if (payload.node) {
      payload.node.value = ''
      payload.node.cursor = 0
    }
    if (!val) return

    if (val === '/help') {
      state.showHelp = !state.showHelp
      ctx.redraw()
      return
    }

    if (val === '/clear') {
      state.messages[state.activeChannel] = []
      ctx.redraw()
      return
    }

    const currentChan = state.activeChannel
    const userMsg = { sender: 'User', text: val, time: Date.now() }
    state.messages[currentChan] = [...(state.messages[currentChan] || []), userMsg]

    if (currentChan === 'agent-console') {
      setTimeout(() => {
        const reply = {
          sender: 'Agent',
          text: `Processed task: "${val}". Status: completed with 0 errors.`,
          time: Date.now(),
          agent: true,
        }
        state.messages[currentChan] = [...(state.messages[currentChan] || []), reply]
        ctx.redraw()
      }, 600)
    }

    ctx.redraw()
  }

  const onSelectChannel = (ctx, channelId) => {
    state.activeChannel = channelId
    ctx.redraw()
  }

  const toggleHelp = (ctx) => {
    state.showHelp = !state.showHelp
    ctx.redraw()
  }

  const onGlobalKey = (ctx, event) => {
    if (event.key === 'ctrl+q') {
      process.exit(0)
    }

    if (event.key === 'tab') {
      event.stopPropagation()
      const chanIdx = state.channels.findIndex((c) => c.id === state.activeChannel)
      const nextIdx = (chanIdx + 1) % state.channels.length
      state.activeChannel = state.channels[nextIdx].id
      ctx.redraw()
    }
  }

  return {
    state,
    getActiveMessages,
    getMessageNodes,
    getChannelNodes,
    getActiveChannelTitle,
    onSubmitMessage,
    onSelectChannel,
    onGlobalKey,
    toggleHelp,
  }
}

module.exports = {
  createChatState,
  chatHandlerFactory,
}
