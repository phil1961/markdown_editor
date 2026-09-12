# Markdown Editor — tests

```
node ../build.js
node markdown-editor.tests.js
node markdown-editor.browser.js
```

**Parser suite** loads `dist/editor.cjs`. It pins fences, nested quotes, URL sanitising, tables, and `_snake_case_`. Revert the fence extraction in `src/20-parser.js` (put the ``` replace back after the bold regexes) and the "fences are opaque" group fails.

**Browser check** is not a gate. It launches Brave, Chrome or Edge over the DevTools protocol with Node's built-in WebSocket (Node 22+), no npm. Skip exit 0 if none is installed. `--headed` watches it; `--out <dir>` keeps the screenshots. The "preview is contenteditable" assertion fails if the right pane is made read-only again. A later group types into the preview, double-clicks the word Widget, and toggles bold / italic / underline — each pass asserts the wrapping tag and the toolbar `.active` class, then the second click removes both.

Screenshots go to a temp dir by default and are gitignored.
