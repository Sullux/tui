# Animated Spinner Example

This example demonstrates how to build a state-reactive animated spinner component using YAML classes and a simple JavaScript controller.

---

## 1. Component Definition (`spinner.yaml`)

```yaml
classes:
  spinnerStyle:
    type: text
    bold: true
    fg: '#ff9e64'

main:
  type: layout
  direction: horizontal
  inner:
    - type: text
      class: spinnerStyle
      text: '@spinner-controller.js:getFrame'
    - type: text
      margin: { l: 1 }
      text: 'Loading assets...'
```

---

## 2. Controller Logic (`spinner-controller.js`)

```javascript
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
let currentFrame = 0

// Cycle spinner frame on every redraw pass
exports.getFrame = () => {
  const frame = frames[currentFrame]
  currentFrame = (currentFrame + 1) % frames.length
  return frame
}
```

---

## 3. Usage in View Markup

```yaml
inner:
  - type: '@spinner.yaml:main'
```
