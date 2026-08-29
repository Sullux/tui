// Turnkey Declarative TUI Application Factory
const readline = require('node:readline')
const { LoaderFactory } = require('./loader')
const { ControlCompiler } = require('./control')
const { solveLayout } = require('./layout')
const { ContextFactory, getFocusableElements } = require('./context')
const { ScreenRenderer } = require('./renderer')
const { parseKeyPress, parseInputChunk } = require('./keyboard')

const paintNode = (grid, node) => {
  if (!node || node.isVisible === false) return
  if (node.control && typeof node.control.onRender === 'function') {
    node.control.onRender(node, grid)
  }
}

const Tui = (options = {}) => {
  const stdin = options.stdin || process.stdin
  const stdout = options.stdout || process.stdout
  const truecolor = options.truecolor !== false
  const initialAppState = options.state || {}

  // 1. Instantiate the loader, compiler, and renderer
  const loader = LoaderFactory({ modules: options.modules })
  const compiler = ControlCompiler({ truecolor })
  const screen = ScreenRenderer(stdout)

  // 2. Load the view layout (supports paths or pre-parsed structures)
  let rawMarkup
  if (typeof options.view === 'string') {
    rawMarkup = loader.loadFile(options.view)
  } else if (options.view && typeof options.view === 'object') {
    rawMarkup = loader.walkAndResolve(options.view, process.cwd())
  } else {
    throw new Error('Tui options must specify a "view" file path or object structure.')
  }

  // 3. Persistent runtime state
  const tuiState = {
    vdomRoot: null,
    focusedId: initialAppState.focusedId || null,
    appState: initialAppState,
    onRedrawNeeded: null,
  }

  // Create transactional context
  const ctx = ContextFactory(tuiState)

  // Bind context redraw triggers to our renderer's redraw queue
  tuiState.onRedrawNeeded = () => {
    redraw()
  }

  const exitCallbacks = []
  let running = false
  let redrawPending = false

  const actualRedraw = () => {
    if (!running) return

    const cols = stdout.columns || 80
    const rows = stdout.rows || 24

    // Compile node tree to capture state transitions & evaluate dynamic values
    const compiledTree = compiler.compileNode(rawMarkup, ctx)
    tuiState.vdomRoot = compiledTree

    // Gathers and sets containsFocus and hasFocus recursively on the compiled node tree
    let focusedNode = null
    const traverseAndSetFocus = (node) => {
      node.hasFocus = !!(node.id && node.id === tuiState.focusedId)
      if (node.hasFocus) {
        focusedNode = node
      }
      node.containsFocus = false
      if (node.inner) {
        const children = Array.isArray(node.inner) ? node.inner : [node.inner]
        children.forEach(traverseAndSetFocus)
      }
    }
    traverseAndSetFocus(compiledTree)

    // Bubble up containsFocus from focusedNode to root parent chain
    let currentFocusNode = focusedNode
    while (currentFocusNode) {
      currentFocusNode.containsFocus = true
      currentFocusNode = currentFocusNode.parent
    }

    // Solve absolute positions
    solveLayout(compiledTree, { x: 0, y: 0, width: cols, height: rows })

    // Allocate 2D double-buffered grid cells
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ char: ' ', style: '' }))
    )
    grid.ctx = ctx

    // Paint nodes onto character grid
    paintNode(grid, compiledTree)

    // Flush changes to terminal screen via double-buffered diffing
    screen.draw(grid)
  }

  const redraw = () => {
    if (!running) return
    if (redrawPending) return
    redrawPending = true
    setImmediate(() => {
      redrawPending = false
      actualRedraw()
    })
  }

  const inputState = { pasteBuffer: null }

  const handleKeyPayload = (keyPayload) => {
    const event = ctx.dispatchKey(keyPayload)

    // Built-in exit for unhandled Ctrl+C or Ctrl+Q
    if (
      (keyPayload.ctrl && keyPayload.key === 'c' && !event?.isDefaultPrevented && !event?.isPropagationStopped) ||
      (keyPayload.ctrl && keyPayload.key === 'q' && !event?.isDefaultPrevented && !event?.isPropagationStopped)
    ) {
      stop()
      process.exit(0)
    }
  }

  const onData = (chunk) => {
    if (!running) return
    const events = parseInputChunk(chunk, inputState)
    for (const keyPayload of events) {
      handleKeyPayload(keyPayload)
    }
  }

  // Handle keyboard inputs for non-TTY or simulated streams
  const onKeypress = (str, key) => {
    if (!running) return
    const keyPayload = parseKeyPress(str, key)
    handleKeyPayload(keyPayload)
  }

  // Handle window resizing cleanly
  const onResize = () => {
    if (!running) return
    screen.reset()
    redraw()
  }

  const restoreTerminal = () => {
    try {
      stdout.write('\x1b[?1049l\x1b[?25h\x1b[?2004l\x1b[>4;0m\x1b[<u\x1b[0m')
    } catch (_) {}
  }

  const onProcessExit = () => {
    restoreTerminal()
  }

  const onSignalExit = () => {
    stop()
    process.exit(0)
  }

  // 4. API Endpoints
  const start = () => {
    if (running) return
    running = true

    process.once('exit', onProcessExit)
    process.once('SIGINT', onSignalExit)
    process.once('SIGTERM', onSignalExit)

    // Enter Alternate Buffer, hide cursor, enable bracketed paste, and enable enhanced keyboard protocols
    stdout.write('\x1b[?1049h\x1b[?25l\x1b[?2004h\x1b[>4;2m\x1b[>1u')
    screen.invalidate()

    // Setup TTY Raw mode if standard streams allow
    if (stdin.isTTY) {
      stdin.setRawMode(true)
      stdin.on('data', onData)
    } else {
      readline.emitKeypressEvents(stdin)
    }
    stdin.resume()
    stdin.setEncoding('utf8')

    stdin.on('keypress', onKeypress)
    stdout.on('resize', onResize)

    // Automatically focus the first focusable component
    if (!tuiState.focusedId) {
      const compiled = compiler.compileNode(rawMarkup, ctx)
      const focusable = getFocusableElements(compiled)
      if (focusable.length > 0) {
        tuiState.focusedId = focusable[0].id
      }
    }

    // Trigger initial paint
    redraw()
  }

  const stop = (err = null) => {
    if (!running) return
    running = false

    process.removeListener('exit', onProcessExit)
    process.removeListener('SIGINT', onSignalExit)
    process.removeListener('SIGTERM', onSignalExit)

    // Tear down event listeners
    if (stdin.isTTY) {
      stdin.removeListener('data', onData)
    }
    stdin.removeListener('keypress', onKeypress)
    stdout.removeListener('resize', onResize)
    if (stdin.isTTY) {
      stdin.setRawMode(false)
    }
    stdin.pause()

    // Restore Main Buffer and reveal hardware cursor
    restoreTerminal()

    // Run clean exit callbacks
    for (const cb of exitCallbacks) {
      try {
        cb(err)
      } catch (cbErr) {
        // Silently preserve exit loop integrity
      }
    }
  }

  const onExit = (cb) => {
    if (typeof cb === 'function') {
      exitCallbacks.push(cb)
    }
  }

  return {
    start,
    stop,
    redraw,
    onExit,
    get ctx() { return ctx },
    get compiler() { return compiler },
    get loader() { return loader },
  }
}

module.exports = Tui
