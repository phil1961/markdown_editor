/* @requires-dom */
// ============================================================================
// PREVIEW OPERATIONS
// ============================================================================
const PreviewOps = {
    /**
     * Apply formatting in preview pane
     */
    applyFormat(format) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        // Check if we're in the preview pane
        if (!DOM.preview.contains(range.commonAncestorContainer)) {
            return;
        }
        
        // Handle block formats differently
        const blockFormats = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bullet', 'number', 'quoteIncrease', 'quoteDecrease', 'codeBlock', 'hr'];
        if (blockFormats.includes(format)) {
            this.applyBlockFormat(format, range);
        } else {
            this.applyInlineFormat(format, range);
        }
    },
    
    /**
     * Apply inline formatting in preview
     */
    applyInlineFormat(format, range) {
        let tagName;
        switch (format) {
            case 'bold': tagName = 'strong'; break;
            case 'italic': tagName = 'em'; break;
            case 'underline': tagName = 'u'; break;
            case 'strike': tagName = 'del'; break;
            case 'code': tagName = 'code'; break;
            default: return;
        }
        
        const aliases = { bold: ['strong', 'b'], italic: ['em', 'i'], underline: ['u'], strike: ['del', 's'], code: ['code'] };
        const tags = aliases[format] || [tagName];
        this.trimRangeWhitespace(range);

        /* Use the start point, not commonAncestor: a double-click of a bold
           word often still includes the following space, so the ancestor is
           the parent of <strong> and closest() looking up misses the wrap. */
        const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer
            : range.startContainer.parentElement;
        let existing = startEl && tags
            .map(t => startEl.closest(t))
            .find(el => el && DOM.preview.contains(el) && el !== DOM.preview);
        if (!existing && range.startContainer.nodeType === Node.ELEMENT_NODE) {
            if (tags.includes(range.startContainer.tagName.toLowerCase())) {
                existing = range.startContainer;
            } else {
                const node = range.startContainer.childNodes[range.startOffset];
                if (node && node.nodeType === Node.ELEMENT_NODE && tags.includes(node.tagName.toLowerCase())) {
                    existing = node;
                }
            }
        }

        const sel = window.getSelection();
        if (existing) {
            /* Lift children out. Flattening with textContent would destroy
               nested bold/italic/strike when only underline is toggled off. */
            const first = existing.firstChild;
            const last = existing.lastChild;
            const parent = existing.parentNode;
            while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
            parent.removeChild(existing);
            if (first && last) {
                const next = document.createRange();
                if (first === last) next.selectNodeContents(first);
                else {
                    next.setStartBefore(first);
                    next.setEndAfter(last);
                }
                sel.removeAllRanges();
                sel.addRange(next);
            }
        } else {
            if (range.collapsed) return;
            const wrapper = document.createElement(tagName);
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);
            const next = document.createRange();
            next.selectNodeContents(wrapper);
            sel.removeAllRanges();
            sel.addRange(next);
        }

        this.syncToEditor();
        IconHighlighter.checkPreviewFormats();
        Logger.info('Preview', `Applied ${format} formatting`);
    },

    /* Double-click in contenteditable often includes the trailing space.
       Keep that space outside the <strong>/<em>/<u> so the raw pane gets
       **Widget** not **Widget **. */
    trimRangeWhitespace(range) {
        let guard = 0;
        while (!range.collapsed && /^\s/.test(range.toString()) && guard++ < 1000) {
            const n = range.startContainer;
            if (n.nodeType === Node.TEXT_NODE && range.startOffset < n.length) {
                range.setStart(n, range.startOffset + 1);
            } else if (n.nodeType === Node.ELEMENT_NODE && range.startOffset < n.childNodes.length) {
                range.setStart(n.childNodes[range.startOffset], 0);
            } else break;
        }
        guard = 0;
        while (!range.collapsed && /\s$/.test(range.toString()) && guard++ < 1000) {
            const n = range.endContainer;
            if (n.nodeType === Node.TEXT_NODE && range.endOffset > 0) {
                range.setEnd(n, range.endOffset - 1);
            } else if (n.nodeType === Node.ELEMENT_NODE && range.endOffset > 0) {
                const child = n.childNodes[range.endOffset - 1];
                range.setEnd(child, child.nodeType === Node.TEXT_NODE ? child.length : child.childNodes.length);
            } else break;
        }
    },
    
    /**
     * Apply block formatting in preview
     */
    applyBlockFormat(format, range) {
        // Find the block element(s) containing the selection
        let startBlock = this.findBlockElement(range.startContainer);
        let endBlock = this.findBlockElement(range.endContainer);
        
        if (!startBlock) {
            Logger.warn('Preview', 'Could not find block element for formatting');
            alert('Could not find block element. Please select some content first.');
            return;
        }
        
        // Collect all block elements in the selection
        const selectedBlocks = [];
        const processedLists = new Set();
        
        // Get all elements that intersect with the selection
        const walker = document.createTreeWalker(
            DOM.preview,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'UL', 'OL'].includes(node.tagName)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let node;
        let foundStart = false;
        
        while (node = walker.nextNode()) {
            if (node === startBlock || node.contains(startBlock) || startBlock.contains(node)) {
                foundStart = true;
            }
            
            if (foundStart && range.intersectsNode(node)) {
                // Special handling for LI elements - get the parent list instead
                if (node.tagName === 'LI') {
                    const parentList = node.closest('ul, ol');
                    if (parentList && !processedLists.has(parentList)) {
                        // Check if all list items are selected
                        const listItems = Array.from(parentList.querySelectorAll(':scope > li'));
                        const allSelected = listItems.every(li => range.intersectsNode(li));
                        if (allSelected && (format === 'quoteIncrease' || format === 'quoteDecrease')) {
                            selectedBlocks.push(parentList);
                            processedLists.add(parentList);
                            continue;
                        }
                    }
                }
                
                if (!processedLists.has(node.closest('ul, ol'))) {
                    selectedBlocks.push(node);
                }
            }
            
            if (node === endBlock || node.contains(endBlock)) {
                break;
            }
        }
        
        // If no blocks found, use the start block
        if (selectedBlocks.length === 0 && startBlock) {
            selectedBlocks.push(startBlock);
        }
        
        for (const block of selectedBlocks) {
            this.formatBlock(block, format);
        }

        this.syncToEditor();
        IconHighlighter.checkPreviewFormats();
        Logger.info('Preview', `Applied ${format} to ${selectedBlocks.length} block(s)`);
    },
    
    /**
     * Find the nearest block-level element
     */
    findBlockElement(node) {
        const blocks = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'ul', 'ol'];
        if (node && node !== DOM.preview && !DOM.preview.contains(node)) {
            const sel = window.getSelection();
            node = sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
        }
        let walk = node;
        while (walk && walk !== DOM.preview) {
            if (walk.nodeType === Node.ELEMENT_NODE && blocks.includes(walk.tagName.toLowerCase())) {
                return walk;
            }
            walk = walk.parentNode;
        }
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        const children = Array.from(DOM.preview.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.ELEMENT_NODE && blocks.includes(child.tagName.toLowerCase())
                && range.intersectsNode(child)) {
                return child;
            }
        }
        let first = null, last = null;
        for (const child of children) {
            try {
                if (range.intersectsNode(child)) {
                    if (!first) first = child;
                    last = child;
                }
            } catch (e) { /* detached */ }
        }
        if (first) {
            const p = document.createElement('p');
            DOM.preview.insertBefore(p, first);
            let current = p.nextSibling;
            while (current) {
                const next = current.nextSibling;
                p.appendChild(current);
                if (current === last) break;
                current = next;
            }
            return p;
        }
        return null;
    },
    
    /**
     * Format a single block element
     */
    formatBlock(block, format) {
        const tag = block.tagName.toLowerCase();
        
        switch (format) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                this.convertToHeader(block, format);
                break;
                
            case 'bullet':
                this.convertToList(block, 'ul');
                break;
                
            case 'number':
                this.convertToList(block, 'ol');
                break;
                
            case 'quoteIncrease':
                this.increaseQuote(block);
                break;
                
            case 'quoteDecrease':
                this.decreaseQuote(block);
                break;
        }
    },
    
    /**
     * Convert block to header
     */
    convertToHeader(block, level) {
        const next = document.createElement(block.tagName.toLowerCase() === level ? 'p' : level);
        next.innerHTML = block.innerHTML;
        block.parentNode.replaceChild(next, block);
        const sel = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(next);
        sel.removeAllRanges();
        sel.addRange(r);
    },
    
    /**
     * Convert block to list
     */
    convertToList(block, type) {
        const tag = block.tagName.toLowerCase();
        
        if (tag === 'li') {
            // Toggle list type
            const parentList = block.parentElement;
            if (parentList.tagName.toLowerCase() !== type) {
                const newList = document.createElement(type);
                while (parentList.firstChild) {
                    newList.appendChild(parentList.firstChild);
                }
                parentList.parentNode.replaceChild(newList, parentList);
            }
        } else {
            // Convert to list
            const list = document.createElement(type);
            const li = document.createElement('li');
            li.innerHTML = block.innerHTML;
            list.appendChild(li);
            block.parentNode.replaceChild(list, block);
        }
    },
    
    /**
     * Increase quote level
     */
    increaseQuote(block) {
        const blockquote = document.createElement('blockquote');
        
        // Handle list elements specially - wrap the entire list
        if (block.tagName === 'UL' || block.tagName === 'OL') {
            const clonedList = block.cloneNode(true);
            blockquote.appendChild(clonedList);
            block.parentNode.replaceChild(blockquote, block);
        } else if (block.tagName === 'LI') {
            // Wrap the parent list
            const parentList = block.closest('ul, ol');
            if (parentList) {
                const clonedList = parentList.cloneNode(true);
                blockquote.appendChild(clonedList);
                parentList.parentNode.replaceChild(blockquote, parentList);
            }
        } else {
            // Regular element
            const cloned = block.cloneNode(true);
            blockquote.appendChild(cloned);
            block.parentNode.replaceChild(blockquote, block);
        }
    },
    
    /**
     * Decrease quote level
     */
    decreaseQuote(block) {
        // Find the nearest blockquote parent
        const blockquote = block.closest('blockquote');
        if (!blockquote) return;
        
        // Move contents out of the blockquote
        const parent = blockquote.parentNode;
        while (blockquote.firstChild) {
            parent.insertBefore(blockquote.firstChild, blockquote);
        }
        parent.removeChild(blockquote);
    },
    
    /**
     * Sync preview changes back to editor
     */
    syncToEditor() {
        const markdown = HtmlToMarkdown.convert(DOM.preview.innerHTML);
        DOM.editor.value = markdown;
        EditorOps.updateStatus();
        AppState.setModified(true);
    }
};
