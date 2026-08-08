# @sullux/coms-tui-yaml

An enterprise-grade, declarative, component-driven User Interface framework designed from the ground up for terminal grids.

`@sullux/coms-tui-yaml` solves the complexity of terminal UI development by cleanly separating **markup structure and layout styling (expressed in logic-free YAML)** from **runtime behavior and event dispatching (expressed in pure, functional JavaScript)**.

---

## Documentation

Full documentation is available in the **[docs/](docs/README.md)** directory:

* **[Introduction](docs/introduction.md)** — The layout challenge and the declarative solution.
* **[Quick Start](docs/quick-start.md)** — Installation and building your first TUI application.
* **[Developer Guide](docs/developer-guide/README.md)**
  * [Core Concepts](docs/developer-guide/core-concepts.md)
  * [The Tui Application Engine](docs/developer-guide/tui-application-engine.md)
  * [Context & JS Bindings](docs/developer-guide/context-and-js-bindings.md)
  * [Focus & Navigation](docs/developer-guide/focus-and-navigation.md)
  * [Keyboard Engine](docs/developer-guide/keyboard-engine.md)
  * [Data Types](docs/developer-guide/data-types.md)
  * [Markup Reference](docs/developer-guide/markup-reference.md)
* **[Built-In Control Reference](docs/built-in-controls/README.md)**
  * [`layout`](docs/built-in-controls/layout.md), [`canvas`](docs/built-in-controls/canvas.md), [`scroll`](docs/built-in-controls/scroll.md), [`stack`](docs/built-in-controls/stack.md), [`wrap`](docs/built-in-controls/wrap.md)
  * [`text`](docs/built-in-controls/text.md), [`rich`](docs/built-in-controls/rich.md), [`border`](docs/built-in-controls/border.md), [`image`](docs/built-in-controls/image.md)
* **[Examples](docs/examples/README.md)**
  * [Animated Spinner](docs/examples/animated-spinner.md)
* **[License](docs/license.md)** — MIT License details.

---

## Quick Example

```yaml
# view.yaml
type: border
borderStyle: rounded
borderFg: '#7aa2f7'
inner:
  - type: text
    bold: true
    text: 'Hello from TUI YAML!'
```

```javascript
// app.js
const { Tui } = require('@sullux/coms-tui-yaml')

const app = Tui({ view: './view.yaml' })
app.start()
```

---

## Contributing Guide

We prioritize clean, maintainable, and testable source files. All contributions must adhere to the following guidelines:

1. **Vanilla JavaScript:** Vanilla Node.js ONLY. No TypeScript compilation, no build transpilation, no custom binary compilers. Standard imports strictly functional (CJS).
2. **Functional Paradigm over Object-Oriented:** Zero classes. Zero usage of the `this` keyword. Prefer pure, stateless factories that receive a state context object (`ctx`) and return immutable configurations.
3. **Auditability & Standalone Modules:** Keep files short (ideally under 100 lines). Sub-divide complicated modules into localized folders with an `index.js` file to protect monorepo workspace imports.
4. **Prettier Format Style:** Standard Prettier formatting with **explicit trailing commas** and **absolutely zero semicolons** (enforced by `.prettierrc`).

---

## License

Distributed under the **MIT License**. See [docs/license.md](docs/license.md) for full terms.
