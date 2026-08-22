# Introduction

## The Terminal UI Layout Challenge

Building complex User Interfaces in terminal emulators historically required verbose, imperative code. Developers had to write custom coordinate-tracking loops, manually compute text word-wrapping boundaries, and clear screen buffers directly using raw ANSI escape codes. This traditional approach suffers from several key flaws:

1. **Flicker and Overlap:** Redrawing terminal screens imperatively introduces rendering "tearing" and residual visual frames, especially when updating adjacent panes or modal overlays.
2. **Terminal Profile Pollution:** Terminal emulator color profiles often override standard 16-color ANSI definitions (rendering standard blue as pink, for instance). 24-bit Truecolor RGB escapes bypass these overrides but lack graceful fallback chains for lower-capability terminals.
3. **Tight Coupling:** UI layout, styling, and event handling logic become tightly interwoven, making components difficult to test, audit, or reuse across applications.

---

## The Declarative Solution

`@sullux/tui` leverages a pure functional architecture:

* **The Discrete Box Model:** Every element in the YAML markup tree compiles into a localized virtual bounding box. Widths, heights, padding, and margins are solved deterministically using character cell dimensions.
* **Double-Buffered Renderer:** Rendering occurs to an in-memory double-buffered character grid. Differences between frames are computed and flushed in a single atomic terminal write-stream, eliminating flicker and scrollback pollution.
* **Separation of Concerns:** YAML markup is strictly logic-free. Property bindings, variable interpolation, and user events reference stateless JavaScript callbacks using a lightweight `@` reference protocol.
* **Truecolor Graceful Fallbacks:** Explicit 24-bit Truecolor RGB escapes degrade automatically into standard ANSI colors based on active terminal capability profiles.
