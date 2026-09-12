/* @requires-dom */
// ============================================================================
// TABLE OPERATIONS
// ============================================================================
const TableOps = {
    openModal() {
        ModalOps.saveCaret();
        this.updatePreview();
        DOM.tableModal.classList.add('active');
        DOM.tableRows.focus();
    },
    
    closeModal() {
        DOM.tableModal.classList.remove('active');
        DOM.tableRows.value = '3';
        DOM.tableCols.value = '3';
    },
    
    updatePreview() {
        const rows = parseInt(DOM.tableRows.value) || 3;
        const cols = parseInt(DOM.tableCols.value) || 3;
        
        let html = '<table><thead><tr>';
        for (let c = 0; c < cols; c++) {
            html += `<th>Header ${c + 1}</th>`;
        }
        html += '</tr></thead><tbody>';
        
        for (let r = 0; r < rows - 1; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += `<td>Cell ${r + 1}-${c + 1}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        
        DOM.tablePreview.innerHTML = html;
    },
    
    generateMarkdown(rows, cols) {
        let md = '';
        
        // Header row
        md += '|';
        for (let c = 0; c < cols; c++) {
            md += ` Header ${c + 1} |`;
        }
        md += '\n';
        
        // Separator row
        md += '|';
        for (let c = 0; c < cols; c++) {
            md += ' --- |';
        }
        md += '\n';
        
        // Data rows
        for (let r = 0; r < rows - 1; r++) {
            md += '|';
            for (let c = 0; c < cols; c++) {
                md += ` Cell ${r + 1}-${c + 1} |`;
            }
            md += '\n';
        }
        
        return md;
    },
    
    insert() {
        const rows = parseInt(DOM.tableRows.value) || 3;
        const cols = parseInt(DOM.tableCols.value) || 3;
        
        const tableMd = this.generateMarkdown(rows, cols).trim();
        this.closeModal();
        const s = ModalOps._saved;
        if (s && s.pane === "preview") {
            AppState.activePane = "preview";
            Doc.setSelection(s.from, s.to);
            Doc.paste(tableMd);
            syncFromDoc("preview");
            DOM.preview.focus();
        } else {
            const editor = DOM.editor;
            const start = s && s.editorStart != null ? s.editorStart : editor.selectionStart;
            const end = s && s.editorEnd != null ? s.editorEnd : editor.selectionEnd;
            const content = editor.value;
            let prefix = "";
            let suffix = "\n";
            if (start > 0 && content[start - 1] !== "\n") prefix = "\n\n";
            else if (start > 1 && content[start - 2] !== "\n") prefix = "\n";
            EditorOps.replaceSpan(start, end, prefix + tableMd + suffix);
            EditorOps.updatePreviewNow();
            AppState.setModified(true);
            DOM.editor.focus();
        }
        Logger.info("Table", "Inserted " + rows + "x" + cols + " table");
    },

    apply(op) {
        if (AppState.activePane === "preview") Doc.readPreviewSelection(DOM.preview);
        if (op === "rowAbove") Doc.insertRow("above");
        else if (op === "rowBelow") Doc.insertRow("below");
        else if (op === "rowDel") Doc.deleteRow();
        else if (op === "colLeft") Doc.insertCol("left");
        else if (op === "colRight") Doc.insertCol("right");
        else if (op === "colDel") Doc.deleteCol();
        const focus = AppState.activePane === "preview" ? "preview" : "editor";
        syncFromDoc(focus);
        if (focus === "editor") DOM.editor.focus();
    }
};

// ============================================================================
// EDITOR OPERATIONS
// ============================================================================
const EditorOps = {
    lineBounds(text, start, end) {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        return { lineStart, lineEnd };
    },

    replaceSpan(from, to, insert, selFrom, selTo) {
        const editor = DOM.editor;
        editor.setRangeText(insert, from, to, 'end');
        if (selFrom != null) {
            editor.selectionStart = selFrom;
            editor.selectionEnd = selTo;
        }
    },

    /**
     * Apply inline formatting to selected text in editor
     */
    applyInlineFormat(format) {
        const editor = DOM.editor;
        let start = editor.selectionStart;
        let end = editor.selectionEnd;
        const text = editor.value;
        while (start < end && /\s/.test(text[end - 1])) end--;
        while (start < end && /\s/.test(text[start])) start++;
        const selected = text.substring(start, end);
        if (!selected && editor.selectionStart !== editor.selectionEnd) {
            return;
        }
        
        let wrapper;
        switch (format) {
            case 'bold': wrapper = '**'; break;
            case 'italic': wrapper = '*'; break;
            case 'underline': wrapper = '++'; break;
            case 'strike': wrapper = '~~'; break;
            case 'code': wrapper = '`'; break;
            default: return;
        }
        
        // Check if already formatted
        const beforeWrapper = text.substring(start - wrapper.length, start);
        const afterWrapper = text.substring(end, end + wrapper.length);
        
        if (beforeWrapper === wrapper && afterWrapper === wrapper) {
            this.replaceSpan(start - wrapper.length, end + wrapper.length, selected,
                start - wrapper.length, end - wrapper.length);
        } else {
            const newText = wrapper + (selected || 'text') + wrapper;
            this.replaceSpan(start, end, newText, start + wrapper.length, start + wrapper.length + (selected || 'text').length);
        }
        
        this.updatePreviewNow();
        AppState.setModified(true);
        Logger.info('Editor', `Applied ${format} formatting`);
    },
    
    /**
     * Apply block formatting (headers, lists, quotes)
     */
    applyBlockFormat(format) {
        const editor = DOM.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        
        const { lineStart, lineEnd } = this.lineBounds(text, start, end);
        
        // Get all lines in selection
        const selectedLines = text.substring(lineStart, lineEnd).split('\n');
        
        let newLines;
        switch (format) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                const level = parseInt(format.substring(1));
                const prefix = '#'.repeat(level) + ' ';
                newLines = selectedLines.map(line => {
                    const current = line.match(/^(#{1,6})\s/);
                    const stripped = line.replace(/^#{1,6}\s*/, '');
                    if (current && current[1].length === level) return stripped;
                    return prefix + stripped;
                });
                break;
                
            case 'bullet':
                newLines = selectedLines.map(line => {
                    // Check if already a bullet list
                    if (/^[-*+]\s/.test(line)) {
                        return line.replace(/^[-*+]\s/, '');
                    }
                    // Remove number list marker if present
                    line = line.replace(/^\d+\.\s/, '');
                    return '- ' + line;
                });
                break;
                
            case 'number':
                let num = 1;
                newLines = selectedLines.map(line => {
                    // Check if already a numbered list
                    if (/^\d+\.\s/.test(line)) {
                        return line.replace(/^\d+\.\s/, '');
                    }
                    // Remove bullet marker if present
                    line = line.replace(/^[-*+]\s/, '');
                    return `${num++}. ${line}`;
                });
                break;
                
            case 'quoteIncrease':
                newLines = selectedLines.map(line => {
                    if (/^[^>\s].*>/.test(line)) {
                        alert('Quotes can only appear at the start of lines. Remove the text before ">" first.');
                        return line;
                    }
                    if (/^>+/.test(line)) return '>' + line;
                    return '> ' + line;
                });
                break;
                
            case 'quoteDecrease':
                newLines = selectedLines.map(line => {
                    if (line.startsWith('> ')) {
                        return line.substring(2);
                    } else if (line.startsWith('>')) {
                        return line.substring(1);
                    }
                    return line;
                });
                break;
                
            case 'codeBlock':
                const code = selectedLines.join('\n');
                newLines = ['```', code, '```'];
                break;
                
            case 'hr':
                newLines = ['---', ...selectedLines];
                break;
                
            default:
                return;
        }
        
        const newContent = newLines.join('\n');
        this.replaceSpan(lineStart, lineEnd, newContent, lineStart, lineStart + newContent.length);
        
        this.updatePreviewNow();
        AppState.setModified(true);
        Logger.info('Editor', `Applied ${format} block formatting`);
    },
    
    /**
     * Insert link at cursor position
     */
    insertLink(text, url) {
        const editor = DOM.editor;
        const start = editor.selectionStart;
        const content = editor.value;
        
        const linkMd = `[${text}](${url})`;
        this.replaceSpan(start, editor.selectionEnd, linkMd);
        
        this.updatePreviewNow();
        AppState.setModified(true);
        Logger.info('Editor', `Inserted link: ${url}`);
    },
    
    /**
     * Insert image at cursor position
     */
    insertImage(alt, url) {
        const editor = DOM.editor;
        const start = editor.selectionStart;
        const content = editor.value;
        
        const imgMd = `![${alt}](${url})`;
        this.replaceSpan(start, editor.selectionEnd, imgMd);
        
        this.updatePreviewNow();
        AppState.setModified(true);
        Logger.info('Editor', `Inserted image: ${url}`);
    },
    
    _previewTimer: null,

    /**
     * Update preview pane from editor content (debounced)
     */
    updatePreview() {
        if (this._previewTimer) clearTimeout(this._previewTimer);
        this._previewTimer = setTimeout(() => {
            Doc.load(DOM.editor.value);
            DOM.preview.innerHTML = Doc.previewHTML();
            this.updateStatus();
        }, 30);
    },

    /**
     * Update preview immediately (for programmatic changes)
     */
    updatePreviewNow() {
        if (this._previewTimer) clearTimeout(this._previewTimer);
        Doc.load(DOM.editor.value);
        DOM.preview.innerHTML = Doc.previewHTML();
        this.updateStatus();
    },
    
    /**
     * Update status bar
     */
    updateStatus() {
        const text = DOM.editor.value;
        const lines = text.split('\n').length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        DOM.statusRight.textContent = `Lines: ${lines} | Words: ${words} | Characters: ${chars}`;
    }
};
