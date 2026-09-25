"use strict";

const BUILD = {
  version:  "1.5.2",
  released: "25 September 2026",
  compiled: "@@COMPILED@@",
  corrections: [
    ["Raw and preview were two live copies of the note",
     "A document model is now the source of truth. Both panes are views. "
     + "Toolbar and preview typing are model operations, not HTML unwrap."],
    ["Numbering several paragraphs made four lists that all started at 1, "
     + "and Enter inside a list jumped out of it",
     "Selected blocks become one list. Enter adds the next item; Enter on an "
     + "empty item leaves the list. Typing stays in the item."],
    ["Pasted numbered items with blank lines became one <ol> each, so every "
     + "marker showed as 1.",
     "Blank lines no longer break a list. Adjacent numbered items are one "
     + "list, 1. 2. 3."],
    ["A second click on quote-increase removed the indent instead of nesting",
     ">+ adds a quote level each time. >- removes one level."],
    ["Could not indent one line further inside an already-quoted block",
     ">+ / >- now apply to the selected inner lines, not always the whole quote."],
    ["Enter at the end of a quote left a blank indented line at the bottom",
     "Enter at the end of a quote (or on an empty quoted line) leaves the quote."],
    ["Could not click below the last line of the preview to put the caret there",
     "After a quote, heading, or list there is a landing paragraph. Clicks in "
     + "the empty space of the pane go there. It is not written into the file."],
    ["Numbering indented lines collapsed them to '1. a b c'",
     "Lists apply to the selected lines inside a quote, one item per line."],
    ["Enter in a code block created a paragraph outside the fence",
     "Enter inserts a newline inside the code. Click below the box to leave it."],
    ["Code-block with no selection did nothing",
     "The button with a collapsed caret inserts an empty fence you can type in."],
    ["Insert Link put the <a> into the URL field of the popup",
     "The caret is saved when the modal opens. Submit inserts [text](url) into the document and returns focus to the pane."],
    ["A horizontal rule could be inserted but not removed",
     "Click the rule and press Backspace, or click it and press the HR button again."],
    ["Tables could be inserted but not edited",
     "With the caret in a table: insert/delete row and insert/delete column."],
    ["The demo had no way to take the editor home",
     "Header and File menu offer Download editor: the HTML file, to open locally."],
    ["Opening a .md from Explorer or the command line did nothing",
     "Right-click Open with Markdown Editor, or markdown-editor.bat file.md. "
     + "The file loads in the editor. Launch copies go under %TEMP%."],
    ["The two panes were always the same width",
     "Drag the bar between them to resize. Double-click resets to half. "
     + "The split is remembered in this browser."],
    ["Undo only worked in the raw pane, and only for typing",
     "One undo stack for both panes. Ctrl+Z / Ctrl+Y (or the toolbar arrows) "
     + "step through typing, formatting, inserts, and table edits. The Undo/Redo "
     + "tooltips name the step. Ctrl+Shift+H opens a History panel that lists "
     + "every snapshot with what changed; click a row to jump to it."],
    ["Ctrl+S only downloaded a copy; there was no way to write back to the file",
     "In Chrome, Edge and Brave, Open gives the editor a handle to the file and "
     + "Save (Ctrl+S) writes back to it. A new document asks where the first time. "
     + "Save As (Ctrl+Shift+S) always asks. Other browsers still download."],
    ["Embedded in a sandboxed page, dropping a file onto a modified document did nothing",
     "Confirmations and warnings are in-page dialogs instead of the browser's confirm() "
     + "and alert(), which sandboxed frames silently ignore. A drop onto either pane asks, "
     + "then loads, wherever the editor is hosted."],
    ["A word selected in one pane could not be found in the other",
     "Find in other pane (the crosshair beside Track) selects the same occurrence in "
     + "the other pane and scrolls to it. A caret inside a word works too."],
    ["A code block was plain grey text whatever language it held",
     "A fence with a language (```shell, ```powershell, ```python, ```diff and more) is coloured "
     + "in the preview and in exported HTML. The picker beside Code Block sets the language of the block at the caret."],
    ["There was no way to mark a quote as a note or a warning",
     "> [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] and [!CAUTION] render as titled, coloured callouts, "
     + "the markup GitHub uses. The Callout picker beside the quote buttons sets or removes the type."],
    ["There was no help, and nothing explained how to rebuild the editor from the file alone",
     "Help (F1, the Help button, or File, Help) opens a guide inside the editor, and Download help (.md) "
     + "saves it. Its last section tells an AI how to unpack this .html into source, rebuild it, and check "
     + "it in a headless browser."],
    ["Typing the first line of a table in the raw pane froze the editor",
     "A line that starts with | is a paragraph until its separator line arrives. Also: single asterisks "
     + "with a space inside (2 * 3 * 4) are no longer italics, Bold and the other inline buttons light up "
     + "on the last line of the raw pane, and an error while editing the preview no longer leaves Enter "
     + "and Backspace dead."],
    ["Ctrl+B in the link dialog formatted the document behind it, and NOTES.HTML opened as raw tags",
     "Editor shortcuts stay off while a dialog field is focused. Upper-case .HTML files convert like "
     + "lower-case ones, and pasted or opened HTML can no longer run scripts inside the editor. The debug "
     + "log (Ctrl+Shift+L) names each line's level and lists uncaught errors, and Help now ends its user "
     + "sections with this What changed list."]
  ]
};
