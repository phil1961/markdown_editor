/* @requires-dom */
// ============================================================================
// UNDO / REDO — one stack for both panes. A snapshot is the markdown plus the
// caret in whichever pane was active. Every entry carries a label naming the
// step that produced it, so the Undo/Redo tooltips and the History panel can
// say what will happen. Typing coalesces (350 ms idle); toolbar and menu
// actions commit at once.
// ============================================================================
const History = {
    stack: [],
    index: -1,
    max: 100,
    locked: false,
    _timer: null,
    _pendingLabel: null,

    capture(label) {
        const sel = Doc.selection();
        return {
            label: label || "Edit",
            at: Date.now(),
            md: DOM.editor.value,
            from: sel.from,
            to: sel.to,
            editorFrom: DOM.editor.selectionStart,
            editorTo: DOM.editor.selectionEnd,
            pane: AppState.activePane
        };
    },

    /* A discrete step (Bold, Insert table, Paste). Flushes pending typing
       first so the typing and the step are two separate entries. */
    commit(label) {
        if (this.locked) return;
        this.flush();
        this._push(this.capture(label));
    },

    /* Typing. Coalesces into one entry until 350 ms pass without input
       or something else commits. */
    schedule(label) {
        if (this.locked) return;
        this._pendingLabel = label || "Typing";
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this._timer = null;
            this._push(this.capture(this._pendingLabel));
        }, 350);
    },

    flush() {
        if (!this._timer) return;
        clearTimeout(this._timer);
        this._timer = null;
        this._push(this.capture(this._pendingLabel));
    },

    _push(cap) {
        const top = this.stack[this.index];
        if (top && top.md === cap.md) {
            top.from = cap.from;
            top.to = cap.to;
            top.editorFrom = cap.editorFrom;
            top.editorTo = cap.editorTo;
            top.pane = cap.pane;
            this.render();
            return;
        }
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(cap);
        if (this.stack.length > this.max) this.stack.shift();
        this.index = this.stack.length - 1;
        this.render();
    },

    reset(label) {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        this.stack = [];
        this.index = -1;
        this._push(this.capture(label || "Start"));
    },

    apply(cap) {
        this.locked = true;
        try {
            DOM.editor.value = cap.md;
            Doc.load(cap.md);
            Doc.setSelection(cap.from, cap.to);
            DOM.preview.innerHTML = Doc.previewHTML();
            AppState.activePane = cap.pane || "editor";
            if (cap.pane === "preview") {
                DOM.preview.focus();
                Doc.restorePreviewSelection(DOM.preview);
                IconHighlighter.checkPreviewFormats();
            } else {
                DOM.editor.focus();
                const n = DOM.editor.value.length;
                const a = Math.max(0, Math.min(n, cap.editorFrom || 0));
                const b = Math.max(0, Math.min(n, cap.editorTo || a));
                DOM.editor.setSelectionRange(a, b);
                IconHighlighter.checkEditorFormats();
            }
            EditorOps.updateStatus();
            AppState.setModified(true);
        } finally {
            this.locked = false;
        }
        this.render();
    },

    undo() {
        this.flush();
        if (this.index <= 0) return false;
        this.index--;
        this.apply(this.stack[this.index]);
        Logger.info("History", "Undo -> #" + this.index + " " + this.stack[this.index].label);
        return true;
    },

    redo() {
        this.flush();
        if (this.index >= this.stack.length - 1) return false;
        this.index++;
        this.apply(this.stack[this.index]);
        Logger.info("History", "Redo -> #" + this.index + " " + this.stack[this.index].label);
        return true;
    },

    goTo(i) {
        this.flush();
        if (i < 0 || i >= this.stack.length || i === this.index) return false;
        this.index = i;
        this.apply(this.stack[i]);
        Logger.info("History", "Jump -> #" + i + " " + this.stack[i].label);
        return true;
    },

    canUndo() { return this.index > 0; },
    canRedo() { return this.index < this.stack.length - 1; },

    /* ---- visibility ------------------------------------------------------ */

    /* What changed between entry i-1 and entry i: the text removed and the
       text added, found by stripping the common prefix and suffix. */
    diffAt(i) {
        const b = this.stack[i] ? this.stack[i].md : "";
        const a = i > 0 && this.stack[i - 1] ? this.stack[i - 1].md : "";
        let p = 0;
        const maxP = Math.min(a.length, b.length);
        while (p < maxP && a[p] === b[p]) p++;
        let s = 0;
        while (s < maxP - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
        return {
            removed: a.slice(p, a.length - s),
            added: b.slice(p, b.length - s),
            at: p,
            delta: b.length - a.length
        };
    },

    snippet(s, n) {
        n = n || 36;
        s = String(s).replace(/\n/g, "⏎");
        return s.length > n ? s.slice(0, n - 1) + "…" : s;
    },

    summary() {
        const n = this.stack.length;
        return {
            entries: n,
            undo: Math.max(0, this.index),
            redo: Math.max(0, n - 1 - this.index),
            index: this.index,
            current: this.stack[this.index] || null,
            next: this.stack[this.index + 1] || null
        };
    },

    updateButtons() {
        const s = this.summary();
        if (DOM.undoBtn) {
            DOM.undoBtn.disabled = !this.canUndo();
            DOM.undoBtn.title = (this.canUndo() ? "Undo: " + s.current.label : "Nothing to undo") + " (Ctrl+Z)";
        }
        if (DOM.redoBtn) {
            DOM.redoBtn.disabled = !this.canRedo();
            DOM.redoBtn.title = (this.canRedo() ? "Redo: " + s.next.label : "Nothing to redo") + " (Ctrl+Y)";
        }
        if (DOM.historyBtn) {
            DOM.historyBtn.title = "History: " + s.undo + " to undo, " + s.redo + " to redo (Ctrl+Shift+H)";
        }
    },

    isPanelOpen() {
        return !!(DOM.historyPanel && DOM.historyPanel.classList.contains("visible"));
    },

    togglePanel(force) {
        if (!DOM.historyPanel) return;
        const open = force === undefined ? !this.isPanelOpen() : !!force;
        DOM.historyPanel.classList.toggle("visible", open);
        if (DOM.historyBtn) DOM.historyBtn.classList.toggle("active", open);
        if (open) this.render();
    },

    render() {
        this.updateButtons();
        if (!this.isPanelOpen() || !DOM.historyList) return;
        const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const time = t => new Date(t).toLocaleTimeString("en-US", { hour12: false });
        const s = this.summary();
        if (DOM.historySummary) {
            DOM.historySummary.textContent = s.entries + " snapshot" + (s.entries === 1 ? "" : "s")
                + " · " + s.undo + " to undo · " + s.redo + " to redo";
        }
        let html = "";
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const e = this.stack[i];
            const d = this.diffAt(i);
            const state = i === this.index ? "current" : (i < this.index ? "undo" : "redo");
            let change = "";
            if (i > 0) {
                if (d.removed) change += "<span class=\"hist-del\">−" + esc(this.snippet(d.removed)) + "</span>";
                if (d.added) change += "<span class=\"hist-add\">+" + esc(this.snippet(d.added)) + "</span>";
                if (!d.removed && !d.added) change = "<span class=\"hist-nil\">no text change</span>";
            } else {
                change = "<span class=\"hist-nil\">" + e.md.length + " chars</span>";
            }
            const hint = state === "current" ? "Current state"
                : (state === "undo" ? "Click to undo back to here" : "Click to redo forward to here");
            html += "<div class=\"hist-entry " + state + "\" data-index=\"" + i + "\" title=\"" + hint + "\">"
                + "<div class=\"hist-head\"><span class=\"hist-idx\">#" + i + "</span>"
                + "<span class=\"hist-label\">" + esc(e.label) + "</span>"
                + "<span class=\"hist-meta\">" + (e.pane === "preview" ? "preview" : "raw")
                + " · " + (d.delta >= 0 ? "+" : "") + d.delta + " · " + time(e.at) + "</span></div>"
                + "<div class=\"hist-change\">" + change + "</div>"
                + "</div>";
        }
        DOM.historyList.innerHTML = html;
        const cur = DOM.historyList.querySelector(".hist-entry.current");
        if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
    }
};
