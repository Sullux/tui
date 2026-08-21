# Markup Reference

YAML markup files in `@sullux/tui` are strictly logic-free declarations. All dynamic data, templates, and styles are resolved via scoping, imports, and sigils (`@`, `:`, `$`).

---

## Special Properties: `type`, `templates`, `classes`, and `isVisible`

* **Zero-Hoisting Philosophy:** Where an import or definition is placed is strictly where it lives. Nothing leaks into ambient global registries.
* **`type` (Scoped Template Path Lookup):** Specifying `type: conversation` looks up **`:templates.conversation`** on the current node or walks recursively up `node.parent`. If not found, it falls back to built-in system controls (`text`, `border`, `layout`, etc.).
* **`class` (Scoped Class Path Lookup):** Specifying `class: panel` (or an array `class: [unread, selected]`) looks up **`:classes.panel`** on the current node or walks up `node.parent`. Multiple classes deep-merge left-to-right.
* **`templates` / `classes`**: Local scoped dictionaries holding reusable component configurations (`templates`) or style property bags (`classes`).
* **`isVisible`**: A boolean switch (optionally bound to dynamic JS callbacks). When `false`, the layout solver collapses bounds to `0` and skips rendering passes.

---

## The `@` JS Reference Interception Protocol

Interpolate dynamic JS values or bind event handlers by prepending a string with `@`:

```yaml
text: '@controller.js:getUnreadCount'
```

The loader imports the specified JS module relative to the active file directory and compiles the exported value or callback into the node property.

---

## The `:` Lexical Local Reference Resolution

Prepend a property value with `:` to query local variable bindings or walk up the ancestor chain:

```yaml
fg: ':style.primary'
```

This traverses up `node.parent` recursively to resolve nested style objects or handlers, supporting variable inheritance and automatic shorthand coordinate expansion.

Aliasing classes and templates works natively via `:` references (e.g. `classes: { selected: ":classes.indigo" }` or `classes: { selected: ":theme.indigo" }`).

---

## The `$` Parameterized Function Invocation Sigil

Invoke a JavaScript mapping function with argument parameters directly from YAML by prepending the property key with `$`:

```yaml
inner:
  '$main-controller.js:conversationItems':
    type: text
    width: fill
    height: content
    selected: ':classes.indigo'
    unread: { bold: true }
```

When evaluated, the framework invokes the exported function passing `(ctx, args)` where `args` contains the resolved YAML object.

---

## Chronological Color Fallback Arrays

Colors are evaluated as ordered preference chains:

```yaml
fg: ['#c0caf5', 'color188', 'white']
```

The styling engine compiles final ANSI styles dynamically based on active terminal capabilities.

---

## Modular Markup Importing & Splatting

Import templates or classes from external modular files directly into local objects or arrays:

```yaml
templates:
  # 1. Selective imports with aliasing
  '@controls/form.yaml':
    - checkbox
    - textbox: textentry

  # 2. Object Splatting (*) - copies properties directly into templates map
  '@controls/spinner.yaml': '*'

  # 3. Namespace entire file under "spinnerGroup"
  spinnerGroup: '@controls/spinner.yaml'
```

---

## Inline YAML Imports

Import and reference elements inline within layout trees:

```yaml
inner:
  - type: '@controls/button.yaml:primaryButton' # Loads and merges PrimaryButton template directly
    text: 'Save'
```

---

## Array Splatting / Fragment Spreading

Spread layout collections directly into parent sibling arrays using wildcard map notation:

```yaml
inner:
  - '@controls/header.yaml' # Embeds single component
  - '@controls/buttons.yaml': '*' # Spreads and flattens array directly into parent layout!
  - type: text
    text: 'Footer'
```
