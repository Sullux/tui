# input (Text Input)

A single-line or multi-line text input control with out-of-the-box keyboard navigation, word jumping, deletions, placeholder support, horizontal/vertical viewport auto-scrolling, custom formatting spans, and customizable carets.

---

## Example Usage

```yaml
type: input
id: searchInput
placeholder: 'Search documentation...'
placeholderStyle:
  fg: '#555555'
  italic: true
value: ''
caret:
  mode: invert
onChange: '@handlers.js:onSearchChange'
onSubmit: '@handlers.js:onSearchSubmit'
```

---

## Intrinsic Properties

* **`value`** / **`text`**: `string` — The input's text content.
* **`cursor`**: `number` — 0-indexed character position of the caret (defaults to text length).
* **`placeholder`**: `string` — Displayed when `value` is empty.
* **`placeholderStyle`**: `object` — ANSI styling for the placeholder text (`fg`, `bg`, `italic`, `bold`).
* **`multiline`**: `boolean` — Single-line text field (`false`, default) or multi-line text area (`true`).
* **`wrap`**: `boolean` — Enables word wrapping and dynamic auto-growing height with `height: content`.
* **`maxHeight`**: `number` — Maximum height cap when auto-growing with `height: content`.
* **`submitMode`**: `string` — `'enter'` (default: `Enter` submits, `Shift+Enter`/`Alt+Enter` inserts newline) or `'ctrl+enter'` (`Enter` inserts newline, `Ctrl+Enter` submits).
* **`clearOnSubmit`**: `boolean` — Clears input content automatically upon submission (`true`, default).
* **`mask`**: `string` — Character mask for passwords or sensitive input (e.g. `'*'`).
* **`maxLength`**: `number` — Maximum allowed string length.
* **`readOnly`** / **`disabled`**: `boolean` — Disables user keyboard input.
* **`caret`**: `string` | `boolean` | `object` — Caret definition or shorthand (e.g. `'█'`, `'│'`, or `{ type: 'caret', mode: 'invert' }`).
* **`format`** / **`onFormat`**: `(text, cursor, ctx) => Array<{ text, fg, bg, bold, ... }>` — Hook to transform raw text into custom styled spans.

---

## Supported Keyboard Navigation

| Key | Action |
|---|---|
| **`left` / `right`** | Move cursor left/right by 1 character |
| **`ctrl+left` / `alt+left`** | Jump backward to previous word boundary |
| **`ctrl+right` / `alt+right`** | Jump forward to next word boundary |
| **`home` / `ctrl+a`** | Jump to start of line / input |
| **`end` / `ctrl+e`** | Jump to end of line / input |
| **`backspace`** | Delete character before cursor |
| **`delete`** | Delete character at cursor |
| **`ctrl+backspace` / `ctrl+w`** | Delete word backward |
| **`ctrl+delete` / `alt+d`** | Delete word forward |
| **`ctrl+u`** | Delete to start of line |
| **`ctrl+k`** | Delete to end of line |
| **`up` / `down`** | Move cursor vertically across lines in multi-line / wrapped text |
| **`shift+enter` / `alt+enter`** | Insert newline (`\n`) without submitting |
| **`ctrl+c`** | Clear input value and reset cursor |
| **`enter`** | Multiline / editor mode: insert `\n`; Chat / standard mode: trigger `onSubmit` |
| **`paste`** | Insert pasted text / multiline content preserving newlines without premature submit |

---

## Supported Events

* **Input Callbacks:** `onChange(ctx, { value, cursor, prevValue })`, `onSubmit(ctx, { value })`
* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
