// Context, Focus and Keyboard Event Dispatch Engine

const isEnabled = (node) => {
  let current = node
  while (current) {
    if (current.enabled === false || current.isEnabled === false || current.disabled === true) {
      return false
    }
    current = current.parent
  }
  return true
}

const gatherFocusable = (node, parentWeightPath = []) => {
  if (!node || node.isVisible === false) return []

  const localWeight = node.order !== undefined ? Number(node.order) : 100000
  const currentWeightPath = [...parentWeightPath, localWeight]

  const results = []

  // Check if this node itself is focusable and recursively enabled
  const isFocusableNode = (node.focusable || node.canFocus) && node.focusable !== false && isEnabled(node)
  
  if (isFocusableNode) {
    results.push({
      node,
      path: currentWeightPath
    })
  }

  // Descend recursively into children
  if (node.inner) {
    const children = Array.isArray(node.inner) ? node.inner : [node.inner]
    
    // Stable sort local children by order so natural DFS traversal matches defined linear sequences
    const sortedChildren = [...children].map((child, idx) => ({ child, idx })).sort((a, b) => {
      const orderA = a.child.order !== undefined ? Number(a.child.order) : 100000 + a.idx
      const orderB = b.child.order !== undefined ? Number(b.child.order) : 100000 + b.idx
      return orderA - orderB
    }).map(item => item.child)

    sortedChildren.forEach(child => {
      results.push(...gatherFocusable(child, currentWeightPath))
    })
  }

  return results
}

// Pre-order traversal to gather all eligible focusable nodes in layout reading order sorted lexicographically
const getFocusableElements = (rootNode) => {
  const list = gatherFocusable(rootNode)
  
  // Lexicographical sequence path sort
  list.sort((a, b) => {
    const len = Math.max(a.path.length, b.path.length)
    for (let i = 0; i < len; i++) {
      const valA = a.path[i] !== undefined ? a.path[i] : -1
      const valB = b.path[i] !== undefined ? b.path[i] : -1
      if (valA !== valB) {
        return valA - valB
      }
    }
    return 0
  })

  return list.map(item => item.node)
}

// Builds the structural path from root down to a specific target node or ID
const buildNodePath = (rootNode, target) => {
  if (!rootNode) return []
  if (!target || target === rootNode || target === rootNode.id) return [rootNode]

  const targetId = typeof target === 'string' ? target : target.id
  const path = []

  const find = (node) => {
    path.push(node)
    if ((targetId && node.id === targetId) || node === target) return true

    if (node.inner) {
      const children = Array.isArray(node.inner) ? node.inner : [node.inner]
      for (const child of children) {
        if (find(child)) return true
      }
    }
    path.pop()
    return false
  }

  if (find(rootNode)) return path
  return [rootNode]
}

