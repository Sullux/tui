# Data Types

The `@sullux/coms-tui-yaml` layout engine relies on strict functional type normalization factories exported from `lib/types.js` (and available on `ctx`).

---

## Measure

Represents a sizing coordinate on a single axis (`width` or `height`).

* **`number`**: Integer cell count in the terminal (e.g. `10`).
* **`string` (percentage)**: Relative parent percentage (e.g. `'100%'`, `'50%'`).
* **`array`**: Fallback sequential preferences (e.g. `['100%', 10]`). The first supported format is used; remaining items act as fallbacks.
* **`'fill'`**: Occupies all remaining unallocated space in the parent container.
* **`'content'`**: Shrinks to fit the exact maximum boundary of inner content or child nodes.
* **`object`**: Long-form wrappers `{ measure: Value }` or `{ m: Value }`.

---

## Size

A composition of horizontal (`width`) and vertical (`height`) Measures.

* **Single `Measure`**: Both width and height are assigned this value.
* **`array`**: Exactly two elements `[width, height]` (e.g. `['100%', 3]`).
* **`object`**: `{ width, height }`, `{ w, h }`, `{ size: Value }`, or `{ s: Value }`.

---

## Margin

A 4-way composition of Measures representing spacing outwards around elements (`left`, `top`, `right`, `bottom`). Margins of adjacent layout components collapse to the largest margin value.

* **Single `Measure`**: Assigned to all four sides.
* **`array` (2 elements)**: Treated as `[left/right, top/bottom]`.
* **`array` (4 elements)**: Treated as `[left, top, right, bottom]`.
* **`object`**: `{ left, top, right, bottom }`, `{ l, t, r, b }`, `{ horizontal, vertical }`, or `{ h, v }`.

---

## Point

Represents discrete grid coordinates `[x, y]`.

* **Single `Measure`**: Assigned to both `x` and `y`.
* **`array` (2 elements)**: Treated as `[x, y]`.
* **`object`**: `{ x, y }` or wrappers `{ point: [x,y] }` / `{ p: { x, y } }`.

---

## Bounds

A composition of a `Point` and a `Size` representing absolute layout boundaries.

* **`array` (2 elements)**: Treated as `[Point, Size]`.
* **`object`**: `{ x, y, width, height }`, `{ x, y, w, h }`, or `{ bounds: [[x,y], [w,h]] }`.

---

## Orientation

A directional configuration value. Resolves to:
* `'horizontal'` | `'h'`
* `'vertical'` | `'v'`

---

## Color

Determines background or foreground colors. Supports:
* **`number`**: 32-bit ARGB integer.
* **`string` (Hex)**: 24-bit Truecolor hex string (e.g. `'#7aa2f7'`).
* **`string` (ANSI 4-bit)**: Color names (`'black'`, `'red'`, `'green'`, `'yellow'`, `'blue'`, `'magenta'`, `'cyan'`, `'white'`).
* **`string` (ANSI 8-bit)**: Indices `'color16'` through `'color255'`.
* **`array`**: Graded preference fallbacks (e.g. `['#7aa2f7', 'blue']`).

---

## Alignment

Defines element positioning along flow axes.
* **`halign`**: `'left'` (`'l'`), `'right'` (`'r'`), `'center'` (`'c'`), `'stretch'` (`'s'`).
* **`valign`**: `'top'` (`'t'`), `'bottom'` (`'b'`), `'middle'` (`'m'`), `'stretch'` (`'s'`).
