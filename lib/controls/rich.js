// Rich Text Control supporting inline elements, text chopping, and Wrap layout delegation
const { breakAfterChar, visualWidth, sanitizeText } = require('../string-utils')
const Wrap = require('./wrap')
const Box = require('./box')

// Legacy tokenizer function retained for backward compatibility
const tokenizeSpans = (spans = [], parentNode) => {
  const tokens = []

  spans.forEach(span => {
    if (!span || !span.text) return

    const resolvedSpan = {
      bg: span.bg || parentNode.bg,
      fg: span.fg || parentNode.fg,
      bold: span.bold || parentNode.bold,
      underline: span.underline || parentNode.underline,
      italic: span.italic || parentNode.italic,
    }

    const textStr = sanitizeText(String(span.text))
    const chars = Array.from(textStr)
    let i = 0

    while (i < chars.length) {
      const char = chars[i]

      if (char === '\n') {
        tokens.push({ type: 'newline', span: resolvedSpan })
        i++
      } else if (char === ' ') {
        let spaces = ''
        while (i < chars.length && chars[i] === ' ') {
          spaces += ' '
          i++
        }
        tokens.push({ type: 'text', text: spaces, span: resolvedSpan })
      } else {
        let word = ''
        while (i < chars.length && chars[i] !== ' ' && chars[i] !== '\n') {
          word += chars[i]
          i++
        }
        tokens.push({ type: 'text', text: word, span: resolvedSpan })
      }
    }
  })

  return tokens
}

// Pre-processes children: chops long text nodes using breakAfterChar based on maxWidth
const prepareFlowChildren = (node, maxWidth) => {
  const children = node.inner ? (Array.isArray(node.inner) ? node.inner : [node.inner]) : []
  const { measureNode } = require('../layout')
  const { ControlCompiler } = require('../control')
  const compiler = ControlCompiler()

  const flowItems = []
  let currentLineWidth = 0

  children.forEach(child => {
    if (child.type === 'text' || typeof child.text === 'string') {
      let remainingText = child.text
      const baseStyle = {
        bg: child.bg || node.bg,
        fg: child.fg || node.fg,
        bold: child.bold || node.bold,
        italic: child.italic || node.italic,
        underline: child.underline || node.underline,
      }

      while (typeof remainingText === 'string' && remainingText.length > 0) {
        let availableWidth = Math.max(1, maxWidth - currentLineWidth)
        let breakRes = breakAfterChar(remainingText, availableWidth)

        if (breakRes.isHardBreak && currentLineWidth > 0 && breakRes.text.length < remainingText.length) {
          currentLineWidth = 0
          availableWidth = maxWidth
          breakRes = breakAfterChar(remainingText, availableWidth)
        }

        if (breakRes.text.length > 0) {
          const itemNode = compiler.compileNode({
            type: 'text',
            ...baseStyle,
            text: breakRes.text,
            parent: node,
          })
          flowItems.push(itemNode)
          currentLineWidth += visualWidth(breakRes.text)
        }

        if (breakRes.extra.length > 0) {
          currentLineWidth = 0
          remainingText = breakRes.extra
        } else {
          break
        }
      }
    } else {
      const childSize = measureNode(child, { maxWidth, maxHeight: Infinity })
      if (currentLineWidth > 0 && currentLineWidth + childSize.width > maxWidth) {
        currentLineWidth = 0
      }
      flowItems.push(child)
      currentLineWidth += childSize.width
    }
  })

  return flowItems
}

const onMeasure = (node, constraints) => {
  const maxWidth = constraints.maxWidth || Infinity
  const flowItems = prepareFlowChildren(node, maxWidth)

  const wrapNode = {
    ...node,
    direction: 'horizontal',
    inner: flowItems,
  }

  node._flowItems = flowItems
  return Wrap.onMeasure(wrapNode, constraints)
}

const onLayout = (node, innerBox) => {
  const flowItems = node._flowItems || prepareFlowChildren(node, innerBox.width)
  node._flowItems = flowItems

  const wrapNode = {
    ...node,
    direction: 'horizontal',
    inner: flowItems,
  }

  Wrap.onLayout(wrapNode, innerBox)
}

const onRender = (node, grid) => {
  Box.paintBackground(grid, node)
  const children = node._flowItems || []
  children.forEach(child => {
    if (child.control && typeof child.control.onRender === 'function') {
      child.control.onRender(child, grid)
    }
  })
}

module.exports = {
  tokenizeSpans,
  prepareFlowChildren,
  onMeasure,
  onLayout,
  onRender,
}
