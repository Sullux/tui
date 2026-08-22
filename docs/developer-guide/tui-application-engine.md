# The Tui Application Engine

The `Tui` factory provides a production-grade container that encapsulates TTY stream setup, alternate screen buffer isolation, raw keyboard listener loops, double-buffered screen rendering, and process exit traps.

---

## Initialization Options

Pass configuration options to the `Tui(options)` factory:

* **`view`** (`string` | `object`): The primary layout view structure. Can be a filepath referencing a YAML layout file or a pre-parsed JavaScript object tree.
* **`state`** (`object`): Optional initial application state (such as `focusedId`).
* **`modules`** (`object`): Registered dictionary of in-memory virtual JavaScript modules to enable dependency injection without file I/O.
* **`truecolor`** (`boolean`): Enables 24-bit Truecolor RGB escape output (defaults to `true`). Low-capability terminals automatically degrade to standard ANSI colors.
* **`stdin`** (`Readable`): Standard input TTY stream (defaults to `process.stdin`).
* **`stdout`** (`Writable`): Standard output TTY stream (defaults to `process.stdout`).

---

## Instance APIs

An initialized `app` instance exposes the following methods and properties:

* **`app.start()`**: Enters the terminal's Alternate Screen Buffer (`\x1b[?1049h`), hides the hardware cursor (`\x1b[?25l`), enables raw mode stdin, focuses the first focusable element, and performs the initial double-buffered redraw.
* **`app.stop(err)`**: Restores the main terminal screen buffer (`\x1b[?1049l`), restores the hardware cursor (`\x1b[?25h`), cleanly releases stdin/stdout listeners, and invokes registered exit callbacks.
* **`app.redraw()`**: Microtask-batched rendering queue scheduler. Rapid consecutive requests are coalesced into a single `setImmediate` microtask context.
* **`app.onExit(callback)`**: Registers an exit listener `callback(err)` triggered during teardown.
* **`app.ctx`**: Accesses the active transactional `ctx` context layer.
* **`app.compiler`**: Accesses the underlying `ControlCompiler` instance.
* **`app.loader`**: Accesses the underlying YAML/dependency recursive `Loader` instance.

---

## Virtual Module Registration & Dependency Injection

To keep views decoupled and testable, register in-memory virtual JavaScript objects under alias names during initialization:

```javascript
const app = Tui({
  view: {
    type: 'layout',
    inner: [
      {
        type: 'text',
        text: '@model:getMessage', // Resolves to in-memory model module!
      },
    ],
  },
  modules: {
    model: {
      getMessage: () => 'Hello from virtual module!',
    },
  },
})
```

Virtual modules resolve in-memory via `@alias:exportName` without disk traversal.