// Context factory providing transactional helper APIs to event handlers
const ContextFactory = (state = {}) => {
  if (!state.cellPx) state.cellPx = { width: 10, height: 20 }
  const getRoot = () => state.vdomRoot
  const triggerRedraw = () => {
    if (state.onRedrawNeeded) state.onRedrawNeeded()
  }

  // Locates any element recursively in the tree by ID
  const elementById = (id) => {
    let found = null
    const traverse = (node) => {
      if (!node) return
      const target = node
      if (target.id === id) {
        found = target
        return
      }
      if (target.inner) {
        const children = Array.isArray(target.inner) ? target.inner : [target.inner]
        for (const child of children) {
          traverse(child)
          if (found) return
        }
      }
    }
    traverse(getRoot())
    return found
  }

  // Gathers all elements containing the specified tag
  const elementsTagged = (tag) => {
    const results = []
    const traverse = (node) => {
      if (!node) return
      const target = node
      if (target.tags && target.tags.includes(tag)) {
        results.push(target)
      }
      if (target.inner) {
        const children = Array.isArray(target.inner) ? target.inner : [target.inner]
        children.forEach(traverse)
      }
    }
    traverse(getRoot())
    return results
  }

  // Gathers all elements matching a custom predicate
  const elementsMatching = (predicateFn) => {
    const results = []
    const traverse = (node) => {
      if (!node) return
      const target = node
      if (predicateFn(target)) {
        results.push(target)
      }
      if (target.inner) {
        const children = Array.isArray(target.inner) ? target.inner : [target.inner]
        children.forEach(traverse)
      }
    }
    traverse(getRoot())
    return results
  }

  // Sets Programmatic focus with blur/focus triggers
  const setFocus = (id) => {
    if (state.focusedId === id) return

    const oldFocused = state.focusedId ? elementById(state.focusedId) : null
    const newFocused = id ? elementById(id) : null

    if (oldFocused && oldFocused.onBlur) {
      oldFocused.onBlur(ctx, { targetId: state.focusedId })
    }

    state.focusedId = id

    if (newFocused && newFocused.onFocus) {
      newFocused.onFocus(ctx, { targetId: id })
    }

    triggerRedraw()
  }

  // Cycle focus forwards
  const focusNext = () => {
    const list = getFocusableElements(getRoot())
    if (list.length === 0) return

    const idx = list.findIndex(e => e.id === state.focusedId)
    const nextIdx = idx === -1 || idx === list.length - 1 ? 0 : idx + 1
    setFocus(list[nextIdx].id)
  }

  // Cycle focus backwards
  const focusPrev = () => {
    const list = getFocusableElements(getRoot())
    if (list.length === 0) return

    const idx = list.findIndex(e => e.id === state.focusedId)
    const prevIdx = idx === -1 || idx === 0 ? list.length - 1 : idx - 1
    setFocus(list[prevIdx].id)
  }

  // Keyboard Event Dispatch Pipeline (Capture ➡️ Target ➡️ Bubble)
  const dispatchKey = (keyPayload) => {
    const root = getRoot()
    if (!root) return

    const targetNode = state.focusedId ? elementById(state.focusedId) : root
    const pathList = buildNodePath(root, targetNode)
    if (pathList.length === 0) return

    const activeTargetId = (targetNode && targetNode.id) || state.focusedId || root.id || null

    let propagationStopped = false
    let defaultPrevented = false

    const event = {
      ...keyPayload,
      targetId: activeTargetId,
      stopPropagation: () => { propagationStopped = true },
      preventDefault: () => { defaultPrevented = true },
      get isPropagationStopped() { return propagationStopped },
      get isDefaultPrevented() { return defaultPrevented },
    }

    // 1. Capture / Preview Phase (traverse DOWNWARD from Root to Target)
    for (let i = 0; i < pathList.length; i++) {
      const node = pathList[i]
      if (node.onKeyPreview) {
        node.onKeyPreview(ctx, event)
        if (event.isPropagationStopped) return event
      }
    }

    // 2. Target Phase (Fires DIRECTLY on target node)
    const leafTarget = pathList[pathList.length - 1]
    if (leafTarget && leafTarget.onKey) {
      leafTarget.onKey(ctx, event)
    }

    if (event.isPropagationStopped) return event

    // 3. Bubble Phase (traverse UPWARD from target node to Root)
    for (let i = pathList.length - 1; i >= 0; i--) {
      const node = pathList[i]
      if (node.onKeyBubble) {
        node.onKeyBubble(ctx, event)
        if (event.isPropagationStopped) return event
      }
    }

    return event
  }

  const types = require('./types')
  const { breakAfterChar, visualWidth, isWideChar, sanitizeText } = require('./string-utils')

  const getMargin = (activeCtx, node) => {
    const target = node || activeCtx.element || activeCtx._
    return types.Margin(target)
  }

  const getPadding = (activeCtx, node) => {
    const target = node || activeCtx.element || activeCtx._
    return types.Padding(target)
  }

  const measureInnerWidth = (activeCtx, node) => {
    const target = node || activeCtx.element || activeCtx._
    const defaultW = (typeof process !== 'undefined' && process.stdout && process.stdout.columns) || 80
    if (!target) return defaultW

    const { width } = types.Size(target)
    let w = defaultW

    if (width.type === 'absolute') {
      w = Math.min(width.value, defaultW)
    } else if (width.type === 'percent') {
      const parentW = target.parent ? measureInnerWidth(activeCtx, target.parent) : defaultW
      w = Math.round(parentW * width.value)
    } else if (target.parent) {
      w = measureInnerWidth(activeCtx, target.parent)
    }

    const pad = getPadding(activeCtx, target)
    const mar = getMargin(activeCtx, target)
    return Math.max(0, w - (pad.l + pad.r) - (mar.l + mar.r))
  }

  const measureInnerHeight = (activeCtx, node) => {
    const target = node || activeCtx.element || activeCtx._
    const defaultH = (typeof process !== 'undefined' && process.stdout && process.stdout.rows) || 24
    if (!target) return defaultH

    const { height } = types.Size(target)
    let h = defaultH

    if (height.type === 'absolute') {
      h = Math.min(height.value, defaultH)
    } else if (height.type === 'percent') {
      const parentH = target.parent ? measureInnerHeight(activeCtx, target.parent) : defaultH
      h = Math.round(parentH * height.value)
    } else if (target.parent) {
      h = measureInnerHeight(activeCtx, target.parent)
    }

    const pad = getPadding(activeCtx, target)
    const mar = getMargin(activeCtx, target)
    return Math.max(0, h - (pad.t + pad.b) - (mar.t + mar.b))
  }

  const createScopedContext = (baseCtx, activeNode) => {
    if (!baseCtx) return null
    const scopedCtx = {
      ...baseCtx,
      element: activeNode,
      _: activeNode,
      parent: activeNode?.parent || null,
    }

    scopedCtx.getMargin = (node) => getMargin(scopedCtx, node)
    scopedCtx.getPadding = (node) => getPadding(scopedCtx, node)
    scopedCtx.measureInnerWidth = (node) => measureInnerWidth(scopedCtx, node)
    scopedCtx.measureInnerHeight = (node) => measureInnerHeight(scopedCtx, node)

    return scopedCtx
  }

  // The active transactional context
  const ctx = {
    element: null,
    _: null,
    parent: null,

    get cellPx() { return state.cellPx || { width: 10, height: 20 } },
    set cellPx(val) { if (val && val.width && val.height) state.cellPx = { width: val.width, height: val.height } },
    get focusedId() { return state.focusedId },
    elementById,
    elementsTagged,
    elementsMatching,
    setFocus,
    focusNext,
    focusPrev,
    dispatchKey,
    triggerRedraw,
    redraw: triggerRedraw,
    createScopedContext: (activeNode) => createScopedContext(ctx, activeNode),

    // String utilities
    breakAfterChar,
    visualWidth,
    isWideChar,
    sanitizeText,

    // Geometry & dimension measurement helpers
    resolveMeasure: types.resolveMeasure,
    parseMeasure: types.Measure,
    parseSize: types.Size,
    parseMargin: types.Margin,
    parsePoint: types.Point,
    parseBounds: types.Bounds,
    parseOrientation: types.Orientation,
    parseHAlign: types.HAlign,
    parseVAlign: types.VAlign,
    parseColor: types.Color,
    parseScale: types.Scale,
  }

  ctx.getMargin = (node) => getMargin(ctx, node)
  ctx.getPadding = (node) => getPadding(ctx, node)
  ctx.measureInnerWidth = (node) => measureInnerWidth(ctx, node)
  ctx.measureInnerHeight = (node) => measureInnerHeight(ctx, node)

  return ctx
}

module.exports = {
  getFocusableElements,
  buildNodePath,
  ContextFactory,
}
