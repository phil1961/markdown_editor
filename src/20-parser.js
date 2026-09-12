// ============================================================================
// MARKDOWN PARSER
// ============================================================================
const MarkdownParser = {
    escapeText(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },
    escapeAttr(s) {
        return this.escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    safeUrl(url) {
        const u = String(url).trim();
        if (/^(javascript|data|vbscript):/i.test(u)) return '#';
        return this.escapeAttr(u);
    },

    parse(markdown) {
        if (!markdown) return '';

        /* Pull fenced blocks out so later regexes cannot rewrite their contents. */
        const fences = [];
        let html = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const i = fences.length;
            const safeLang = String(lang).replace(/[^a-zA-Z0-9_-]/g, '');
            fences.push('<pre><code class="language-' + safeLang + '">' + this.escapeText(code.trim()) + '</code></pre>');
            return '\n\x00FENCE' + i + '\x00\n';
        });

        html = this.escapeText(html);
        html = html.replace(/^((?:&gt;)+)/gm, m => m.replace(/&gt;/g, '>'));

        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Tables (must be before headers to avoid conflicts)
        html = this.parseTables(html);
        
        // Headers
        html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold and Italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^A-Za-z0-9_])_(?!_)([^_]+)_(?![A-Za-z0-9_])/g, '$1<em>$2</em>');
        
        // Underline (non-standard but useful)
        html = html.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
        
        // Strikethrough
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        
        // Horizontal rule
        html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>');
        
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
            '<img src="' + this.safeUrl(url) + '" alt="' + this.escapeAttr(alt) + '">');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
            '<a href="' + this.safeUrl(url) + '">' + text + '</a>');
        
        // Blockquotes (handle nested)
        html = this.parseBlockquotes(html);
        
        // Lists
        html = this.parseLists(html);
        html = html.replace(/\x00FENCE(\d+)\x00/g, (_, n) => fences[Number(n)]);
        html = this.parseParagraphs(html);
        return html;
    },
    
    parseTables(html) {
        const lines = html.split('\n');
        const result = [];
        let tableLines = [];
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if this looks like a table row
            if (line.startsWith('|') && line.endsWith('|')) {
                tableLines.push(line);
                inTable = true;
            } else if (inTable) {
                // End of table, process it
                if (tableLines.length >= 2) {
                    result.push(this.buildTable(tableLines));
                } else {
                    result.push(...tableLines);
                }
                tableLines = [];
                inTable = false;
                result.push(line);
            } else {
                result.push(line);
            }
        }
        
        // Handle table at end of document
        if (tableLines.length >= 2) {
            result.push(this.buildTable(tableLines));
        } else if (tableLines.length > 0) {
            result.push(...tableLines);
        }
        
        return result.join('\n');
    },
    
    buildTable(lines) {
        if (lines.length < 2) return lines.join('\n');
        
        // Parse cells from each line
        const parseRow = (line) => {
            return line.split('|')
                .slice(1, -1) // Remove empty first and last elements
                .map(cell => cell.trim());
        };
        
        const headerCells = parseRow(lines[0]);
        
        // Check if second line is separator
        const separatorLine = lines[1];
        const isSeparator = /^\|[\s\-:|]+\|$/.test(separatorLine);
        
        if (!isSeparator) return lines.join('\n');
        
        let tableHtml = '<table><thead><tr>';
        headerCells.forEach(cell => {
            tableHtml += `<th>${cell}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        
        // Process data rows
        for (let i = 2; i < lines.length; i++) {
            const cells = parseRow(lines[i]);
            tableHtml += '<tr>';
            cells.forEach(cell => {
                tableHtml += `<td>${cell}</td>`;
            });
            tableHtml += '</tr>';
        }
        
        tableHtml += '</tbody></table>';
        return tableHtml;
    },
    
    parseBlockquotes(html) {
        const lines = html.split('\n');
        const result = [];
        let currentQuote = [];
        let quoteDepth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(>+)\s*(.*)/);
            
            if (match) {
                const depth = match[1].length;
                const content = match[2];
                
                if (currentQuote.length === 0 || depth === quoteDepth) {
                    currentQuote.push(content);
                    quoteDepth = depth;
                } else {
                    // Depth changed, flush current quote
                    result.push(this.wrapInBlockquote(currentQuote.join('\n'), quoteDepth));
                    currentQuote = [content];
                    quoteDepth = depth;
                }
            } else {
                if (currentQuote.length > 0) {
                    result.push(this.wrapInBlockquote(currentQuote.join('\n'), quoteDepth));
                    currentQuote = [];
                    quoteDepth = 0;
                }
                result.push(line);
            }
        }
        
        // Handle remaining quote
        if (currentQuote.length > 0) {
            result.push(this.wrapInBlockquote(currentQuote.join('\n'), quoteDepth));
        }
        
        return result.join('\n');
    },
    
    wrapInBlockquote(content, depth) {
        let result = content;
        for (let i = 0; i < depth; i++) {
            result = `<blockquote>${result}</blockquote>`;
        }
        return result;
    },
    
    parseLists(html) {
        const lines = html.split('\n');
        const result = [];
        let currentList = [];
        let listType = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
            const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
            
            if (bulletMatch) {
                if (listType !== 'ul') {
                    if (currentList.length > 0) {
                        result.push(this.wrapList(currentList, listType));
                        currentList = [];
                    }
                    listType = 'ul';
                }
                currentList.push(bulletMatch[3]);
            } else if (numberMatch) {
                if (listType !== 'ol') {
                    if (currentList.length > 0) {
                        result.push(this.wrapList(currentList, listType));
                        currentList = [];
                    }
                    listType = 'ol';
                }
                currentList.push(numberMatch[3]);
            } else {
                if (currentList.length > 0) {
                    result.push(this.wrapList(currentList, listType));
                    currentList = [];
                    listType = null;
                }
                result.push(line);
            }
        }
        
        // Handle remaining list
        if (currentList.length > 0) {
            result.push(this.wrapList(currentList, listType));
        }
        
        return result.join('\n');
    },
    
    wrapList(items, type) {
        const tag = type || 'ul';
        return `<${tag}>${items.map(item => `<li>${item}</li>`).join('')}</${tag}>`;
    },
    
    parseParagraphs(html) {
        // Split by double newlines and wrap non-block elements in paragraphs
        const blocks = html.split(/\n\n+/);
        const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'table'];
        
        return blocks.map(block => {
            block = block.trim();
            if (!block) return '';
            
            // Check if this block starts with a block-level element
            const startsWithBlock = blockTags.some(tag => 
                block.startsWith(`<${tag}`) || block.startsWith(`</${tag}`)
            );
            
            if (startsWithBlock) {
                return block;
            }
            
            // Replace single newlines with <br> within paragraphs
            block = block.replace(/\n/g, '<br>');
            return `<p>${block}</p>`;
        }).join('\n');
    }
};
