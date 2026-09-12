/* @requires-dom */
// ============================================================================
// MODAL HANDLERS
// ============================================================================
const ModalOps = {
    _saved: null,

    saveCaret() {
        if (AppState.activePane === "preview") Doc.readPreviewSelection(DOM.preview);
        this._saved = {
            pane: AppState.activePane,
            from: Doc.selection().from,
            to: Doc.selection().to,
            editorStart: DOM.editor.selectionStart,
            editorEnd: DOM.editor.selectionEnd
        };
    },

    insertAtSaved(md) {
        const s = this._saved || { pane: AppState.activePane, from: Doc.selection().from, to: Doc.selection().to };
        if (s.pane === "editor") {
            AppState.activePane = "editor";
            const from = s.editorStart != null ? s.editorStart : DOM.editor.selectionStart;
            const to = s.editorEnd != null ? s.editorEnd : DOM.editor.selectionEnd;
            EditorOps.replaceSpan(from, to, md);
            EditorOps.updatePreviewNow();
            AppState.setModified(true);
            DOM.editor.focus();
            const end = from + md.length;
            DOM.editor.setSelectionRange(end, end);
        } else {
            AppState.activePane = "preview";
            Doc.setSelection(s.from, s.to);
            Doc.insertInlineMarkdown(md);
            syncFromDoc("preview");
            DOM.preview.focus();
        }
    },

    openLinkModal() {
        // Check if cursor is on an existing link
        const selection = window.getSelection();
        let existingText = '';
        let existingUrl = '';
        
        if (AppState.activePane === 'editor') {
            const editor = DOM.editor;
            const pos = editor.selectionStart;
            const text = editor.value;
            
            const { lineStart, lineEnd } = EditorOps.lineBounds(text, pos, pos);
            const line = text.substring(lineStart, lineEnd);
            
            // Check for link at cursor position
            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            let match;
            while ((match = linkRegex.exec(line)) !== null) {
                const linkStart = lineStart + match.index;
                const linkEnd = linkStart + match[0].length;
                if (pos >= linkStart && pos <= linkEnd) {
                    existingText = match[1];
                    existingUrl = match[2];
                    break;
                }
            }
            
            // If no existing link, use selected text
            if (!existingText && editor.selectionStart !== editor.selectionEnd) {
                existingText = text.substring(editor.selectionStart, editor.selectionEnd);
            }
        } else if (AppState.activePane === 'preview') {
            // Check for link in preview
            if (selection.rangeCount) {
                let node = selection.anchorNode;
                while (node && node !== DOM.preview) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
                        existingText = node.textContent;
                        existingUrl = node.getAttribute('href');
                        break;
                    }
                    node = node.parentNode;
                }
                
                if (!existingText) {
                    existingText = selection.toString();
                }
            }
        }
        
        this.saveCaret();
        DOM.linkText.value = existingText;
        DOM.linkUrl.value = existingUrl;
        DOM.linkModal.classList.add('active');
        DOM.linkText.focus();
    },
    
    closeLinkModal() {
        DOM.linkModal.classList.remove('active');
        DOM.linkText.value = '';
        DOM.linkUrl.value = '';
        DOM.linkText.blur();
        DOM.linkUrl.blur();
    },
    
    submitLink() {
        const text = DOM.linkText.value.trim();
        const url = DOM.linkUrl.value.trim();
        
        if (!text || !url) {
            alert('Please enter both link text and URL');
            return;
        }
        
        this.closeLinkModal();
        this.insertAtSaved("[" + text + "](" + url + ")");
    },
    
    openImageModal() {
        // Check if cursor is on an existing image
        let existingAlt = '';
        let existingUrl = '';
        
        if (AppState.activePane === 'editor') {
            const editor = DOM.editor;
            const pos = editor.selectionStart;
            const text = editor.value;
            
            const { lineStart, lineEnd } = EditorOps.lineBounds(text, pos, pos);
            const line = text.substring(lineStart, lineEnd);
            
            // Check for image at cursor position
            const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let match;
            while ((match = imgRegex.exec(line)) !== null) {
                const imgStart = lineStart + match.index;
                const imgEnd = imgStart + match[0].length;
                if (pos >= imgStart && pos <= imgEnd) {
                    existingAlt = match[1];
                    existingUrl = match[2];
                    break;
                }
            }
        } else if (AppState.activePane === 'preview') {
            const selection = window.getSelection();
            if (selection.rangeCount) {
                let node = selection.anchorNode;
                while (node && node !== DOM.preview) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
                        existingAlt = node.getAttribute('alt') || '';
                        existingUrl = node.getAttribute('src') || '';
                        break;
                    }
                    node = node.parentNode;
                }
            }
        }
        
        this.saveCaret();
        DOM.imageAlt.value = existingAlt;
        DOM.imageUrl.value = existingUrl;
        DOM.imageModal.classList.add('active');
        DOM.imageAlt.focus();
    },
    
    closeImageModal() {
        DOM.imageModal.classList.remove('active');
        DOM.imageAlt.value = '';
        DOM.imageUrl.value = '';
        DOM.imageAlt.blur();
        DOM.imageUrl.blur();
    },
    
    submitImage() {
        const alt = DOM.imageAlt.value.trim();
        const url = DOM.imageUrl.value.trim();
        
        if (!url) {
            alert('Please enter an image URL');
            return;
        }
        
        this.closeImageModal();
        this.insertAtSaved("![" + alt + "](" + url + ")");
    }
};
