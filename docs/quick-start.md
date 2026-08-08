# Quick Start

## Installation

Add the library into your workspace using `yarn` or `npm`:

```bash
yarn add @sullux/coms-tui-yaml
# or
npm install @sullux/coms-tui-yaml
```

---

## Creating Your First TUI App

Create four small files in your project directory: a stylesheet, a YAML view, a JS controller, and an application runner.

### 1. Define Your Styles: `theme.yaml`

```yaml
classes:
  panel:
    margin: 1
    padding: 1
    fg: ['#c0caf5', 'white']
    bg: '#1a1b26'
```

### 2. Define Your View: `view.yaml`

```yaml
classes:
  '@theme.yaml:classes': '*' # Import classes directly into local classes map

type: layout
width: fill
height: fill

inner:
  - type: border
    class: panel
    inner:
      - type: text
        wrap: true
        bold: true
        fg: '#7aa2f7'
        text: "─── Hello World ───"
      - type: text
        text: '@controller.js:getDynamicContent'
```

### 3. Define Your Business Logic: `controller.js`

```javascript
let renderCount = 0

exports.getDynamicContent = () => {
  renderCount++
  return `Real-time updates active! Frame count: ${renderCount}`
}
```

### 4. Run the Engine: `app.js`

Utilize the turnkey `Tui` factory for double-buffered rendering, resize tracking, Alternate Buffer isolation, and keyboard capture:

```javascript
const { Tui } = require('@sullux/coms-tui-yaml')

// 1. Initialize the App engine with the view
const app = Tui({
  view: './view.yaml',
  truecolor: true,
})

// 2. Schedule dynamic redraw updates
setInterval(() => {
  app.redraw()
}, 1000)

// 3. Setup cleanup event on exit
app.onExit(() => {
  console.log('TUI application exited successfully.')
})

// 4. Start the engine!
app.start()
```

Run the application:

```bash
node app.js
```
