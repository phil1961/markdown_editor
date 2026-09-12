/* @requires-dom */
// ============================================================================
// PREVIEW — contenteditable is an input surface. The document is Doc.
// ============================================================================
const PreviewOps = {
    _opLock: false,

    init() {
        DOM.preview.addEventListener("beforeinput", e => this.onBeforeInput(e));
        DOM.preview.addEventListener("keydown", e => this.onKeyDown(e));
        DOM.preview.addEventListener("paste", e => this.onPaste(e));
    },

    runOp(op) {
        if (this._opLock) return;
        this._opLock = true;
        Doc.readPreviewSelection(DOM.preview);
        if (op === "split") Doc.splitBlock();
        else if (op === "back") Doc.deleteBackward();
        else if (op === "fwd") Doc.deleteForward();
        syncFromDoc("preview");
        queueMicrotask(() => { this._opLock = false; });
    },

    onKeyDown(e) {
        if (AppState.activePane !== "preview") return;
        if (e.isComposing || e.keyCode === 229) return;
        const keys = { Enter: "split", Backspace: "back", Delete: "fwd" };
        const op = keys[e.key];
        if (!op) return;
        e.preventDefault();
        this.runOp(op);
    },

    onBeforeInput(e) {
        if (AppState.activePane !== "preview") return;
        const t = e.inputType || "";
        if (t === "insertCompositionText") return;
        e.preventDefault();
        if (t === "insertText" || t === "insertReplacementText") {
            Doc.readPreviewSelection(DOM.preview);
            Doc.insertText(e.data || "");
            syncFromDoc("preview");
        } else if (t === "insertParagraph" || t === "insertLineBreak") {
            this.runOp("split");
        } else if (t === "deleteContentBackward" || t === "deleteByCut") {
            this.runOp("back");
        } else if (t === "deleteContentForward") {
            this.runOp("fwd");
        }
    },

    onPaste(e) {
        if (AppState.activePane !== "preview") return;
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
        Doc.readPreviewSelection(DOM.preview);
        Doc.insertText(text);
        syncFromDoc("preview");
    },

    applyFormat(format) {
        Doc.readPreviewSelection(DOM.preview);
        applyDocFormat(format);
        syncFromDoc("preview");
    }
};

function applyDocFormat(format) {
    const inline = { bold: "bold", italic: "italic", underline: "underline", strike: "strike", code: "code" };
    if (inline[format]) Doc.toggleMark(inline[format]);
    else if (/^h[1-6]$/.test(format)) Doc.toggleBlock(format);
    else if (format === "bullet") Doc.toggleBlock("ul");
    else if (format === "number") Doc.toggleBlock("ol");
    else if (format === "quoteIncrease") Doc.toggleBlock("quote");
    else if (format === "quoteDecrease") Doc.toggleBlock("p");
    else if (format === "hr") {
        const md = Doc.toMarkdown();
        Doc.load(md + (md && !md.endsWith("\n") ? "\n" : "") + "\n---\n");
        const n = Doc.totalLen();
        Doc.setSelection(n, n);
    } else if (format === "codeBlock") {
        Doc.toggleBlock("pre");
    }
}

function syncFromDoc(focus) {
    DOM.editor.value = Doc.toMarkdown();
    DOM.preview.innerHTML = Doc.previewHTML();
    if (focus === "preview") Doc.restorePreviewSelection(DOM.preview);
    EditorOps.updateStatus();
    AppState.setModified(true);
    if (focus === "preview") IconHighlighter.checkPreviewFormats();
    else IconHighlighter.checkEditorFormats();
}
