# stack (Auto-Filling Helper)

A composite flow layout helper that stacks sibling elements in a specific direction with auto-content sizing.

---

## Example Usage

```yaml
type: stack
direction: vertical
width: fill
inner:
  - type: text
    text: 'Header Item'
  - type: text
    text: 'Body Item'
```

---

## Intrinsic Properties

* **`direction`**: `Orientation` (default: `'vertical'`).
* **`padding`**: `Margin`
* **`bg`**: `Color`
* **`inner`**: `array` | `object`

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (Primary sizing defaults to `'content'`, non-primary defaults to `'content'`).
* **`margin`**: `Margin`
* **`align`**: `Alignment`

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
