# Developer Guide

The Developer Guide provides an in-depth reference for building applications with `@sullux/tui`.

## Table of Contents

1. **[Core Concepts](core-concepts.md)** — Intrinsic vs. parent-dependent layout properties.
2. **[The Tui Application Engine](tui-application-engine.md)** — Turnkey startup engine, lifecycle hooks, and virtual modules.
3. **[Context & JS Bindings](context-and-js-bindings.md)** — The `@` interception protocol and the `ctx` context API.
4. **[Focus & Navigation](focus-and-navigation.md)** — Pre-order DFS focus ordering, recursive enabling/disabling, and focus state indicators.
5. **[Keyboard Engine](keyboard-engine.md)** — Key translation, declarative `KeyHandler` routing, sequence operators, and suffix trimming.
6. **[Data Types](data-types.md)** — Type normalizer factories (`Measure`, `Size`, `Margin`, `Point`, `Bounds`, `Orientation`, `Color`, `Alignment`).
7. **[Markup Reference](markup-reference.md)** — Scoped template/class lookups (`:templates`, `:classes`), Method 2 imports, array splatting, and function invocation (`$` sigil).
