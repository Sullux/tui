const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

const LoaderFactory = (options = {}) => {
  const readFileSync = options.readFileSync || fs.readFileSync
  const requireModule = options.requireModule || require

  // Parses a string with `@` or `$` into a live JS function or value
  const resolveJsRef = (refStr, baseDir) => {
    const cleanRef = refStr.startsWith('$') || refStr.startsWith('@') ? refStr.slice(1) : refStr
    const lastColonIdx = cleanRef.lastIndexOf(':')
    if (lastColonIdx === -1) {
      throw new Error(`Invalid JS reference: "${refStr}". Expected format: "@filename.js:exportName" or "$filename.js:exportName"`)
    }

    const relPath = cleanRef.slice(0, lastColonIdx)
    const exportName = cleanRef.slice(lastColonIdx + 1)

    // Support virtual module registration
    if (options.modules && options.modules[relPath]) {
      const moduleExports = options.modules[relPath]
      if (moduleExports[exportName] === undefined) {
        throw new Error(`Export "${exportName}" not found in virtual module "${relPath}"`)
      }
      return moduleExports[exportName]
    }

    const absPath = path.resolve(baseDir, relPath)

    try {
      const moduleExports = requireModule(absPath)
      if (moduleExports[exportName] === undefined) {
        throw new Error(`Export "${exportName}" not found in module "${absPath}"`)
      }
      return moduleExports[exportName]
    } catch (err) {
      throw new Error(`Failed to load JS reference "${refStr}": ${err.message}`)
    }
  }

  // Parses a string starting with `@` referencing a YAML file or sub-property
  const resolveYamlRef = (refStr, baseDir) => {
    const withoutAt = refStr.slice(1) // strip '@'
    const lastColonIdx = withoutAt.lastIndexOf(':')

    if (lastColonIdx === -1) {
      const fullPath = path.resolve(baseDir, withoutAt)
      return loadFile(fullPath)
    } else {
      const relPath = withoutAt.slice(0, lastColonIdx)
      const propName = withoutAt.slice(lastColonIdx + 1)
      const fullPath = path.resolve(baseDir, relPath)
      const importedContent = loadFile(fullPath)
      const source = (importedContent && (importedContent.classes || importedContent.templates)) || importedContent

      if (source && source[propName] !== undefined) {
        return source[propName]
      }
      if (importedContent && importedContent[propName] !== undefined) {
        return importedContent[propName]
      }
      throw new Error(`Property "${propName}" not found in YAML file "${fullPath}"`)
    }
  }

  // Recursively walks the parsed YAML structure to resolve JS & YAML references
  const walkAndResolve = (node, baseDir) => {
    if (typeof node === 'string') {
      if (node.startsWith('@')) {
        if (node.endsWith('.yaml') || node.endsWith('.yml') || node.includes('.yaml:') || node.includes('.yml:')) {
          return resolveYamlRef(node, baseDir)
        }
        return resolveJsRef(node, baseDir)
      }
      return node
    }

    if (Array.isArray(node)) {
      return node.flatMap((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item)
          if (
            keys.length === 1 &&
            keys[0].startsWith('$') &&
            (keys[0].includes('.js:') || keys[0].includes('.ts:'))
          ) {
            const invKey = keys[0]
            const invVal = item[invKey]
            const fn = resolveJsRef(invKey, baseDir)
            const resolvedArgs = walkAndResolve(invVal, baseDir)

            const invocationFn = (ctx) => fn(ctx, resolvedArgs)
            invocationFn.$isInvocation = true
            invocationFn.$args = resolvedArgs
            invocationFn.$fn = fn
            return invocationFn
          }
          if (
            keys.length === 1 &&
            keys[0].startsWith('@') &&
            (keys[0].endsWith('.yaml') ||
              keys[0].endsWith('.yml') ||
              keys[0].includes('.yaml:') ||
              keys[0].includes('.yml:'))
          ) {
            const importKey = keys[0]
            const importVal = item[importKey]
            const resolved = resolveYamlRef(importKey, baseDir)
            const source = (resolved && (resolved.classes || resolved.templates)) || resolved

            if (importVal === '*') {
              if (Array.isArray(source)) {
                return source.map((child) => walkAndResolve(child, baseDir))
              }
              if (source && typeof source === 'object') {
                return Object.values(source).map((child) => walkAndResolve(child, baseDir))
              }
              return [walkAndResolve(source, baseDir)]
            } else if (Array.isArray(importVal)) {
              const items = []
              importVal.forEach((sel) => {
                if (typeof sel === 'string') {
                  if (sel === '*') {
                    if (Array.isArray(source)) {
                      items.push(...source.map((child) => walkAndResolve(child, baseDir)))
                    } else if (source && typeof source === 'object') {
                      items.push(...Object.values(source).map((child) => walkAndResolve(child, baseDir)))
                    }
                  } else if (source && source[sel] !== undefined) {
                    items.push(walkAndResolve(source[sel], baseDir))
                  }
                } else if (sel && typeof sel === 'object') {
                  for (const [origKey, aliasKey] of Object.entries(sel)) {
                    if (source && source[origKey] !== undefined) {
                      items.push(walkAndResolve(source[origKey], baseDir))
                    }
                  }
                }
              })
              return items
            }
            return walkAndResolve(resolved, baseDir)
          }
        }
        return walkAndResolve(item, baseDir)
      })
    }

    if (node !== null && typeof node === 'object') {
      const keys = Object.keys(node)
      // Check if this object represents a single $ invocation key, e.g. { "$file.js:func": { args } }
      if (
        keys.length === 1 &&
        keys[0].startsWith('$') &&
        keys[0].includes(':')
      ) {
        const invKey = keys[0]
        const invVal = node[invKey]
        const fn = resolveJsRef(invKey, baseDir)
        const resolvedArgs = walkAndResolve(invVal, baseDir)

        const invocationFn = (ctx) => fn(ctx, resolvedArgs)
        invocationFn.$isInvocation = true
        invocationFn.$args = resolvedArgs
        invocationFn.$fn = fn
        return invocationFn
      }

      const resolved = {}
      for (const [key, val] of Object.entries(node)) {
        if (
          key.startsWith('$') &&
          key.includes(':')
        ) {
          const fn = resolveJsRef(key, baseDir)
          const resolvedArgs = walkAndResolve(val, baseDir)

          const invocationFn = (ctx) => fn(ctx, resolvedArgs)
          invocationFn.$isInvocation = true
          invocationFn.$args = resolvedArgs
          invocationFn.$fn = fn
          resolved[key] = invocationFn
        } else if (
          key.startsWith('@') &&
          (key.endsWith('.yaml') ||
            key.endsWith('.yml') ||
            key.includes('.yaml:') ||
            key.includes('.yml:'))
        ) {
          const importedContent = resolveYamlRef(key, baseDir)

          if (val === '*') {
            if (importedContent && typeof importedContent === 'object' && !Array.isArray(importedContent)) {
              for (const [impK, impV] of Object.entries(importedContent)) {
                resolved[impK] = walkAndResolve(impV, baseDir)
              }
            }
          } else if (Array.isArray(val)) {
            val.forEach((sel) => {
              const selSource = (importedContent && (importedContent.classes || importedContent.templates)) || importedContent
              if (typeof sel === 'string') {
                if (sel === '*') {
                  if (selSource && typeof selSource === 'object' && !Array.isArray(selSource)) {
                    for (const [impK, impV] of Object.entries(selSource)) {
                      resolved[impK] = walkAndResolve(impV, baseDir)
                    }
                  }
                } else if (selSource && selSource[sel] !== undefined) {
                  resolved[sel] = walkAndResolve(selSource[sel], baseDir)
                } else if (importedContent && importedContent[sel] !== undefined) {
                  resolved[sel] = walkAndResolve(importedContent[sel], baseDir)
                }
              } else if (sel && typeof sel === 'object') {
                for (const [origKey, aliasKey] of Object.entries(sel)) {
                  if (selSource && selSource[origKey] !== undefined) {
                    resolved[aliasKey] = walkAndResolve(selSource[origKey], baseDir)
                  } else if (importedContent && importedContent[origKey] !== undefined) {
                    resolved[aliasKey] = walkAndResolve(importedContent[origKey], baseDir)
                  }
                }
              }
            })
          } else {
            resolved[key] = walkAndResolve(val, baseDir)
          }
        } else {
          resolved[key] = walkAndResolve(val, baseDir)
        }
      }
      return resolved
    }

    return node
  }

  // Loads, parses, and resolves a YAML file recursively
  const loadFile = (filePath) => {
    const absPath = path.resolve(filePath)
    const baseDir = path.dirname(absPath)
    const rawContent = readFileSync(absPath, 'utf8')

    // Parse YAML into native JS object/arrays
    const rawYaml = yaml.load(rawContent)

    // Resolve all "@file.js" or "@file.yaml" or "$file.js" references recursively
    return walkAndResolve(rawYaml, baseDir)
  }

  return { loadFile, walkAndResolve }
}

module.exports = { LoaderFactory }
