/* @requires-dom */
// ============================================================================
// SCROLL SYNC MANAGER
// ============================================================================
const ScrollSyncManager = {
    enabled: true,
    isSyncing: false,
    syncTimeout: null,
    lastSyncSource: null,
    
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
    
    handleScroll(source) {
        if (!this.enabled || this.isSyncing) return;
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
    },
    
    /**
     * Check format at cursor position in preview
     */
    checkPreviewFormats() {
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            this.resetButtons();
            return;
        }

        const node = selection.anchorNode;
        if (!node || !DOM.preview.contains(node)) {
            this.resetButtons();
            return;
        }

        this.resetButtons();
        const range = selection.getRangeAt(0);
        this.markFormatsFrom(range.startContainer);
        this.markFormatsFrom(range.endContainer);
        /* After peeling an outer wrap, the selection is often the remaining
           inner element (selectNodeContents). Walking up sees italic but not
           underline/strike nested inside it. */
        const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        if (startEl && startEl.nodeType === Node.ELEMENT_NODE && DOM.preview.contains(startEl)) {
            for (const el of startEl.querySelectorAll('strong, b, em, i, u, del, s, code, h1, h2, h3, h4, h5, h6, li, blockquote, a, img')) {
                if (range.intersectsNode(el)) this.markElement(el);
            }
        }
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
            DOM.linkBtn, DOM.imageBtn, DOM.codeBtn
        ];
        
        buttons.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
    }
};
