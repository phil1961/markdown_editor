/* @requires-dom */
// ============================================================================
// MODAL HANDLERS
// ============================================================================
const ModalOps = {
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
        
        DOM.linkText.value = existingText;
        DOM.linkUrl.value = existingUrl;
        DOM.linkModal.classList.add('active');
        DOM.linkText.focus();
    },
    
    closeLinkModal() {
        DOM.linkModal.classList.remove('active');
        DOM.linkText.value = '';
        DOM.linkUrl.value = '';
    },
    
    submitLink() {
        const text = DOM.linkText.value.trim();
        const url = DOM.linkUrl.value.trim();
        
        if (!text || !url) {
            alert('Please enter both link text and URL');
            return;
        }
        
        if (AppState.activePane === 'editor') {
            EditorOps.insertLink(text, url);
        } else {
            // Insert in preview
            const a = document.createElement('a');
            a.href = url;
            a.textContent = text;
            
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(a);
            }
            PreviewOps.syncToEditor();
        }
        
        this.closeLinkModal();
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
        
        DOM.imageAlt.value = existingAlt;
        DOM.imageUrl.value = existingUrl;
        DOM.imageModal.classList.add('active');
        DOM.imageAlt.focus();
    },
    
    closeImageModal() {
        DOM.imageModal.classList.remove('active');
        DOM.imageAlt.value = '';
        DOM.imageUrl.value = '';
    },
    
    submitImage() {
        const alt = DOM.imageAlt.value.trim();
        const url = DOM.imageUrl.value.trim();
        
        if (!url) {
            alert('Please enter an image URL');
            return;
        }
        
        if (AppState.activePane === 'editor') {
            EditorOps.insertImage(alt, url);
        } else {
            // Insert in preview
            const img = document.createElement('img');
            img.src = url;
            img.alt = alt;
            
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
            }
            PreviewOps.syncToEditor();
        }
        
        this.closeImageModal();
    }
};
