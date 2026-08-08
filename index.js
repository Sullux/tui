const { LoaderFactory } = require('./lib/loader')
const { solveLayout } = require('./lib/layout')
const { ContextFactory } = require('./lib/context')
const { ControlCompiler, Control } = require('./lib/control')
const Tui = require('./lib/tui')
const types = require('./lib/types')
const { KEY, keyToChar, parseKeyPress, KeyHandler } = require('./lib/keyboard')

const paintNode = (grid, node) => {
  if (!node || node.isVisible === false) return
  if (node.control && typeof node.control.onRender === 'function') {
    node.control.onRender(node, grid)
  }
}

module.exports = {
  LoaderFactory,
  solveLayout,
  ContextFactory,
  ControlCompiler,
  Control,
  paintNode,
  Tui,
  App: Tui, // alias for flexible DX
  types,
  KEY,
  keyToChar,
  parseKeyPress,
  KeyHandler,
}
