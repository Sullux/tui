// Control Normalization and Compilation Layer

const defaultControls = {
  layout: require('./controls/layout'),
  canvas: require('./controls/canvas'),
  scroll: require('./controls/scroll'),
  stack: require('./controls/stack'),
  wrap: require('./controls/wrap'),
  text: require('./controls/text'),
  rich: require('./controls/rich'),
  border: require('./controls/border'),
  image: require('./controls/image'),
  input: require('./controls/input'),
  caret: require('./controls/caret'),
}

const isPlainObject = (obj) =>
  obj && typeof obj === 'object' && (obj.constructor === Object || !obj.constructor) && !Array.isArray(obj)

const deepMerge = (target, source) => {
  if (!source) return target
  const output = { ...target }
  for (const [key, val] of Object.entries(source)) {
    if (key === 'parent' || key === 'control') {
      output[key] = val
    } else if (isPlainObject(val)) {
      output[key] = deepMerge(target[key] || {}, val)
    } else {
      output[key] = val
    }
  }
  return output
}

const resolveLocalRef = (node, refStr) => {
  if (typeof refStr !== 'string' || !refStr.startsWith(':')) return undefined
  const keys = refStr.slice(1).split('.')
  let current = node
  while (current) {
    let val = current
    for (const key of keys) {
      val = val?.[key]
    }
    if (
      val !== undefined &&
      val !== null &&
      (typeof val !== 'string' || !val.startsWith(':'))
    ) {
      return val
    }
    current = current.parent
  }
  return undefined
}

const resolveScopedRef = (node, prefix, name) => {
  if (typeof name !== 'string') return undefined

  if (node) {
    const refPath = `:${prefix}.${name}`
    let resolved = resolveLocalRef(node, refPath)
    if (resolved !== undefined) {
      if (typeof resolved === 'string' && resolved.startsWith(':')) {
        resolved = resolveLocalRef(node, resolved)
      }
      return resolved
    }
  }

  return undefined
}

const resolveClassFromScope = (name, currentClasses, classesMap, node) => {
  if (typeof name !== 'string') return undefined

  if (name.startsWith(':')) {
    const local = resolveLocalRef(node, name)
    if (local !== undefined) return local
    const trimmed = name.startsWith(':classes.') ? name.slice(9) : name.slice(1)
    return resolveClassFromScope(trimmed, currentClasses, classesMap, node)
  }

  const scoped = resolveScopedRef(node, 'classes', name)
  if (scoped !== undefined) return scoped

  const parts = name.split('.')
  let current = currentClasses[parts[0]] || classesMap[parts[0]]
  for (let i = 1; i < parts.length; i++) {
    current = current?.[parts[i]]
  }
  return current
}

const resolveTemplateFromScope = (name, currentClasses, classesMap, node) => {
  if (typeof name !== 'string') return undefined

  const scoped = resolveScopedRef(node, 'templates', name)
  if (scoped !== undefined) return scoped

  return resolveClassFromScope(name, currentClasses, classesMap, node)
}

const resolveClasses = (classNames, currentClasses, classesMap, node, depth = 0) => {
  if (depth > 5) return {}
  let merged = {}
  const names = Array.isArray(classNames) ? classNames : [classNames]
  names.forEach((name) => {
    let clsDef = resolveClassFromScope(name, currentClasses, classesMap, node)
    if (typeof clsDef === 'string') {
      if (clsDef.startsWith(':') && node) {
        const local = resolveLocalRef(node, clsDef)
        if (local !== undefined) {
          clsDef = local
        }
      }
      if (typeof clsDef === 'string') {
        const refName = clsDef.startsWith(':') ? clsDef.slice(1) : clsDef
        clsDef = resolveClasses(refName, currentClasses, classesMap, node, depth + 1)
      }
    }
    if (clsDef && typeof clsDef === 'object') {
      if (clsDef.class) {
        const nested = resolveClasses(
          clsDef.class,
          currentClasses,
          classesMap,
          node,
          depth + 1
        )
        merged = deepMerge(merged, nested)
      }
      merged = deepMerge(merged, clsDef)
    }
  })
  return merged
}

const resolveReferences = (node) => {
  if (!node || typeof node !== 'object') return

  for (const [key, val] of Object.entries(node)) {
    if (typeof val === 'string' && val.startsWith(':')) {
      const resolved = resolveLocalRef(node, val)
      if (resolved !== undefined) {
        node[key] = resolved
      }
    }
  }

  if (node.inner) {
    const children = Array.isArray(node.inner) ? node.inner : [node.inner]
    children.forEach(resolveReferences)
  }
}

const Control = (spec) => ({
  onMeasure:
    spec.onMeasure || ((node, constraints) => ({ width: 0, height: 0 })),
  onLayout: spec.onLayout || ((node, bounds) => {}),
  onRender: spec.onRender || ((node, grid) => {}),
})

