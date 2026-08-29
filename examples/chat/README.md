# Terminal Chat & Agent Console Reference App

A complete, reference implementation showcasing `@sullux/tui`'s declarative layout engine, built-in controls, responsive scrolling, keyboard routing, and dynamic JavaScript event handlers.

---

## What This Reference Demonstrates

* **Declarative Layouts (`view.yaml`)**:
  * Root vertical flow (`layout`) with full width/height fill.
  * Bordered panels (`border`) for headers, channel sidebar, message history, and the input box.
  * Horizontal multi-pane split (`layout`).
* **Interactive Text Input (`input`, `caret`)**:
  * Real-time keyboard typing, cursor navigation, home/end, backspace/delete, and word-skipping.
  * Auto-growing input box (`height: content`, `wrap: true`, `maxHeight: 6`) that dynamically resizes sibling layouts.
  * Multi-line input support via `Shift+Enter` or `Alt+Enter` with 2D vertical caret navigation.
  * Inverted caret mode (`caret: { mode: 'invert' }`).
  * `Ctrl+C` input clearing and bracketed paste support.
  * Submission on `Enter` with auto-clearing and state updates.
* **Scrollable Solid-Color Message Stream (`scroll`, `layout`, `rich`, `text`)**:
  * Seamless solid-color padded message boxes with WhatsApp-style indentation and wrapping offsets.
  * Formatted message nodes with distinct sender colors, timestamps, badges, and status symbols.
  * Vertical scroll viewport auto-clamping.
* **Global & Focused Keyboard Routing**:
  * `Tab` cycles through active channels (`# general`, `# agent-console`, `# deployments`).
  * `Ctrl+C` clears current input; `Ctrl+Q` exits the app.
  * `/help` and `/clear` slash commands.
* **Dynamic JavaScript State & Event Handlers (`handlers.js`)**:
  * Pure functional state factory (`createChatState`, `chatHandlerFactory`).
  * Interactive bot/agent response simulation.

---

## How to Run

From the root of the repository:

```bash
# Direct node execution
node examples/chat/app.js

# Or via yarn script
yarn example:chat
```

---

## File Structure

* `app.js` — App entry point bootstrapping `Tui` with the view and state handlers.
* `view.yaml` — Logic-free declarative YAML view structure.
* `handlers.js` — State factory, pure transformation functions, and event callbacks.
* `logo.svg` — Vector logo asset.
