# Markdown Editor

A dual-pane markdown editor that ships as **one HTML file** with zero network requests. Open `markdown-editor.html` in any browser.

The HTML file is **generated**. Edit `src/`, then:

```
node build.js            # assemble src/ into markdown-editor.html
node build.js --check    # fail if the assembled file is stale
```

---

## Features

- Dual-pane editing — markdown on the left, live rendered preview on the right (both panes are editable)
- Resizable panes — drag the bar between them, double-click to reset
- Synchronized scrolling (Track button)
- Formatting toolbar — bold, italic, underline, strikethrough, H1–H6, lists, nested quotes, code, images, links, tables, horizontal rules
- View modes — Editor only, Preview only, or Both
- Open via drag-and-drop, File menu, or Windows Explorer / the command line
- Export — Download markdown, or Export As HTML / Plain Text
- Undo/redo across both panes (Ctrl+Z / Ctrl+Y), with a History panel (Ctrl+Shift+H) that lists every step and what it changed

---

## Files

| File | Description |
|------|-------------|
| `markdown-editor.html` | Shipping artifact. Generated. Do not edit. |
| `src/` | Source. Numbered JS modules, `page.html`, `style.css`. |
| `build.js` | Assembler. No dependencies. |
| `tests/` | Parser suite and a real-engine (CDP) check |
| `markdown-editor.ps1` | Explorer / command-line launcher |
| `markdown-editor.bat` | Calls the ps1 |
| `markdown-editor.reg` | Written by `ps1 -Install`. Double-click also works. |
| `HANDOFF.md` | Plan of record |
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
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+K` | Link |
| `Ctrl+S` | Download markdown |
| `Ctrl+O` | Open |
| `Ctrl+N` | New |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+Shift+H` | Toggle the History panel |
| `Ctrl+Shift+L` | Toggle debug log panel |
| `Escape` | Close menus and dialogs |

---

## Tests

```
node build.js
node tests/markdown-editor.tests.js
node tests/markdown-editor.browser.js
```

The browser check needs Node 22+ and Brave, Chrome, or Edge. It is not a gate; it skips with exit 0 if no browser is found. No npm packages.

---

## Requirements

- Any modern browser to run the HTML
- Node.js 18+ to rebuild (`build.js`); Node 22+ for the browser check

---

## Author

Phil — November 2024; re-org 11 September 2026
