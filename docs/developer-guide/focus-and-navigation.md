# Focus & Navigation

Linear focus navigation in terminal interfaces uses a **functional, recursive tree model with lexicographical coordinate paths**.

---

## Eligible Focusable Elements

A compiled element is eligible to receive active user focus if:
1. It defines focusability: `focusable: true` or `canFocus: true`.
2. It is not explicitly marked `focusable: false` on its instance properties.
3. It and all of its ancestors are recursively enabled.

---

## Recursive Enabling & Disabling

Instead of managing stateful disabling listeners on every interactive control, the framework evaluates enabled states dynamically. An element is enabled if **neither it nor any of its ancestors** has `enabled: false`, `isEnabled: false`, or `disabled: true`.

Setting `disabled: true` on an outer container (like a dialog or form container) recursively disables its entire subtree:

```yaml
type: layout
id: billingForm
disabled: '@controller.js:isBillingDisabled' # Toggles entire subtree focus eligibility!
inner:
  - type: text
    id: billingAddress
    focusable: true
  - type: text
    id: billingZip
    focusable: true
```

---

## Hierarchical Local Sibling Ordering

The `order` property defines the linear tab sequence of focusable elements, decoupling logical focus order from markup declaration order.

* **Numeric Evaluation:** Accepts positive or negative numbers (e.g. `order: 1`, `order: 10`).
* **Unordered Fallbacks:** Items without an explicit `order` default to a high fallback value, retaining natural markup sequence after ordered items.

---

## Lexicographical Sequence Paths

To support complex layouts with nested groups of controls without global sequence indices, the focus engine resolves focus order lexicographically.

When gathering focusable elements, the engine builds a **weight path coordinate array** for each leaf node by walking down from the root, recording the local `order` or index weight of each ancestor:

```yaml
# Form1 (order: 1)
#   - InputA (order: 1)   --> Path: [1, 1]
#   - InputB (order: 2)   --> Path: [1, 2]
# Form2 (order: 2)
#   - InputC (order: 1)   --> Path: [2, 1]
#   - InputD (order: 2)   --> Path: [2, 2]
```

Sorting coordinate paths lexicographically yields the exact reading order:
`[1, 1]` $\rightarrow$ `[1, 2]` $\rightarrow$ `[2, 1]` $\rightarrow$ `[2, 2]`.

---

## Focus State Indicators: `hasFocus` & `containsFocus`

When redrawing, the framework dynamically injects active focus flags onto compiled nodes:
* **`node.hasFocus`**: Set to `true` strictly on the element holding active focus.
* **`node.containsFocus`**: Set to `true` on the focused element *and* bubbled recursively up to all of its ancestors.

This allows parent containers to style themselves based on child focus state:

```yaml
type: border
# Dynamic color fallback array turns blue when any inner child is focused!
bg: [':style.bg', ':containsFocus', 'blue']
inner:
  - type: text
    focusable: true
```
