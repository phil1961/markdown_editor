/* @requires-dom */
// ============================================================================
// FILE OPERATIONS
// ============================================================================
const FileOps = {
    newDocument() {
        if (AppState.isModified) {
            return Dialog.ask('You have unsaved changes. Create a new document anyway?',
                { title: 'Unsaved changes', ok: 'Discard changes' })
                .then(yes => { if (yes) this.clearDocument(); });
        }
        this.clearDocument();
    },

    clearDocument() {
        
        DOM.editor.value = '';
        Doc.load('');
        DOM.preview.innerHTML = Doc.previewHTML();
        AppState.currentFile = null;
        AppState.fileHandle = null;
        AppState.setModified(false);
        this.updateFileNameDisplay();
        EditorOps.updateStatus();
        History.reset('New document');
        Logger.info('File', 'Created new document');
    },
    
    /* Chrome, Edge and Brave expose the File System Access API. With it,
       Open returns a handle and Save writes back to that file. Elsewhere
       (Firefox, Safari) Open uses the <input type=file> and Save downloads. */
    hasFsAccess() {
        return typeof window.showSaveFilePicker === "function"
            && typeof window.showOpenFilePicker === "function";
    },

    OPEN_TYPES: [{
        description: "Markdown, text or HTML",
        accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"], "text/html": [".html"] }
    }],
    SAVE_TYPES: [{ description: "Markdown", accept: { "text/markdown": [".md", ".markdown"] } }],

    openFile() {
        if (!this.hasFsAccess()) {
            DOM.fileInput.click();
            return;
        }
        window.showOpenFilePicker({ types: this.OPEN_TYPES, multiple: false })
            .then(handles => {
                const handle = handles && handles[0];
                if (!handle) return;
                return handle.getFile().then(file => this.loadFile(file, handle));
            })
            .catch(err => {
                if (err && err.name === "AbortError") { Logger.info("File", "Open cancelled"); return; }
                Logger.error("File", "Open picker failed: " + (err && err.message));
                DOM.statusLeft.textContent = "Open failed: " + (err && err.message);
            });
    },
    
    handleFileOpen(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.loadFile(file);
        // Reset file input
        event.target.value = '';
    },
    
    loadFile(file, handle) {
        // Validate file type
        const validExtensions = ['.md', '.markdown', '.txt', '.html'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(extension)) {
            Dialog.tell(`${file.name} is not a supported file type. Please use .md, .txt, or .html files.`, 'Cannot open file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            let content = e.target.result;
            
            /* An HTML file becomes markdown. The extension was lower-cased
               above, so NOTES.HTML converts too instead of landing as raw
               tags in the editor. */
            if (extension === '.html') content = HtmlToMarkdown.convert(content);
            
            DOM.editor.value = content;
            EditorOps.updatePreviewNow();
            AppState.currentFile = file.name;
            /* Never write markdown back over an .html source. */
            AppState.fileHandle = handle && extension !== '.html' ? handle : null;
            AppState.setModified(false);
            this.updateFileNameDisplay();
            DOM.statusLeft.textContent = `Opened: ${file.name}`;
            History.reset('Open ' + file.name);
            Logger.info('File', `Opened: ${file.name}`);
        };
        reader.onerror = () => {
            Dialog.tell(`Error reading ${file.name}. Please try again.`, 'Cannot open file');
            Logger.error('File', `Error reading: ${file.name}`);
        };
        reader.readAsText(file);
    },
    
    /* Ctrl+S. Writes back to the opened file when we hold a handle; asks
       where the first time; downloads where the API does not exist. */
    saveFile() {
        if (AppState.fileHandle) {
            return this.writeToHandle(AppState.fileHandle).then(ok => ok ? true : this.saveAs());
        }
        return this.saveAs();
    },

    /* Ctrl+Shift+S. Always asks where. */
    saveAs() {
        if (!this.hasFsAccess()) {
            this.exportAs('md');
            return Promise.resolve(true);
        }
        return window.showSaveFilePicker({ suggestedName: this.suggestedName(), types: this.SAVE_TYPES })
            .then(handle => this.writeToHandle(handle).then(ok => {
                if (ok) AppState.fileHandle = handle;
                return ok;
            }))
            .catch(err => {
                if (err && err.name === "AbortError") { Logger.info("File", "Save As cancelled"); return false; }
                Logger.warn("File", "Save picker failed (" + (err && err.message) + "); downloading instead");
                this.exportAs('md');
                return true;
            });
    },

    suggestedName() {
        const base = AppState.currentFile ? AppState.currentFile.replace(/\.[^/.]+$/, '') : 'document';
        return base + '.md';
    },

    async writeToHandle(handle) {
        try {
            if (typeof handle.queryPermission === "function") {
                let p = await handle.queryPermission({ mode: "readwrite" });
                if (p !== "granted" && typeof handle.requestPermission === "function") {
                    p = await handle.requestPermission({ mode: "readwrite" });
                }
                if (p !== "granted") {
                    Logger.warn("File", "Write permission not granted for " + handle.name);
                    DOM.statusLeft.textContent = "Not saved: permission denied for " + handle.name;
                    return false;
                }
            }
            const writable = await handle.createWritable();
            await writable.write(DOM.editor.value);
            await writable.close();
            AppState.currentFile = handle.name;
            AppState.setModified(false);
            this.updateFileNameDisplay();
            DOM.statusLeft.textContent = "Saved: " + handle.name;
            Logger.success("File", "Saved: " + handle.name);
            return true;
        } catch (err) {
            Logger.error("File", "Save failed: " + (err && err.message));
            DOM.statusLeft.textContent = "Save failed: " + (err && err.message);
            return false;
        }
    },
    
    exportAs(format) {
        const markdown = DOM.editor.value;
        let content, mimeType, extension;
        
        switch (format) {
            case 'md':
                content = markdown;
                mimeType = 'text/markdown';
                extension = '.md';
                break;
                
            case 'html':
                const htmlContent = MarkdownParser.parse(markdown);
                content = this.generateHtmlDocument(htmlContent);
                mimeType = 'text/html';
                extension = '.html';
                break;
                
            case 'txt':
                // Strip markdown formatting for plain text
                content = this.stripMarkdown(markdown);
                mimeType = 'text/plain';
                extension = '.txt';
                break;
                
            default:
                return;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Get base filename without extension
        let baseName = 'document';
        if (AppState.currentFile) {
            baseName = AppState.currentFile.replace(/\.[^/.]+$/, '');
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + extension;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (format === 'md') {
            AppState.setModified(false);
            AppState.currentFile = a.download;
            this.updateFileNameDisplay();
        }
        
        DOM.statusLeft.textContent = `Downloaded: ${a.download}`;
        Logger.info('File', `Downloaded as ${format.toUpperCase()}: ${a.download}`);
    },

    // Hosted demo only: grab the original file, not the live DOM (which has
    // whatever the visitor typed). file:// cannot fetch; the href is enough.
    downloadEditor() {
        const name = "markdown-editor.html";
        const clickHref = (href, revoke) => {
            const a = document.createElement("a");
            a.href = href;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1500);
            DOM.statusLeft.textContent = "Downloaded: " + name;
            Logger.info("File", "Downloaded editor app: " + name);
        };
        const pageUrl = location.href.split("#")[0].split("?")[0];
        if (location.protocol === "http:" || location.protocol === "https:") {
            fetch(pageUrl, { cache: "no-store" }).then(r => {
                if (!r.ok) throw new Error(String(r.status));
                return r.blob();
            }).then(blob => clickHref(URL.createObjectURL(blob), true))
              .catch(() => clickHref("markdown-editor.html", false));
            return;
        }
        clickHref("markdown-editor.html", false);
    },
    
    generateHtmlDocument(bodyContent) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${AppState.currentFile ? AppState.currentFile.replace(/\.[^/.]+$/, '') : 'Document'}</title>
    <style>
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    line-height: 1.6;
    color: #333;
}
h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; color: inherit; }
blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; background: #eff6ff; }
a { color: #2563eb; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f9f9f9; }
pre[data-lang] { position: relative; }
pre[data-lang]::before { content: attr(data-lang); position: absolute; top: 5px; right: 10px; font: 600 10px/1 sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #9ca3af; }
.hl-k { color: #c4a7ff; } .hl-s { color: #a5e3a0; } .hl-c { color: #8b949e; font-style: italic; }
.hl-n { color: #ffb86c; } .hl-v { color: #7dd3fc; } .hl-f { color: #82b1ff; } .hl-t { color: #ff9eb1; }
.hl-a { color: #fcd34d; } .hl-h { color: #93c5fd; font-weight: 600; }
.hl-ins { color: #86efac; background: rgba(34, 197, 94, .14); } .hl-del { color: #fca5a5; background: rgba(239, 68, 68, .14); }
.markdown-alert-title { font-weight: 600; margin: 0 0 .35em; }
.markdown-alert-note { border-left-color: #2563eb; background: #eff6ff; } .markdown-alert-note .markdown-alert-title { color: #1d4ed8; }
.markdown-alert-tip { border-left-color: #16a34a; background: #f0fdf4; } .markdown-alert-tip .markdown-alert-title { color: #15803d; }
.markdown-alert-important { border-left-color: #9333ea; background: #faf5ff; } .markdown-alert-important .markdown-alert-title { color: #7e22ce; }
.markdown-alert-warning { border-left-color: #d97706; background: #fffbeb; } .markdown-alert-warning .markdown-alert-title { color: #b45309; }
.markdown-alert-caution { border-left-color: #dc2626; background: #fef2f2; } .markdown-alert-caution .markdown-alert-title { color: #b91c1c; }
    </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
    },
    
    stripMarkdown(markdown) {
        let text = markdown;
        // Remove headers
        text = text.replace(/^#{1,6}\s+/gm, '');
        // Remove bold/italic
        text = text.replace(/\*\*(.+?)\*\*/g, '$1');
        text = text.replace(/\*(.+?)\*/g, '$1');
        text = text.replace(/__(.+?)__/g, '$1');
        text = text.replace(/_(.+?)_/g, '$1');
        // Remove strikethrough
        text = text.replace(/~~(.+?)~~/g, '$1');
        // Remove links but keep text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Remove images
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
        // Remove inline code
        text = text.replace(/`([^`]+)`/g, '$1');
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        // Remove blockquotes
        text = text.replace(/^>\s*/gm, '');
        // Remove list markers
        text = text.replace(/^[-*+]\s+/gm, '');
        text = text.replace(/^\d+\.\s+/gm, '');
        // Remove horizontal rules
        text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '');
        return text;
    },
    
    updateFileNameDisplay() {
        if (DOM.fileNameDisplay) {
            DOM.fileNameDisplay.textContent = AppState.currentFile || '';
        }
    }
};

// ============================================================================
// DRAG AND DROP HANDLER
// ============================================================================
const DragDropHandler = {
    dragCounter: 0,
    
    init() {
        // Prevent default drag behaviors on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Handle drag enter/leave for overlay
        document.body.addEventListener('dragenter', (e) => this.handleDragEnter(e), false);
        document.body.addEventListener('dragleave', (e) => this.handleDragLeave(e), false);
        document.body.addEventListener('dragover', (e) => this.handleDragOver(e), false);
        document.body.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        Logger.info('DragDrop', 'Drag and drop initialized');
    },
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    handleDragEnter(e) {
        this.dragCounter++;
        
        // Check if dragging files
        if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
            DOM.dragOverlay.classList.add('active');
        }
    },
    
    handleDragLeave(e) {
        this.dragCounter--;
        
        if (this.dragCounter === 0) {
            DOM.dragOverlay.classList.remove('active');
        }
    },
    
    handleDragOver(e) {
        e.dataTransfer.dropEffect = 'copy';
    },
    
    handleDrop(e) {
        this.dragCounter = 0;
        DOM.dragOverlay.classList.remove('active');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Only handle the first file
            const file = files[0];
            
            // Check for unsaved changes
            /* Not confirm(): in a sandboxed iframe without allow-modals it
               returns false with no prompt, and the drop was thrown away. */
            if (AppState.isModified) {
                Dialog.ask('You have unsaved changes. Load the dropped file anyway?',
                    { title: 'Unsaved changes', ok: 'Discard changes' })
                    .then(yes => {
                        if (!yes) { Logger.info('DragDrop', `Drop cancelled: ${file.name}`); return; }
                        FileOps.loadFile(file);
                        Logger.info('DragDrop', `File dropped: ${file.name}`);
                    });
                return;
            }
            
            FileOps.loadFile(file);
            Logger.info('DragDrop', `File dropped: ${file.name}`);
        }
    }
};
