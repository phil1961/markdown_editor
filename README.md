# Markdown Editor v1.0.40

A professional dual-pane markdown editor that runs entirely in the browser as a single HTML file. Features a live preview pane, rich formatting toolbar, and full Windows File Explorer integration for opening `.md` files directly from the right-click context menu or DOS command line.

---

## Features

- **Dual-pane editing** — markdown source on the left, live rendered preview on the right
- **Synchronized scrolling** — editor and preview scroll together (toggle with Track button)
- **Rich formatting toolbar** — bold, italic, underline, strikethrough, H1–H6, lists, blockquotes, code, images, links, tables, horizontal rules
- **Multi-level blockquotes** — Quote+ and Quote− buttons for nested quote levels
- **Bidirectional editing** — edit in either the editor or preview pane
- **View modes** — Editor only, Preview only, or Both
- **File operations** — open via drag-and-drop, File menu, DOS command line, or right-click context menu
- **Export formats** — save as Markdown, HTML, or Plain Text via File → Export As
- **History/undo support**
- **Table insertion** — configurable rows and columns
- **Keyboard shortcuts** for common formatting operations
- **Comprehensive logging** — built-in debug log panel

---

## Files

| File | Description |
|------|-------------|
| `markdown-editor.html` | The editor application — open this in any browser |
| `markdown-editor.ps1` | PowerShell launcher script for DOS and context menu integration |
| `markdown-editor.bat` | Two-line DOS shortcut that calls the ps1 |
| `markdown-editor.reg` | Installs the right-click context menu entry in Windows Explorer |
| `markdown-editor-uninstall.reg` | Removes the context menu entry |
| `md_editor_launch.html` | Auto-generated temp file created on each launch — do not edit |

All files live in `D:\Projects\Markdown_Editor\`.

---

## Installation

### 1. Install the right-click context menu entry

Double-click `markdown-editor.reg` and click **Yes** when prompted. This registers:

- `Open with Markdown Editor` in the right-click menu for all `.md` files
- Double-click on `.md` continues to open in VSCodium as before

To uninstall, double-click `markdown-editor-uninstall.reg`.

### 2. Add to your PATH (optional, for DOS use)

To use `markdown-editor.bat` from any directory, add `D:\Projects\Markdown_Editor` to your system `PATH` environment variable.

---

## Usage

### From Windows File Explorer

Right-click any `.md` file → **Open with Markdown Editor**

### From the DOS command line

```batch
markdown-editor.bat README.md
markdown-editor.bat C:\path\to\any\file.md
```

Or call PowerShell directly:

```batch
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Projects\Markdown_Editor\markdown-editor.ps1" README.md
```

### Opening without a file

Running `markdown-editor.bat` with no arguments opens a blank editor:

```batch
markdown-editor.bat
```

---

## How the launcher works

The `.ps1` script reads the target `.md` file, base64-encodes its content, and injects it as a `window.MD_PAYLOAD` JavaScript variable directly into a temporary copy of the HTML (`md_editor_launch.html`). The browser opens this temp file and the editor detects the payload on startup, decodes it, and populates both the editor and preview panes automatically.

This approach is necessary because browsers block URL fragment (`#hash`) passing for `file:///` URLs.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+Z` | Undo |
| `Ctrl+S` | Save |

---

## Version History

| Version | Changes |
|---------|---------|
| v1.0.40 | Fixed header highlighting, wired up undo history, debounced preview, fixed block format on unwrapped text |
| v1.0.39 | DOS and right-click context menu file launch via ps1 injection |
| v1.0.38 | Fixed duplicate scrollbar; fixed scroll sync element targeting |
| v1.0.37 | Added view mode toggle (Editor/Preview/Both); table insertion |
| v1.0.36 | Drag and drop file loading; File menu; Export As options |
| v1.0.35 | Fixed Quote+List order bug in preview pane |

---

## Requirements

- Windows 10 or later
- Any modern browser (Chrome, Brave, Edge, Firefox)
- PowerShell 5.1 or later (included with Windows 10)
- VSCodium (or any editor) for double-click `.md` association

---

## Author

Phil — November 2024
