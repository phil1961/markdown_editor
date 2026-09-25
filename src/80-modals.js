/* @requires-dom */
// ============================================================================
// DIALOG — in-page confirm/alert. Never call window.confirm()/alert(): a
// sandboxed iframe without allow-modals ignores them (confirm returns false
// with nothing shown), so a host embedding the editor loses every answer.
// ============================================================================
const Dialog = {
    _resolve: null,
    _return: null,

    /* Resolves true for OK, false for Cancel / Escape / backdrop. */
    ask(message, opts) {
        opts = opts || {};
        if (this._resolve) this.close(false);
        this._return = document.activeElement;
        DOM.dialogTitle.textContent = opts.title || 'Markdown Editor';
        DOM.dialogMessage.textContent = message;
        DOM.dialogOk.textContent = opts.ok || 'OK';
        DOM.dialogCancel.textContent = opts.cancel || 'Cancel';
        DOM.dialogCancel.hidden = !!opts.notice;
        DOM.dialogModal.classList.add('active');
        (opts.notice ? DOM.dialogOk : DOM.dialogCancel).focus();
        return new Promise(res => { this._resolve = res; });
    },

    tell(message, title) {
        return this.ask(message, { title, notice: true }).then(() => undefined);
    },

    isOpen() {
        return !!this._resolve;
    },

    close(result) {
        if (!this._resolve) return;
        const res = this._resolve;
        const back = this._return;
        this._resolve = null;
        this._return = null;
        DOM.dialogModal.classList.remove('active');
        if (back && back.focus && document.contains(back) && back !== document.body) back.focus();
        res(!!result);
    }
};

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

    insertAtSaved(md, label) {
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
        History.commit(label || "Insert");
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
            Dialog.tell('Please enter both link text and URL.', 'Insert Link');
            return;
        }
        
        this.closeLinkModal();
        this.insertAtSaved("[" + text + "](" + url + ")", "Insert link");
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
            Dialog.tell('Please enter an image URL.', 'Insert Image');
            return;
        }
        
        this.closeImageModal();
        this.insertAtSaved("![" + alt + "](" + url + ")", "Insert image");
    }
};

// ============================================================================
// HELP — HELP_MD (src/help.md, embedded by build.js) rendered by Doc.html in a
// panel over the editor. It never touches the document. Download saves the
// same Markdown: the file an AI needs next to markdown-editor.html.
// ============================================================================
const HelpOps = {
    FILE_NAME: 'markdown-editor-help.md',
    _rendered: false,
    _return: null,

    isOpen() {
        return !!DOM.helpPanel && DOM.helpPanel.classList.contains('active');
    },

    /* BUILD.corrections as a "What changed" section, newest first, placed
       before the AI section so that one stays last as the guide promises.
       The changelog that ships inside the file is then readable inside the
       editor instead of being dead payload. */
    helpMarkdown() {
        const rows = (BUILD.corrections || []).slice().reverse()
            .map(([was, now]) => '- **' + was + '.** ' + now);
        const section = '## What changed\n\nNewest first. Version ' + BUILD.version + ', ' + BUILD.released + '.\n\n'
            + rows.join('\n') + '\n\n';
        const cut = HELP_MD.indexOf('\n## For an AI');
        return cut < 0 ? HELP_MD + '\n\n' + section : HELP_MD.slice(0, cut + 1) + section + HELP_MD.slice(cut + 1);
    },

    render() {
        DOM.helpBody.innerHTML = Doc.html(Doc.parse(this.helpMarkdown()));
        /* Export HTML carries a title element; here the shared ::before draws it. */
        DOM.helpBody.querySelectorAll('.markdown-alert-title').forEach(el => el.remove());
        DOM.helpBody.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
        DOM.helpToc.innerHTML = '';
        DOM.helpBody.querySelectorAll('h2').forEach((h, i) => {
            h.id = 'help-section-' + i;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'help-toc-item';
            item.textContent = h.textContent;
            item.addEventListener('click', () => h.scrollIntoView({ block: 'start' }));
            DOM.helpToc.appendChild(item);
        });
        DOM.helpVersion.textContent = 'v' + BUILD.version;
        this._rendered = true;
    },

    open() {
        if (!this._rendered) this.render();
        if (this.isOpen()) return;
        /* Clicking Help focuses the button; closing should go back to writing. */
        const active = document.activeElement;
        this._return = active === DOM.editor || active === DOM.preview
            ? active
            : (AppState.activePane === 'preview' ? DOM.preview : DOM.editor);
        DOM.helpPanel.classList.add('active');
        DOM.helpClose.focus();
    },

    close() {
        if (!this.isOpen()) return;
        DOM.helpPanel.classList.remove('active');
        const back = this._return;
        this._return = null;
        if (back && back.focus && document.contains(back) && back !== document.body) back.focus();
    },

    toggle() {
        if (this.isOpen()) this.close(); else this.open();
    },

    download() {
        const blob = new Blob([HELP_MD], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.FILE_NAME;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        DOM.statusLeft.textContent = 'Downloaded: ' + this.FILE_NAME;
        Logger.info('Help', 'Downloaded ' + this.FILE_NAME);
    }
};
