# Event Lifecycle & Handlers

`@sullux/coms-tui-yaml` features a state-reactive event routing engine. Event handlers are bound in YAML markup using the `@` protocol (e.g., `onKey: '@controller.js:handleKey'`) and receive `(ctx, payload)` during execution.

---

## 1. Keyboard Input Events

Keyboard events traverse a three-phase pipeline modelled after standard UI DOM events:

```
          [ 1. Capture Phase ]
           Root ──► Parent ──► Container
                                 │
                                 ▼
          [ 2. Target Phase ]  Target (Focused Element)
                                 │
                                 ▼
          [ 3. Bubble Phase ]  Container ──► Parent ──► Root
```

### Event Properties

When a keyboard event occurs, the `payload` passed to `(ctx, payload)` contains:

* **`key`**: Compare-safe key name (`'up'`, `'down'`, `'enter'`, `'tab'`, `'a'`).
* **`char`**: Printable character string if applicable (`'a'`, `' '`, `null`).
* **`ctrl`** | **`alt`** | **`shift`**: Boolean modifier state flags.
* **`sequence`**: Raw ANSI byte sequence received from standard input.
* **`targetId`**: `id` string of the currently focused element (or root `id`).
* **`stopPropagation()`**: Call to halt further propagation up or down the node tree.
* **`preventDefault()`**: Call to prevent default system focus navigation or key behavior.

### Keyboard Handlers

* **`onKeyPreview(ctx, payload)`**: Evaluated during the **Capture Phase** as key events descend down from the root to the focused target. Ideal for global overlays, modal shortcuts, or intercepting keys before children receive them.
* **`onKey(ctx, payload)`**: Evaluated during the **Target Phase** directly on the node that currently holds active focus.
* **`onKeyBubble(ctx, payload)`**: Evaluated during the **Bubble Phase** as key events ascend back up from the target to the root node. Used for container-level key handlers (such as Vim navigation bindings on main view containers).

---

## 2. Focus Lifecycle Events

* **`onFocus(ctx, { targetId })`**: Triggered when the element gains active input focus via `ctx.setFocus(id)`, `ctx.focusNext()`, or `ctx.focusPrev()`.
* **`onBlur(ctx, { targetId })`**: Triggered when active focus transitions away from the element to another control.

---

## 3. Control Lifecycle Overrides

Developers can override a control's internal layout solver or rendering painter by binding custom lifecycle handlers:

* **`onMeasure(node, constraints)`**: Invoked during the sizing pass to compute content measurements. Must return `{ width, height }`.
* **`onLayout(node, innerBox)`**: Invoked during layout positioning to compute child boxes.
* **`onRender(node, grid)`**: Invoked during frame rasterization to paint characters and ANSI colors directly onto the screen grid.
