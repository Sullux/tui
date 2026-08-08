# Built-In Control Reference

`@sullux/coms-tui-yaml` includes a suite of core controls that satisfy the functional interface contract `{ onMeasure, onLayout, onRender }`.

## Layout Controls

* **[layout (Flow Layout)](layout.md)** — Sequential linear stacking (`horizontal` or `vertical`).
* **[canvas (Absolute Layout)](canvas.md)** — Exact coordinate-based positioning (`x`, `y`).
* **[scroll (Scrolling Viewport)](scroll.md)** — Clipped scrolling viewport with auto-clamping, `contentSize`, and `maxScroll`.
* **[stack (Auto-Filling Helper)](stack.md)** — Auto-filling vertical/horizontal layout wrapper.
* **[wrap (Wrap Panel Layout)](wrap.md)** — Sequential flow layout that wraps overflowing children across rows or columns.

## Visual & Content Primitives

* **[text (Formatted Text)](text.md)** — Word-wrapped formatted text strings with alignment and ANSI styles.
* **[rich (Inline Span & Flow Text)](rich.md)** — Inline styled text spans and non-text elements flowing across wrapping lines.
* **[border (Decorative Box Outlines)](border.md)** — Rounded or square box outlines with automatic padding inset geometry.
* **[image (Kitty & Sixel Graphics)](image.md)** — Binary image rendering and SVG vector-to-raster compilation.
