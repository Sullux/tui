# caret (Caret / Insertion Point)

A dedicated control for rendering customizable cursor glyphs, color inversions, multi-cell dimensions, and animations at insertion points.

---

## Example Usage

```yaml
type: caret
mode: invert      # 'invert' | 'block' | 'bar' | 'underline'
fg: '#7aa2f7'
width: 1
height: 1
```

---

## Intrinsic Properties

* **`mode`**: `'invert'` | `'block'` | `'bar'` | `'underline'` (defaults to `'invert'`).
* **`char`**: `string` — Custom glyph to paint at the caret position (e.g. `'█'`, `'│'`, `'▏'`).
* **`width` / `height`**: `number` — Dimensions in character cells (defaults to `1`x`1`).
* **`fg` / `bg`**: `Color` — ANSI colors applied to the caret.
* **`bold` | `italic` | `underline` | `invert`**: `boolean` — Text formatting attributes.
* **`isVisible`**: `boolean` — Visibility flag.

---

## Control Modes

| Mode | Visual Behavior |
|---|---|
| **`invert`** | Inverts the underlying grid cell's foreground/background colors so text under the caret remains legible. |
| **`block`** | Overwrites the cell with a solid character (`'█'` or custom `char`). |
| **`bar`** | Renders a vertical boundary line (`'│'` or `'▏'`). |
| **`underline`** | Applies underline attribute or renders an underscore `'_'`. |
