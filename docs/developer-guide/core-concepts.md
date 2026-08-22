# Core Concepts

## Intrinsic vs. Parent-Dependent Properties

The framework operates with a clear distinction between **intrinsic component properties** (internal dimensions, styles, and contents that a component owns directly) and **parent-dependent layout properties** (sizing suggestions, margins, and alignments interpreted by the parent container).

### Intrinsic Properties

Intrinsic properties are owned entirely by the control itself to define its internal visual landscape:
* **`direction`**: Flow or stacking orientation (`horizontal` or `vertical`).
* **`bg` / `fg`**: Background and foreground colors.
* **`padding`**: Inner spacing inside the container's border boundaries.
* **`inner`**: The array or object containing nested child elements.

### Parent-Dependent Properties

Parent-dependent properties act as layout *suggestions* to the parent container. The parent container's layout solver (`layout`, `canvas`, `scroll`, `wrap`, etc.) has final authority on how to interpret, validate, and place these properties:
* **`width` / `height`**: Sizing requests (`number`, `'100%'`, `'fill'`, `'content'`).
* **`margin`**: Spacing applied outside the element's box (collapsing adjacent sibling margins).
* **`halign` / `valign`**: Alignment along primary and non-primary flow dimensions.
* **`x` / `y`**: Absolute point coordinates (interpreted specifically by `canvas`).
