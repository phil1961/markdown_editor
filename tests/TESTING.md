# Markdown Editor — tests

```
node ../build.js
node markdown-editor.tests.js
node smoke.browser.js
node markdown-editor.browser.js
```

**Parser suite** (`markdown-editor.tests.js`) loads `dist/editor.cjs`, the Node bundle of every module without `@requires-dom`. It pins fences, nested quotes, URL sanitising, tables, `_snake_case_`, the Doc model's mark/peel/list/quote/table operations, and two regressions: a pipe-led line that is not yet a table must not hang `Doc.parse`, and `2 * 3 * 4` is not italics. Revert the fence extraction at the top of `Doc.parse` in `src/16-doc.js` (put the ``` handling back after the inline parse) and the "fences are opaque" group fails. On Windows it also runs `markdown-editor.ps1 -NoLaunch` and checks the injected `%TEMP%` copy. This suite and `node build.js --check` are the commit gates.

**Smoke check** (`smoke.browser.js`) is the short browser run that also travels inside the help (`src/help.md` includes it). Boot, typing in each pane reaching the other, Bold, code colouring, a callout, and the Help panel.

**Browser check** (`markdown-editor.browser.js`) is the full UI suite. It launches Brave, Chrome or Edge over the DevTools protocol with Node's built-in WebSocket (Node 22+), no npm. It skips with exit 0 if none is installed, and is the gate for any layout or interaction claim on a machine that has one. `--headed` watches it; `--out <dir>` keeps the screenshots. The "preview is contenteditable" assertion fails if the right pane is made read-only again. Later groups type into the preview, double-click a word, toggle bold / italic / underline, and cover lists, quotes, code blocks, links, rules, tables, the splitter, undo/redo, Save, the launcher payload, and the raw-pane toolbar state on the last line.

Screenshots go to a temp dir by default and are gitignored.
