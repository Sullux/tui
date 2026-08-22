# image (Kitty & Sixel Graphics)

Renders binary graphics assets (PNG, JPEG) or compiles SVG XML vector markup on-the-fly, mapping image dimensions to terminal character cells (standard 12x24 pixel-to-cell ratio).

Supports Kitty Graphics protocol (`\x1b_G`) with atomic cell positioning and fallback placeholder sequences.

---

## Example Usage

### 1. File Asset
```yaml
type: image
src: './assets/logo.png'
width: 30
height: 12
```

### 2. Inline Vector SVG
```yaml
type: image
src: '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#7aa2f7"/></svg>'
width: 2
height: 1
```

---

## Intrinsic Properties

* **`src`**: `string` (local filepath or raw SVG XML markup string).
* **`bg`**: `Color`.

---

## Parent-Dependent Child Layout Properties

* **`width` / `height`**: `Size` (Unloaded or missing assets collapse dynamically to height `1` cell, expanding to specified dimensions upon asset retrieval).
* **`margin`**: `Margin`.

---

## Supported Events

* **Keyboard Input:** `onKeyPreview`, `onKey`, `onKeyBubble`
* **Focus Lifecycle:** `onFocus`, `onBlur`
* **Control Lifecycle:** `onMeasure`, `onLayout`, `onRender`
