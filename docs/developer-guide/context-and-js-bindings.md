# Context & JS Bindings

The framework binds logic-free YAML layout nodes to live JavaScript using the `@` protocol (e.g. `'@controller.js:func'`).

Functions loaded this way fall into two clear behavioral categories based on where they are bound in the tree.

---

## 1. Dynamic Computed Values (Compile-Time)

When a function is bound to any standard static property (such as `text`, `isVisible`, `bg`, `width`), it is evaluated as a **pure computed value** during the layout compilation pass.

* **Call Signature:** Called as `func()` with no arguments (or `func(ctx, args)` when invoked via `$file.js:func` sigil), returning the computed value.
* **Example YAML:**
  ```yaml
  type: text
  text: '@controller.js:getDynamicContent'
  isVisible: '@controller.js:isContentVisible'
  ```
* **Example Controller:**
  ```javascript
  let counter = 0

  exports.getDynamicContent = () => {
    counter++
    return `Update count: ${counter}`
  }

  exports.isContentVisible = () => counter < 100
  ```

---

## 2. Event Handlers (Run-Time)

When a function is bound to an event property starting with `on` (such as `onKey`, `onKeyPreview`, `onKeyBubble`, `onFocus`, `onBlur`), it is treated as an **event callback** evaluated at run-time during input propagation or rendering phases. See **[Event Lifecycle & Handlers](events.md)** for complete details on event propagation phases and control-specific events.

* **Call Signature:** Called as `func(ctx, payload)`, where `ctx` is the transactional context interface and `payload` is an object detailing event state.
* **Example YAML:**
  ```yaml
  type: text
  focusable: true
  text: 'Click or Type Here'
  onFocus: '@controller.js:handleFocus'
  onKey: '@controller.js:handleKeyPress'
  ```
* **Example Controller:**
  ```javascript
  exports.handleFocus = (ctx, payload) => {
    console.log(`Focused element: ${payload.targetId}`)
  }

  exports.handleKeyPress = (ctx, event) => {
    if (event.key === 'enter') {
      event.preventDefault()
      ctx.triggerRedraw()
    }
  }
  ```

---

## The Context (`ctx`) API Reference

The `ctx` object passed as the first parameter to event handlers is a transaction-safe controller containing state, search, navigation, string, and type normalization utilities:

### State & Active Element Properties
* **`ctx.focusedId`** (`string` | `null`): Returns the `id` of the currently focused element.
* **`ctx.element`** / **`ctx._`** (`object` | `null`): Reference to the current active markup element being evaluated during property compilation or event processing.
* **`ctx.parent`** (`object` | `null`): Reference to the parent element of the active node (`ctx.element.parent`).

### Geometry & Dimension Helpers
* **`ctx.measureInnerWidth(node = ctx.element)`**: Calculates usable inner cell width for a node (defaulting to `ctx.element` or `ctx._`), subtracting horizontal padding and margins and walking up `parent` chains for percentage or `'fill'` dimensions.
* **`ctx.measureInnerHeight(node = ctx.element)`**: Calculates usable inner cell height for a node (defaulting to `ctx.element` or `ctx._`), subtracting vertical padding and margins.
* **`ctx.getPadding(node = ctx.element)`**: Resolves padding into normalized `{ t, r, b, l }`.
* **`ctx.getMargin(node = ctx.element)`**: Resolves margins into normalized `{ t, r, b, l }`.

### Element Search & Traversal
* **`ctx.elementById(id)`**: Returns the compiled element matching the specified `id` string (or `null`).
* **`ctx.elementsTagged(tag)`**: Returns an array of compiled elements matching the specified `tag` string inside their `tags` array.
* **`ctx.elementsMatching(predicateFn)`**: Returns an array of compiled elements matching the filter `predicateFn(node)`.

### Focus Management
* **`ctx.setFocus(id)`**: Transfers active focus to the specified element `id`, triggering `onBlur` on the old target and `onFocus` on the new target, then schedules a microtask redraw.
* **`ctx.focusNext()`**: Cycles focus forward to the next focusable element.
* **`ctx.focusPrev()`**: Cycles focus backward to the previous focusable element.

### Application Control
* **`ctx.triggerRedraw()`**: Explicitly schedules a single-tick microtask redraw.

### String Utilities
* **`ctx.breakAfterChar(text, maxLength)`**: Chops text at word boundaries or visual columns, returning `{ text, extra, isHardBreak }`.
* **`ctx.visualWidth(text)`**: Calculates terminal cell width of wide/emoji characters.
* **`ctx.isWideChar(char)`**: Checks if a character occupies 2 terminal cells.
* **`ctx.sanitizeText(text)`**: Strips invisible control characters.

### Type Normalizers
Exposes normalization factories directly:
* `ctx.parseMeasure`, `ctx.parseSize`, `ctx.parseMargin`, `ctx.parsePoint`, `ctx.parseBounds`, `ctx.parseOrientation`, `ctx.parseHAlign`, `ctx.parseVAlign`, `ctx.parseColor`.
