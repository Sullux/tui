# rich (Inline Span & Flow Text)

Renders styled, paragraph-level text flows where different words, inline badges, or elements flow side-by-side with individual formatting traits.

Uses line-chopping (`breakAfterChar`) and delegates sequential element wrapping directly to `wrap`.

---

## Example Usage

```yaml
type: rich
width: fill
inner:
  - text: 'Status: '
    bold: true
  - text: 'ACTIVE'
    fg: 'green'
  - type: border
    text: '[ ONLINE ]'
```

---

## Intrinsic Properties

* **`inner`**: `array` — List of child nodes or span objects. Supports text nodes (with individual `fg`, `bg`, `bold`, `italic`, `underline`) as well as non-text controls (like `border` or `image`).
* **`bold`** | **`underline`** | **`italic`**: `boolean` (default styles inherited by child spans).
* **`fg`** / **`bg`**: `Color` (default colors inherited by child spans).

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (defaults to `'content'`).
* **`margin`**: `Margin`.

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
