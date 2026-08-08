# wrap (Wrap Panel Layout)

Sequential flow container (equivalent to WPF `WrapPanel` or CSS `flex-wrap: wrap`) that packs child controls sequentially and automatically wraps overflowing items onto new rows or columns.

Useful for tag clouds, button bars, toolbars, card grids, and inline document flow.

---

## Example Usage

```yaml
type: wrap
direction: horizontal # Rows wrap vertically when width limit is reached
width: fill
height: content
inner:
  - type: border
    text: '[ Email ]'
  - type: border
    text: '[ Cellular SMS ]'
  - type: border
    text: '[ Signal ]'
  - type: border
    text: '[ WhatsApp ]'
```

---

## Intrinsic Properties

* **`direction`**: `Orientation` (default: `'horizontal'`).
  * `horizontal` (`'h'`): Packs items left-to-right, wrapping to new rows downward.
  * `vertical` (`'v'`): Packs items top-to-bottom, wrapping to new columns rightward.
* **`padding`**: `Margin`
* **`bg`**: `Color`
* **`inner`**: `array` | `object` (child elements of any control type: `text`, `border`, `image`, `layout`).

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (defaults to measured child bounds).
* **`margin`**: `Margin`

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
