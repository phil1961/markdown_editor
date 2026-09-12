# Markdown Editor v1.1.1

A dual-pane markdown editor that ships as **one HTML file** with zero network requests. Open `markdown-editor.html` in any browser.

The HTML file is **generated**. Edit `src/`, then:

```
node build.js            # assemble src/ into markdown-editor.html
node build.js --check    # fail if the assembled file is stale
```

---

## Features

- Dual-pane editing — markdown on the left, live rendered preview on the right (both panes are editable)
- Synchronized scrolling (Track button)
- Formatting toolbar — bold, italic, underline, strikethrough, H1–H6, lists, nested quotes, code, images, links, tables, horizontal rules
- View modes — Editor only, Preview only, or Both
- Open via drag-and-drop or File menu
- Export — Download markdown, or Export As HTML / Plain Text
- Native undo in the textarea (Ctrl+Z)

---

## Files

| File | Description |
|------|-------------|
| `markdown-editor.html` | Shipping artifact. Generated. Do not edit. |
| `src/` | Source. Numbered JS modules, `page.html`, `style.css`. |
| `build.js` | Assembler. No dependencies. |
| `tests/` | Parser suite and a real-engine (CDP) check |
| `HANDOFF.md` | Plan of record |
| `CLAUDE.md` | Working rules for AI sessions |

Windows Explorer / `.ps1` / `.bat` / `.reg` launch is a later addition. Ignore those files for now.

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
| `Ctrl+Z` | Undo (native textarea) |
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
