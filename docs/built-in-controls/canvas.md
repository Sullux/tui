# canvas (Absolute Layout)

Places child controls at exact, absolute point coordinates (`x`, `y`), bypassing sequential flow constraints entirely. Useful for floating overlays, popups, and fixed HUD elements.

---

## Example Usage

```yaml
type: canvas
width: 80
height: 24
inner:
  - type: border
    x: 10
    y: 5
    width: 60
    height: 14
    text: Modal Dialog
```

---

## Intrinsic Properties

* **`padding`**: `Margin` (inner padding space).
* **`bg`**: `Color` (background color fill).
* **`inner`**: `array` | `object` (nested child controls).

---

## Parent-Dependent Child Layout Properties

* **`x`**: `Measure` (discrete horizontal cell coordinate relative to parent inner box).
* **`y`**: `Measure` (discrete vertical cell coordinate relative to parent inner box).
* **`width` / `height`**: `Size` (explicit sizing bounds for child).

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
