/* @requires-dom */
// ============================================================================
// SCROLL SYNC MANAGER
// ============================================================================
const ScrollSyncManager = {
    enabled: true,
    isSyncing: false,
    syncTimeout: null,
    lastSyncSource: null,
    heldUntil: 0,

    init(editor, previewContainer, trackBtn) {
        // editor = the textarea element (scrolls itself)
        // previewContainer = the container div (scrolls the preview content)
        this.editorEl = editor;
        this.previewEl = previewContainer;
        this.trackBtn = trackBtn;
        
        // Set up scroll listeners on the actual scrolling elements
        this.editorEl.addEventListener('scroll', () => this.handleScroll('editor'));
        this.previewEl.addEventListener('scroll', () => this.handleScroll('preview'));
        
        // Set up click listeners for alignment
        this.editorEl.addEventListener('click', () => this.handleClick('editor'));
        this.previewEl.addEventListener('click', () => this.handleClick('preview'));
        
        // Track button toggle
        this.trackBtn.addEventListener('click', () => this.toggle());
        
        Logger.info('ScrollSync', 'Initialized scroll synchronization');
    },
    
    toggle() {
        this.enabled = !this.enabled;
        this.trackBtn.classList.toggle('active', this.enabled);
        Logger.info('ScrollSync', `Scroll sync ${this.enabled ? 'enabled' : 'disabled'}`);
    },
    
    /* A programmatic scroll (Find in other pane) must not be mirrored, and a
       sync already queued must not undo it. */
    hold(ms) {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = null;
        this.lastSyncSource = null;
        this.heldUntil = Date.now() + ms;
    },

    handleScroll(source) {
        if (!this.enabled || this.isSyncing || Date.now() < this.heldUntil) return;
        if (this.lastSyncSource && this.lastSyncSource !== source) return;
        
        this.lastSyncSource = source;
        
        // Debounce
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        
        this.syncTimeout = setTimeout(() => {
            this.syncScroll(source);
            this.lastSyncSource = null;
        }, 10);
    },
    
    syncScroll(source) {
        this.isSyncing = true;
        
        const sourceEl = source === 'editor' ? this.editorEl : this.previewEl;
        const targetEl = source === 'editor' ? this.previewEl : this.editorEl;
        
        // Calculate scroll percentage
        const maxScroll = sourceEl.scrollHeight - sourceEl.clientHeight;
        if (maxScroll <= 0) {
            this.isSyncing = false;
            return;
        }
        
        const scrollPercent = sourceEl.scrollTop / maxScroll;
        
        // Apply to target
        const targetMaxScroll = targetEl.scrollHeight - targetEl.clientHeight;
        const targetScrollTop = scrollPercent * targetMaxScroll;
        targetEl.scrollTop = targetScrollTop;
        
        // Release sync lock after a short delay
        setTimeout(() => {
            this.isSyncing = false;
        }, 50);
    },
    
    handleClick(source) {
        if (!this.enabled) return;
        
        // Sync scroll position on click
        this.syncScroll(source);
    }
};

// ============================================================================
// VIEW MODE MANAGER
// ============================================================================
const ViewModeManager = {
    setMode(mode) {
        AppState.viewMode = mode;
        
        // Remove all view mode classes
        DOM.mainContainer.classList.remove('editor-only', 'preview-only');
        
        // Apply the new mode
        if (mode === 'editor') {
            DOM.mainContainer.classList.add('editor-only');
        } else if (mode === 'preview') {
            DOM.mainContainer.classList.add('preview-only');
        }
        
        // Update button states
        DOM.viewEditorBtn.classList.toggle('active', mode === 'editor');
        DOM.viewBothBtn.classList.toggle('active', mode === 'both');
        DOM.viewPreviewBtn.classList.toggle('active', mode === 'preview');
        
        // Focus the appropriate pane
        if (mode === 'editor') {
            DOM.editor.focus();
            AppState.activePane = 'editor';
        } else if (mode === 'preview') {
            DOM.preview.focus();
            AppState.activePane = 'preview';
        }
        
        Logger.info('ViewMode', `Switched to ${mode} view`);
    }
};

