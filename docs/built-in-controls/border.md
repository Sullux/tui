# border (Decorative Box Outlines)

Paints decorative border frames around content boxes, automatically reserving border cell space and shifting child coordinates inward.

---

## Example Usage

```yaml
type: border
borderStyle: rounded # 'single', 'double', or 'rounded'
borderFg: '#7aa2f7'
borderBg: '#1a1b26'
width: 40
height: 10
inner:
  - type: text
    text: 'Content inside border panel'
```

---

## Intrinsic Properties

* **`borderStyle`**: `'single'` | `'double'` | `'rounded'` (default: `'single'`).
* **`borderFg`** / **`borderBg`**: `Color`.
* Same intrinsic properties as `layout` (`padding`, `bg`, `inner`).

---

## Parent-Dependent Child Layout Properties

* Same parent-dependent layout properties as `layout` (`width`, `height`, `margin`, `align`).

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