const ControlCompiler = (
  capabilities = {},
  classesMap = {},
  customLayouts = {}
) => {
  const compileNode = (
    node,
    currentClasses = {},
    currentLayouts = {},
    parent = null,
    ctx = null
  ) => {
    if (!node || typeof node !== 'object') return node

    const isComponent = !!node.main
    const targetRaw = isComponent ? node.main : node

    const resolvedParent = parent || node.parent || null
    if (isComponent) {
      node.parent = resolvedParent
      targetRaw.parent = node
    } else {
      node.parent = resolvedParent
    }

    const localClasses = {
      ...currentClasses,
      ...node.templates,
      ...node.classes,
      ...targetRaw.templates,
      ...targetRaw.classes,
    }
    const localLayouts = {
      ...currentLayouts,
      ...node.layouts,
      ...targetRaw.layouts,
    }

    let baseProps = {}
    const rawType = targetRaw.type || 'layout'

    const templateDef = resolveTemplateFromScope(rawType, localClasses, classesMap, targetRaw)
    if (templateDef) {
      baseProps = deepMerge(
        baseProps,
        resolveClasses(rawType, localClasses, classesMap, targetRaw)
      )
    }

    if (targetRaw.class) {
      baseProps = deepMerge(
        baseProps,
        resolveClasses(targetRaw.class, localClasses, classesMap, targetRaw)
      )
    }

    const targetRawMerged = deepMerge(baseProps, targetRaw)
    if (templateDef && baseProps.type && targetRaw.type === rawType) {
      targetRawMerged.type = baseProps.type
    }

    const activeElement = targetRawMerged
    activeElement.parent = targetRawMerged.parent || node.parent || parent

    const scopedCtx = ctx && typeof ctx.createScopedContext === 'function'
      ? ctx.createScopedContext(activeElement)
      : ctx

    const evaluateVal = (val) => {
      const activeCtx = scopedCtx || ctx
      if (typeof val === 'function') {
        const res = val(activeCtx)
        return Array.isArray(res) ? res.map(evaluateVal).flat() : res
      }
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'function') {
            const res = item(activeCtx)
            return Array.isArray(res) ? res.map(evaluateVal).flat() : res
          }
          return item
        }).flat()
      }
      return val
    }

    const target = {}
    for (const [key, val] of Object.entries(targetRawMerged)) {
      if (typeof val === 'function' && !key.startsWith('on') && key !== 'format') {
        target[key] = evaluateVal(val)
      } else if (Array.isArray(val) && val.some((v) => typeof v === 'function')) {
        target[key] = evaluateVal(val)
      } else {
        target[key] = val
      }
    }

    const type = target.type || 'layout'
    const rawInner = target.inner
      ? Array.isArray(target.inner)
        ? target.inner
        : [target.inner]
      : []

    let compiledNode = {
      ...target,
      type,
      inner: rawInner,
    }

    // Resolve control implementation
    compiledNode.control =
      localLayouts[type] || customLayouts[type] || defaultControls[type]
    if (!compiledNode.control) {
      compiledNode = {
        ...compiledNode,
        control: defaultControls.text,
        text: type
          ? `Error: layout type '${type}' not found`
          : 'Error: type not specified',
      }
    }

    if (type === 'input') {
      if (compiledNode.focusable === undefined && compiledNode.canFocus === undefined) {
        compiledNode.focusable = true
      }
      if (compiledNode.id && ctx?.elementById) {
        const prevNode = ctx.elementById(compiledNode.id)
        if (prevNode) {
          if (compiledNode.value === undefined && prevNode.value !== undefined) {
            compiledNode.value = prevNode.value
          }
          if (compiledNode.cursor === undefined && prevNode.cursor !== undefined) {
            compiledNode.cursor = prevNode.cursor
          }
          if (compiledNode.scrollX === undefined && prevNode.scrollX !== undefined) {
            compiledNode.scrollX = prevNode.scrollX
          }
          if (compiledNode.scrollY === undefined && prevNode.scrollY !== undefined) {
            compiledNode.scrollY = prevNode.scrollY
          }
        }
      }
      if (!compiledNode.onKey && compiledNode.control?.onKey) {
        compiledNode.onKey = (activeCtx, event) => compiledNode.control.onKey(compiledNode, event, activeCtx)
      }
    }

    if (compiledNode.inner.length > 0) {
      compiledNode.inner = compiledNode.inner
        .map((child) => {
          const compiledChild = compileNode(child, localClasses, localLayouts, compiledNode, ctx)
          if (compiledChild && typeof compiledChild === 'object') {
            compiledChild.parent = compiledNode
          }
          return compiledChild
        })
        .filter(Boolean)
    }

    return compiledNode
  }

  return {
    compileNode: (root, ctx = null) => {
      const compiled = compileNode(root, {}, {}, null, ctx)
      resolveReferences(compiled)
      return compiled
    },
  }
}

module.exports = {
  Control,
  ControlCompiler,
}
