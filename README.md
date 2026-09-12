# Markdown Editor v1.1.0

A dual-pane markdown editor that ships as **one HTML file** with zero network requests. Open `markdown-editor.html` in any browser. Windows Explorer integration is optional: a right-click verb and a `.bat` launcher.

The HTML file is **generated**. Edit `src/`, then:

```
node build.js            # assemble src/ into markdown-editor.html
node build.js --check    # fail if the assembled file is stale
```

---

## Features

- Dual-pane editing — markdown on the left, live rendered preview on the right (preview is read-only)
- Synchronized scrolling (Track button)
- Formatting toolbar — bold, italic, underline, strikethrough, H1–H6, lists, nested quotes, code, images, links, tables, horizontal rules
- View modes — Editor only, Preview only, or Both
- Open via drag-and-drop, File menu, command line, or right-click
- Export — Download markdown, or Export As HTML / Plain Text
- Native undo in the textarea (Ctrl+Z)

---

## Files

| File | Description |
|------|-------------|
| `markdown-editor.html` | Shipping artifact. Generated. Do not edit. |
| `src/` | Source. Numbered JS modules, `page.html`, `style.css`. |
| `build.js` | Assembler. No dependencies. |
| `markdown-editor.ps1` | Launcher and context-menu installer |
| `markdown-editor.bat` | Calls the ps1 |
| `markdown-editor.reg` | Context-menu verb (does not change the default `.md` opener) |
| `markdown-editor-uninstall.reg` | Removes that verb only |
| `tests/` | Parser suite and a real-engine (CDP) check |
| `HANDOFF.md` | Plan of record |
| `CLAUDE.md` | Working rules for AI sessions |

---

## Installation

```
powershell -NoProfile -ExecutionPolicy Bypass -File markdown-editor.ps1 -Install
```

Or double-click `markdown-editor.reg`. This adds **Open with Markdown Editor** for `.md` files. It does **not** change what double-click does.

To remove the verb: `markdown-editor.ps1 -Uninstall`, or double-click `markdown-editor-uninstall.reg`.

Optional: add this folder to `PATH` to run `markdown-editor.bat` from anywhere.

---

## Usage

Right-click any `.md` file → **Open with Markdown Editor**.

```
markdown-editor.bat README.md
markdown-editor.bat
```

No arguments opens a blank editor. The launcher injects file contents as `window.MD_PAYLOAD` into a **temporary** copy under `%TEMP%` (browsers block URL fragments on `file://`).

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

- Windows 10 or later for the launcher; the HTML itself is any modern browser
- Node.js 18+ to rebuild (`build.js`); Node 22+ for the browser check
- PowerShell 5.1 or later (included with Windows 10)

---

## Author

Phil — November 2024; re-org 11 September 2026
