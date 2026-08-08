# scroll (Scrolling Viewport)

Renders a virtual clipping viewport for inner content, using a single unified `scroll` offset to clip overflow cleanly to visible screen boundaries.

---

## Example Usage

```yaml
type: scroll
direction: v # Orientation: 'vertical' or 'horizontal'
scroll: ':state.scrollPos' # Dynamic scroll offset
width: fill
height: fill
inner:
  - type: layout
    inner:
      - type: text
        text: 'Long scrollable content line 1'
      - type: text
        text: 'Long scrollable content line 2'
```

---

## Intrinsic Properties

* **`direction`**: `Orientation` (default: `'vertical'`). Accepts `'vertical'` (`'v'`) or `'horizontal'` (`'h'`). Standardized via `parseOrientation`.
* **`scroll`**: `number` (discrete cell scroll position along the primary flow axis). Automatically clamped to `[0, maxScroll]`.
  * Setting `scroll: Infinity` or a large value (e.g. `9999`) automatically pins the scroll view to the bottom!
* **`padding`**: `Margin` (inner padding space inside viewport bounds).
* **`bg`**: `Color` (background color fill).
* **`inner`**: `array` | `object` (nested child controls).

---

## Runtime Metadata Properties Attached to Node

During the layout phase (`onLayout`), `scroll` automatically calculates and attaches metadata onto `node` for application controllers and scrollbar indicators:

* **`node.contentSize`**: `{ width, height }` — Total unconstrained dimensions of the inner content.
* **`node.maxScroll`**: `number` — Maximum valid scroll offset (`Math.max(0, contentLength - viewportSize)`).
* **`node.effectiveScroll`**: `number` — The final clamped scroll value applied during rendering.

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (Primary sizing defaults to `'content'`, non-primary defaults to `'fill'`).
* **`margin`**: `Margin`

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
* **Viewport Events:** `onScroll(ctx, { scroll, effectiveScroll, maxScroll, contentSize })` — Fired when the scroll viewport updates position during layout.
