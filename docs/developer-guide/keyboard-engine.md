# Keyboard Engine

Interactive controls require reliable, compare-safe keyboard binding. `@sullux/coms-tui-yaml` provides a dedicated translation and routing layer.

---

## Unified Key Translation Layer

Raw terminal escape sequences are translated into normalized key payloads. The `parseKeyPress` utility standardizes key names and modifier chords:

```javascript
// Example keyPayload structure:
{
  key: 'up',         // Standard compare-safe name ('up', 'down', 'enter', 'tab', 'a')
  char: null,        // Printable character string (e.g. 'a', ' ')
  ctrl: false,       // Modifier flags
  alt: false,
  shift: false,
  sequence: '\x1b[A' // Raw ANSI escape sequence from stdin
}
```

* **Alphabetical Modifier Sorting:** Modifiers are sorted alphabetically when building stroke strings (`'ctrl+alt+a'` and `'alt+ctrl+a'` match identically).
* **Typing vs. Modifier Separation:** Typographical shift keystrokes stand as uppercase characters (e.g. `'A'`), while shift indicators remain on modifier chords (`'shift+up'`).

---

## The Declarative `KeyHandler` Router

The `KeyHandler` factory compiles a dictionary of key patterns into a stateful routing function. It returns a standard callback `(ctx, event)` and supports nesting for modes or Vim-like state maps:

```javascript
const { KeyHandler } = require('@sullux/coms-tui-yaml')

const handleNormalMode = KeyHandler({
  i: (ctx) => {
    ctx.setFocus('editor')
  },
  colon: KeyHandler({
    w: (ctx) => saveFile(),
    q: (ctx) => ctx.setFocus('quit-dialog'),
  }),
})
```

---

## Key Binding Operators: `*` (Repeat), `,` (Sequence), `..` (Range)

Bindings support advanced patterns expanded at load-time:

* **`*` (Rapid Double-Press / Repeat):** `'escape*2'` matches when `escape` is pressed twice within `rapidKeyInterval` (default `500ms`).
* **`,` (Untimed Sequences):** `'escape,h'` matches when `escape` is pressed, followed by `h`.
* **`..` (Pre-Expanded Ranges):** `'n1..n3'` expands at load-time to bind `'n1'`, `'n2'`, and `'n3'`.

```javascript
const handleKeys = KeyHandler({
  'ctrl+s': saveDocument,
  'escape*2': quitApp, // Quick double escape
  'escape,h': showHelpModal, // Sequence
  'n0..n9': focusTabByIndex, // Pre-expanded range
})
```

---

## The Sliding Suffix-Trimming Buffer

The handler maintains a sliding keystroke buffer. When a sequence results in no match, the router **trims the oldest keystroke from the front and retries matching the remaining suffix**.

* **Example:** Typing `escape` (starting an `'escape,h'` sequence) followed by `a` (which matches nothing under `'escape,a'`) trims `'escape'`, matches the single `'a'` handler, and fires it immediately.

---

## Zero-Timer Expiry Execution

To prevent liveness delays, the router implements static timing comparison.

If both `'escape'` and `'escape*2'` are bound:
* Pressing `escape` waits for a second press.
* If a second `escape` arrives after `700ms` (> `500ms`), the first press is evaluated as expired, triggering the single `'escape'` handler, clearing the buffer, and starting a new cycle microsecond-exact.
