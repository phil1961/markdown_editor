# Markdown Editor

A dual-pane markdown editor that ships as **one HTML file** with zero network requests. Open `markdown-editor.html` in any browser. Press F1 inside it for the user guide.

`markdown-editor.html` and `HELP.md` are **generated**. Edit `src/`, then:

```
node build.js            # assemble src/ into markdown-editor.html, HELP.md, dist/editor.cjs
node build.js --check    # fail if any of the three is stale
```

---

## Features

- Dual-pane editing — markdown on the left, live rendered preview on the right (both panes are editable)
- Resizable panes — drag the bar between them, double-click to reset
- Synchronized scrolling (Track button) and Find in other pane (the crosshair beside it)
- Formatting toolbar — bold, italic, underline, strikethrough, H1–H6, lists, nested quotes, callouts (`> [!NOTE]` and friends), code with a language picker, images, links, tables with row/column edits, horizontal rules
- Syntax colouring for fenced code in the preview and in exported HTML
- View modes — Editor only, Preview only, or Both
- Open via drag-and-drop, File menu, or Windows Explorer / the command line
- Save — writes back to the opened file in Chrome, Edge and Brave; Save As asks where; other browsers download
- Export — Export As Markdown / HTML / Plain Text (always a download)
- Undo/redo across both panes (Ctrl+Z / Ctrl+Y), with a History panel (Ctrl+Shift+H) that lists every step and what it changed
- In-page confirm and notice dialogs, so the editor works inside a sandboxed frame
- Help (F1) with a downloadable guide whose last section lets an AI rebuild the editor from the `.html` alone

---

## Files

| File | Description |
|------|-------------|
| `markdown-editor.html` | Shipping artifact. Generated. Do not edit. |
| `HELP.md` | The in-editor guide as a file. Generated from `src/help.md`. |
| `src/` | Source. Numbered JS modules, `page.html`, `style.css`, `help.md`. |
| `build.js` | Assembler. No dependencies. Writes the two generated files and `dist/editor.cjs`. |
| `tools/unpack.js` | Splits a built `markdown-editor.html` back into `src/`. The inverse of `build.js`. |
| `tests/` | Parser suite, a smoke check and a full UI check in a real browser (CDP, no packages) |
| `markdown-editor.ps1` | Explorer / command-line launcher |
| `markdown-editor.bat` | Calls the ps1 |
| `markdown-editor.reg` | Written by `ps1 -Install` for this machine's path. |
| `HANDOFF.md` | Plan of record: design, module map, pitfalls, debt |
| `CLAUDE.md` | Working rules for AI sessions |

---

## Windows Explorer

```
powershell -NoProfile -ExecutionPolicy Bypass -File .\markdown-editor.ps1 -Install
```

That adds **Open with Markdown Editor** to the right-click menu for `.md` files. Double-click still uses whatever app already owns `.md`. Uninstall: `.\markdown-editor.ps1 -Uninstall`, or double-click `markdown-editor-uninstall.reg`.

```
markdown-editor.bat README.md
markdown-editor.bat
```

The launcher copies the editor under `%TEMP%` and injects the file. It does not write into this folder.

---

## Keyboard

| Shortcut | Action |
|----------|--------|
| `F1` | Open or close Help |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+K` | Link |
| `Ctrl+S` | Save (back to the opened file, or ask where) |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+O` | Open |
| `Ctrl+N` | New |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+Shift+H` | Toggle the History panel |
| `Ctrl+Shift+L` | Toggle debug log panel |
| `Escape` | Close menus, dialogs and Help |

---

## Tests

```
node build.js
node build.js --check
node tests/markdown-editor.tests.js
node tests/smoke.browser.js
node tests/markdown-editor.browser.js
```

The first three are the gates. The browser checks need Node 22+ and Brave, Chrome, or Edge; they skip with exit 0 when no browser is found, and are the gate for layout and interaction claims where one is. No npm packages.

---

## Rebuilding from the HTML alone

The shipped file is self-describing. If `src/` is ever lost again:

```
node tools/unpack.js markdown-editor.html
node build.js --check
```

Help → the last section explains the same procedure for an AI that has only the `.html`.

---

## Requirements

- Any modern browser to run the HTML
- Node.js 18+ to rebuild (`build.js`); Node 22+ for the browser checks

---

## Author

Phil — November 2024; re-org 11 September 2026; source recovered from the deployed 1.5.0 on 25 September 2026
