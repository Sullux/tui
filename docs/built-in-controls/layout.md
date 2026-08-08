# layout (Flow Layout)

Arranges sibling child controls sequentially along a primary axis (`vertical` or `horizontal`), allocating cell coordinates top-to-bottom or left-to-right.

---

## Example Usage

```yaml
type: layout
direction: horizontal
width: fill
height: fill
inner:
  - type: border
    width: 30
    text: Sidebar
  - type: layout
    width: fill
    text: Main Content Area
```

---

## Intrinsic Properties

* **`direction`**: `Orientation` (default: `'vertical'`). Accepts `'vertical'` (`'v'`) or `'horizontal'` (`'h'`).
* **`padding`**: `Margin` (adds padding inside the container border bounds).
* **`bg`**: `Color` (background color fill).
* **`inner`**: `array` | `object` (nested child controls).

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (Primary axis sizing defaults to `'content'`, except the last child which defaults to `'fill'`. Non-primary axis defaults to `'fill'`).
* **`margin`**: `Margin` (outer margin spacing, collapsing with adjacent siblings).
* **`align`**: `Alignment` (alignment along non-primary axis, e.g. `halign` for vertical layouts).

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