// ============================================================================
// PANE SPLITTER — drag the bar between raw and preview to change their widths.
// The editor pane's flex-basis is --split (a percent of the container's
// content box); the preview pane takes the rest. Persisted in localStorage.
// ============================================================================
const Splitter = {
    MIN_PCT: 18,
    MAX_PCT: 82,
    STORE: "md-editor-split",
    _drag: null,

    init() {
        const el = DOM.splitter;
        if (!el) return;
        try {
            const saved = localStorage.getItem(this.STORE);
            if (saved && /%$/.test(saved)) this.set(parseFloat(saved));
        } catch (err) { /* private mode */ }
        el.addEventListener("pointerdown", e => this.start(e));
        el.addEventListener("pointermove", e => this.move(e));
        el.addEventListener("pointerup", e => this.stop(e));
        el.addEventListener("pointercancel", e => this.stop(e));
        el.addEventListener("dblclick", () => this.reset());
        el.addEventListener("keydown", e => this.onKey(e));
        this.updateAria();
    },

    get() {
        const v = parseFloat(DOM.mainContainer.style.getPropertyValue("--split"));
        return isFinite(v) ? v : 50;
    },

    set(pct) {
        const n = Number(pct);
        if (!isFinite(n)) return;
        const clamped = Math.max(this.MIN_PCT, Math.min(this.MAX_PCT, n));
        DOM.mainContainer.style.setProperty("--split", clamped.toFixed(1) + "%");
        this.updateAria();
    },

    reset() {
        this.set(50);
        this.persist();
    },

    persist() {
        try {
            localStorage.setItem(this.STORE, this.get().toFixed(1) + "%");
        } catch (err) { /* private mode */ }
    },

    updateAria() {
        const el = DOM.splitter;
        if (!el) return;
        el.setAttribute("aria-valuemin", String(this.MIN_PCT));
        el.setAttribute("aria-valuemax", String(this.MAX_PCT));
        el.setAttribute("aria-valuenow", String(Math.round(this.get())));
    },

    /* Percent of the container's content box that puts the centre of the
       bar at clientX. The editor's flex-basis is calc(--split - 8px) and the
       bar's footprint is 16px, so the bar's centre sits at exactly --split of
       the content box. flex-basis percentages resolve against that box, so
       this keeps the bar under the pointer instead of drifting by the
       padding. */
    pctAt(clientX) {
        const root = DOM.mainContainer;
        const rect = root.getBoundingClientRect();
        const cs = getComputedStyle(root);
        const padL = parseFloat(cs.paddingLeft) || 0;
        const padR = parseFloat(cs.paddingRight) || 0;
        const content = rect.width - padL - padR;
        if (content < 320) return null;
        return ((clientX - rect.left - padL) / content) * 100;
    },

    start(e) {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        if (AppState.viewMode !== "both") return;
        e.preventDefault();
        this._drag = { id: e.pointerId };
        try { DOM.splitter.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
        DOM.mainContainer.classList.add("resizing");
        this.move(e);
    },

    move(e) {
        if (!this._drag || e.pointerId !== this._drag.id) return;
        const pct = this.pctAt(e.clientX);
        if (pct !== null) this.set(pct);
    },

    stop(e) {
        if (!this._drag || e.pointerId !== this._drag.id) return;
        this._drag = null;
        try { DOM.splitter.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
        DOM.mainContainer.classList.remove("resizing");
        this.persist();
    },

    onKey(e) {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === "ArrowLeft") this.set(this.get() - step);
        else if (e.key === "ArrowRight") this.set(this.get() + step);
        else if (e.key === "Home") this.set(this.MIN_PCT);
        else if (e.key === "End") this.set(this.MAX_PCT);
        else if (e.key === "Enter") this.reset();
        else return;
        e.preventDefault();
        this.persist();
    }
};

// ============================================================================
// ICON HIGHLIGHTING
// ============================================================================
const IconHighlighter = {
    /**
     * Check format at cursor position in editor
     */
    checkEditorFormats() {
        const editor = DOM.editor;
        const pos = editor.selectionStart;
        const text = editor.value;
        
        const { lineStart, lineEnd } = EditorOps.lineBounds(text, pos, pos);
        const line = text.substring(lineStart, lineEnd);
        
        // Get text around cursor for inline formats
        const before = text.substring(0, pos);
        const after = text.substring(pos);
        
        // Reset all buttons
        this.resetButtons();
        
        // Check inline formats
        if (this.isWrappedBy(before, after, '**') || this.isWrappedBy(before, after, '__')) {
            DOM.boldBtn.classList.add('active');
        }
        if (this.isWrappedBy(before, after, '*') || this.isWrappedBy(before, after, '_')) {
            if (!this.isWrappedBy(before, after, '**')) {
                DOM.italicBtn.classList.add('active');
            }
        }
        if (this.isWrappedBy(before, after, '++')) {
            DOM.underlineBtn.classList.add('active');
        }
        if (this.isWrappedBy(before, after, '~~')) {
            DOM.strikeBtn.classList.add('active');
        }
        if (this.isWrappedBy(before, after, '`')) {
            DOM.codeBtn.classList.add('active');
        }
        
        // Check block formats (most specific first to avoid overlap)
        if (/^###### /.test(line)) DOM.h6Btn.classList.add('active');
        else if (/^##### /.test(line)) DOM.h5Btn.classList.add('active');
        else if (/^#### /.test(line)) DOM.h4Btn.classList.add('active');
        else if (/^### /.test(line)) DOM.h3Btn.classList.add('active');
        else if (/^## /.test(line)) DOM.h2Btn.classList.add('active');
        else if (/^# /.test(line)) DOM.h1Btn.classList.add('active');
        if (/^[-*+] /.test(line)) DOM.bulletBtn.classList.add('active');
        if (/^\d+\. /.test(line)) DOM.numberBtn.classList.add('active');
        if (/^>/.test(line)) DOM.quoteIncreaseBtn.classList.add('active');
        
        // Check for links and images
        if (/\[([^\]]+)\]\(([^)]+)\)/.test(line)) {
            // Check if cursor is within a link
            const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                const linkStart = lineStart + line.indexOf(linkMatch[0]);
                const linkEnd = linkStart + linkMatch[0].length;
                if (pos >= linkStart && pos <= linkEnd) {
                    DOM.linkBtn.classList.add('active');
                }
            }
        }
        if (/!\[([^\]]*)\]\(([^)]+)\)/.test(line)) {
            const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imgMatch) {
                const imgStart = lineStart + line.indexOf(imgMatch[0]);
                const imgEnd = imgStart + imgMatch[0].length;
                if (pos >= imgStart && pos <= imgEnd) {
                    DOM.imageBtn.classList.add('active');
                }
            }
        }

        const fence = RawBlocks.fenceAt(text, pos);
        const quote = RawBlocks.alertAt(text, pos);
        BlockStyleOps.reflect(fence ? fence.lang : null, quote ? quote.kind : null);
    },
    
    /**
     * Check format at cursor position in preview
     */
    checkPreviewFormats() {
        if (!DOM.preview.contains(window.getSelection().anchorNode)
            && window.getSelection().anchorNode !== DOM.preview) {
            /* still update from Doc if preview is the active pane */
        }
        Doc.readPreviewSelection(DOM.preview);
        this.resetButtons();
        const marks = Doc.marksAt();
        if (marks.has("bold")) DOM.boldBtn.classList.add("active");
        if (marks.has("italic")) DOM.italicBtn.classList.add("active");
        if (marks.has("underline")) DOM.underlineBtn.classList.add("active");
        if (marks.has("strike")) DOM.strikeBtn.classList.add("active");
        if (marks.has("code")) DOM.codeBtn.classList.add("active");
        const bt = Doc.blockTypeAt();
        if (bt === "h1") DOM.h1Btn.classList.add("active");
        else if (bt === "h2") DOM.h2Btn.classList.add("active");
        else if (bt === "h3") DOM.h3Btn.classList.add("active");
        else if (bt === "h4") DOM.h4Btn.classList.add("active");
        else if (bt === "h5") DOM.h5Btn.classList.add("active");
        else if (bt === "h6") DOM.h6Btn.classList.add("active");
        else if (bt === "ul") DOM.bulletBtn.classList.add("active");
        else if (bt === "ol") DOM.numberBtn.classList.add("active");
        else if (bt === "quote") DOM.quoteIncreaseBtn.classList.add("active");
        else if (bt === "hr") DOM.hrBtn.classList.add("active");
        this.setTableEditEnabled(bt === "table");
        BlockStyleOps.reflect(Doc.codeLangAt(), Doc.alertAt());
    },

    markFormatsFrom(node) {
        while (node && node !== DOM.preview) {
            if (node.nodeType === Node.ELEMENT_NODE) this.markElement(node);
            node = node.parentNode;
        }
    },

    markElement(el) {
        switch (el.tagName.toLowerCase()) {
            case 'strong':
            case 'b':
                DOM.boldBtn.classList.add('active');
                break;
            case 'em':
            case 'i':
                DOM.italicBtn.classList.add('active');
                break;
            case 'u':
                DOM.underlineBtn.classList.add('active');
                break;
            case 'del':
            case 's':
                DOM.strikeBtn.classList.add('active');
                break;
            case 'code':
                DOM.codeBtn.classList.add('active');
                break;
            case 'h1':
                DOM.h1Btn.classList.add('active');
                break;
            case 'h2':
                DOM.h2Btn.classList.add('active');
                break;
            case 'h3':
                DOM.h3Btn.classList.add('active');
                break;
            case 'h4':
                DOM.h4Btn.classList.add('active');
                break;
            case 'h5':
                DOM.h5Btn.classList.add('active');
                break;
            case 'h6':
                DOM.h6Btn.classList.add('active');
                break;
            case 'li': {
                const parent = el.parentElement;
                if (parent && parent.tagName === 'UL') DOM.bulletBtn.classList.add('active');
                if (parent && parent.tagName === 'OL') DOM.numberBtn.classList.add('active');
                break;
            }
            case 'blockquote':
                DOM.quoteIncreaseBtn.classList.add('active');
                break;
            case 'a':
                DOM.linkBtn.classList.add('active');
                break;
            case 'img':
                DOM.imageBtn.classList.add('active');
                break;
        }
    },
    
    /**
     * Check if text is wrapped by a marker
     */
    isWrappedBy(before, after, marker) {
        const len = marker.length;
        // Check if marker appears before cursor and after cursor
        const beforeHas = before.lastIndexOf(marker) > before.lastIndexOf('\n');
        const afterHas = after.indexOf(marker) !== -1 && after.indexOf(marker) < after.indexOf('\n');
        return beforeHas && afterHas;
    },
    
    /**
     * Reset all button states
     */
    resetButtons() {
        const buttons = [
            DOM.boldBtn, DOM.italicBtn, DOM.underlineBtn, DOM.strikeBtn,
            DOM.h1Btn, DOM.h2Btn, DOM.h3Btn, DOM.h4Btn, DOM.h5Btn, DOM.h6Btn,
            DOM.bulletBtn, DOM.numberBtn, DOM.quoteIncreaseBtn,
            DOM.linkBtn, DOM.imageBtn, DOM.codeBtn, DOM.hrBtn
        ];
        
        buttons.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        this.setTableEditEnabled(Doc.blockTypeAt() === "table");
    },

    setTableEditEnabled(on) {
        [
            DOM.tableRowAboveBtn, DOM.tableRowBelowBtn, DOM.tableRowDelBtn,
            DOM.tableColLeftBtn, DOM.tableColRightBtn, DOM.tableColDelBtn
        ].forEach(btn => { if (btn) btn.disabled = !on; });
    }
};

// ============================================================================
// FIND IN OTHER PANE — the button beside Track. Select a word (or leave the
// caret in one) in either pane; the same occurrence is selected in the other
// pane and scrolled into view. The offset mapping is Locate (18-locate.js).
// ============================================================================
const PaneLocator = {
    init() {
        if (DOM.locateBtn) DOM.locateBtn.addEventListener('click', () => this.jump());
    },

    jump() {
        if (AppState.viewMode !== 'both') ViewModeManager.setMode('both');
        /* Keep the source pane where it is; scroll only the pane we land in. */
        ScrollSyncManager.hold(250);
        return AppState.activePane === 'preview' ? this.previewToEditor() : this.editorToPreview();
    },

    editorToPreview() {
        const ed = DOM.editor;
        EditorOps.updatePreviewNow();
        const hit = Locate.rawToDoc(ed.value, ed.selectionStart, ed.selectionEnd);
        if (!hit) return this.miss('raw');
        DOM.preview.focus({ preventScroll: true });
        AppState.activePane = 'preview';
        Doc.setSelection(hit.from, hit.to);
        Doc.restorePreviewSelection(DOM.preview);
        this.scrollPreviewToSelection();
        IconHighlighter.checkPreviewFormats();
        return this.found(window.getSelection().toString(), 'preview');
    },

    previewToEditor() {
        Doc.readPreviewSelection(DOM.preview);
        const s = Doc.selection();
        const ed = DOM.editor;
        const hit = Locate.docToRaw(ed.value, s.from, s.to);
        if (!hit) return this.miss('preview');
        ed.focus({ preventScroll: true });
        ed.setSelectionRange(hit.from, hit.to);
        AppState.activePane = 'editor';
        this.scrollEditorTo(hit.from);
        IconHighlighter.checkEditorFormats();
        return this.found(ed.value.slice(hit.from, hit.to), 'raw');
    },

    scrollPreviewToSelection() {
        const s = window.getSelection();
        if (!s.rangeCount) return;
        const r = s.getRangeAt(0).getBoundingClientRect();
        if (!r.width && !r.height) return;
        const box = DOM.previewContainer.getBoundingClientRect();
        DOM.previewContainer.scrollTop += r.top - box.top - box.height / 3;
    },

    /* A textarea has no range rects. Measure the offset in a hidden mirror that
       wraps like the textarea, then put that line a third of the way down. */
    scrollEditorTo(pos) {
        const ed = DOM.editor;
        const cs = getComputedStyle(ed);
        const mirror = document.createElement('div');
        ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize',
         'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'wordBreak'].forEach(p => { mirror.style[p] = cs[p]; });
        Object.assign(mirror.style, {
            position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px',
            boxSizing: 'border-box', width: ed.clientWidth + 'px',
            whiteSpace: 'pre-wrap', overflowWrap: 'break-word'
        });
        mirror.textContent = ed.value.slice(0, pos);
        const mark = document.createElement('span');
        mark.textContent = '\u200b';
        mirror.appendChild(mark);
        document.body.appendChild(mirror);
        const y = mark.offsetTop;
        document.body.removeChild(mirror);
        ed.scrollTop = Math.max(0, y - ed.clientHeight / 3);
    },

    found(text, pane) {
        DOM.statusLeft.textContent = 'Found "' + text + '" in the ' + pane + ' pane';
        Logger.info('Locate', 'Selected "' + text + '" in the ' + pane + ' pane');
        return true;
    },

    miss(pane) {
        DOM.statusLeft.textContent = 'Could not find that in the other pane. Select a word in the ' + pane + ' pane and try again.';
        return false;
    }
};
