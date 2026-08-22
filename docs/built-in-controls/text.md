# text (Formatted Text)

Renders static or dynamic text strings with alignment, word wrapping (via `breakAfterChar`), and ANSI style modifiers.

---

## Example Usage

```yaml
type: text
text: 'The quick brown fox jumps over the lazy dog.'
wrap: true
bold: true
fg: '#7aa2f7'
bg: '#1a1b26'
halign: center
valign: center
```

---

## Intrinsic Properties

* **`text`** / **`value`**: `string` (supports `@` JS functions and `:` local variables).
* **`wrap`**: `boolean` (word-wraps text across whitespace boundaries based on width limits using `breakAfterChar`).
* **`halign`**: `Alignment` (`'left'`, `'center'`, `'right'`).
* **`valign`**: `Alignment` (`'top'`, `'center'`, `'bottom'`).
* **`bold`** | **`underline`** | **`italic`**: `boolean`.
* **`fg`** / **`bg`**: `Color`.

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (defaults to `'content'`).
* **`margin`**: `Margin`.

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
