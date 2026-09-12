/* =========================================================================
   Doc — the live document. Markdown is the file format, not the data structure.
   ========================================================================= */
const Doc = (() => {
    const MARK_TAG = { bold: "strong", italic: "em", underline: "u", strike: "del", code: "code" };
    const TAG_MARK = { strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline", del: "strike", s: "strike", code: "code" };
    const MARK_WRAP = [
        { mark: "code", open: "`", close: "`" },
        { mark: "strike", open: "~~", close: "~~" },
        { mark: "underline", open: "++", close: "++" },
        { mark: "italic", open: "*", close: "*" },
        { mark: "bold", open: "**", close: "**" }
    ];
    const BLOCKS = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "quote", "pre", "hr", "table"];

    let state = { blocks: [{ type: "p", inlines: [] }] };
    let sel = { from: 0, to: 0 };

    function empty() { return { blocks: [{ type: "p", inlines: [] }] }; }
    function get() { return state; }
    function selection() { return { from: sel.from, to: sel.to }; }
    function setSelection(from, to) {
        const n = totalLen(state);
        from = clamp(from, 0, n);
        to = clamp(to === undefined ? from : to, 0, n);
        if (from > to) { const t = from; from = to; to = t; }
        sel = { from, to };
        return sel;
    }
    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

    function marksOf(r) { return Array.isArray(r.marks) ? r.marks.slice().sort() : []; }
    function marksEq(a, b) { return marksOf({ marks: a }).join() === marksOf({ marks: b }).join(); }
    function inlinesText(ins) { return (ins || []).map(r => r.text || "").join(""); }

    function mergeInlines(ins) {
        const out = [];
        for (const r of ins || []) {
            if (r.type === "image") { out.push(r); continue; }
            if (!r.text) continue;
            const last = out[out.length - 1];
            if (last && last.type !== "image" && marksEq(last.marks, r.marks) && last.href === r.href) {
                last.text += r.text;
            } else out.push({ text: r.text, marks: marksOf(r), href: r.href });
        }
        return out;
    }

    function blockText(b) {
        if (!b) return "";
        if (b.type === "hr") return "";
        if (b.type === "pre") return b.text || "";
        if (b.type === "table") return (b.rows || []).map(row => row.join(" ")).join("\n");
        if (b.type === "ul" || b.type === "ol") return (b.items || []).map(inlinesText).join("\n");
        if (b.type === "quote") return (b.blocks || []).map(blockText).join("\n");
        return inlinesText(b.inlines);
    }

    function index(doc) {
        const blocks = doc.blocks;
        let pos = 0;
        return blocks.map((b, i) => {
            const text = blockText(b);
            const from = pos;
            const to = pos + text.length;
            pos = to + (i < blocks.length - 1 ? 1 : 0);
            return { from, to, text, i, type: b.type };
        });
    }
    function totalLen(doc) {
        const ix = index(doc);
        if (!ix.length) return 0;
        return ix[ix.length - 1].to;
    }
    function locAt(doc, pos) {
        const ix = index(doc);
        const n = totalLen(doc);
        pos = clamp(pos, 0, n);
        for (let k = 0; k < ix.length; k++) {
            if (pos < ix[k].to || k === ix.length - 1) {
                if (pos <= ix[k].to) return { block: ix[k].i, offset: pos - ix[k].from };
            }
            if (pos === ix[k].to && k < ix.length - 1 && pos < ix[k + 1].from) {
                return { block: ix[k].i, offset: ix[k].text.length };
            }
        }
        const last = ix[ix.length - 1];
        return last ? { block: last.i, offset: last.text.length } : { block: 0, offset: 0 };
    }

    /* ---- inline parse / serialize ---------------------------------------- */
    function parseInlines(s, marks) {
        marks = marks || new Set();
        const runs = [];
        let i = 0, buf = "";
        const flush = () => {
            if (buf) { runs.push({ text: buf, marks: [...marks].sort() }); buf = ""; }
        };
        const tryPair = (open, close, mark) => {
            if (marks.has(mark)) return false;
            if (open === "*" && s.startsWith("**", i)) return false;
            if (!s.startsWith(open, i)) return false;
            const from = i + open.length;
            const j = s.indexOf(close, from);
            if (j < 0 || j === from) return false;
            flush();
            const next = new Set(marks);
            next.add(mark);
            runs.push(...parseInlines(s.slice(from, j), next));
            i = j + close.length;
            return true;
        };
        while (i < s.length) {
            if (s.startsWith("![", i)) {
                const m = s.slice(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
                if (m) {
                    flush();
                    runs.push({ type: "image", text: m[1] || "", alt: m[1], src: m[2], marks: [...marks] });
                    i += m[0].length;
                    continue;
                }
            }
            if (s[i] === "[") {
                const m = s.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
                if (m) {
                    flush();
                    const inner = parseInlines(m[1], marks);
                    inner.forEach(r => { r.href = m[2]; });
                    runs.push(...inner);
                    i += m[0].length;
                    continue;
                }
            }
            if (!marks.has("bold") && !marks.has("italic") && s.startsWith("***", i)) {
                const j = s.indexOf("***", i + 3);
                if (j > i + 3) {
                    flush();
                    const next = new Set(marks);
                    next.add("bold");
                    next.add("italic");
                    runs.push(...parseInlines(s.slice(i + 3, j), next));
                    i = j + 3;
                    continue;
                }
            }
            if (tryPair("**", "**", "bold")) continue;
            if (tryPair("++", "++", "underline")) continue;
            if (tryPair("~~", "~~", "strike")) continue;
            if (tryPair("`", "`", "code")) continue;
            if (tryPair("*", "*", "italic")) continue;
            if (s[i] === "_" && (i === 0 || /[^A-Za-z0-9_]/.test(s[i - 1])) && !marks.has("italic")) {
                const j = s.indexOf("_", i + 1);
                if (j > i + 1 && (j + 1 >= s.length || /[^A-Za-z0-9_]/.test(s[j + 1]))) {
                    flush();
                    const next = new Set(marks);
                    next.add("italic");
                    runs.push(...parseInlines(s.slice(i + 1, j), next));
                    i = j + 1;
                    continue;
                }
            }
            buf += s[i++];
        }
        flush();
        return mergeInlines(runs);
    }

    function serRun(r) {
        if (r.type === "image") return "![" + (r.alt || "") + "](" + (r.src || "") + ")";
        let s = r.text || "";
        const m = r.marks || [];
        const bold = m.includes("bold");
        const italic = m.includes("italic");
        if (m.includes("code")) s = "`" + s + "`";
        if (m.includes("strike")) s = "~~" + s + "~~";
        if (m.includes("underline")) s = "++" + s + "++";
        /* Never emit ***text*** — a ** pair would wrap "*text" and round-trip wrong. */
        if (italic) s = (bold ? "_" : "*") + s + (bold ? "_" : "*");
        if (bold) s = "**" + s + "**";
        if (r.href) s = "[" + s + "](" + r.href + ")";
        return s;
    }
    function serInlines(ins) { return (ins || []).map(serRun).join(""); }

    function serBlock(b) {
        switch (b.type) {
            case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
                return "#".repeat(+b.type[1]) + " " + serInlines(b.inlines);
            case "hr": return "---";
            case "pre": return "```" + (b.lang || "") + "\n" + (b.text || "") + "\n```";
            case "ul": return (b.items || []).map(it => "- " + serInlines(it)).join("\n");
            case "ol": return (b.items || []).map((it, i) => (i + 1) + ". " + serInlines(it)).join("\n");
            case "quote": {
                const inner = (b.blocks || []).map(serBlock).join("\n");
                return inner.split("\n").map(l => "> " + l).join("\n");
            }
            case "table": {
                const rows = b.rows || [];
                if (!rows.length) return "";
                const pipe = row => "| " + row.join(" | ") + " |";
                const lines = [pipe(rows[0]), "| " + rows[0].map(() => "---").join(" | ") + " |"];
                for (let i = 1; i < rows.length; i++) lines.push(pipe(rows[i]));
                return lines.join("\n");
            }
            default: return serInlines(b.inlines);
        }
    }

    function parse(md) {
        if (!md) return empty();
        const fences = [];
        md = String(md).replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, body) => {
            fences.push({ lang, body: body.replace(/\n$/, "") });
            return "\n\x00FENCE" + (fences.length - 1) + "\x00\n";
        });
        const lines = md.split("\n");
        const blocks = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const fm = line.match(/^\x00FENCE(\d+)\x00$/);
            if (fm) { blocks.push({ type: "pre", lang: fences[+fm[1]].lang, text: fences[+fm[1]].body }); i++; continue; }
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()) && line.trim().length >= 3) { blocks.push({ type: "hr" }); i++; continue; }
            const h = line.match(/^(#{1,6})\s+(.*)$/);
            if (h) { blocks.push({ type: "h" + h[1].length, inlines: parseInlines(h[2]) }); i++; continue; }
            if (/^\s*$/.test(line)) { i++; continue; }
            if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
                const rows = [];
                while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                    if (!/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
                        rows.push(lines[i].split("|").slice(1, -1).map(c => c.trim()));
                    }
                    i++;
                }
                blocks.push({ type: "table", rows });
                continue;
            }
            if (/^>/.test(line)) {
                const q = [];
                while (i < lines.length && /^>/.test(lines[i])) {
                    q.push(lines[i].replace(/^>\s?/, ""));
                    i++;
                }
                blocks.push({ type: "quote", blocks: parse(q.join("\n")).blocks });
                continue;
            }
            if (/^\s*[-*+]\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
                    items.push(parseInlines(lines[i].replace(/^\s*[-*+]\s+/, "")));
                    i++;
                }
                blocks.push({ type: "ul", items });
                continue;
            }
            if (/^\s*\d+\.\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                    items.push(parseInlines(lines[i].replace(/^\s*\d+\.\s+/, "")));
                    i++;
                }
                blocks.push({ type: "ol", items });
                continue;
            }
            const para = [];
            while (i < lines.length && lines[i].trim() !== ""
                && !/^(#{1,6}\s|\x00FENCE|>\s?|[-*+]\s|\d+\.\s|\|)/.test(lines[i])
                && !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())) {
                para.push(lines[i]);
                i++;
            }
            blocks.push({ type: "p", inlines: parseInlines(para.join(" ")) });
        }
        if (!blocks.length) blocks.push({ type: "p", inlines: [] });
        return { blocks };
    }

    function toMarkdown(doc) {
        doc = doc || state;
        return (doc.blocks || []).map(serBlock).join("\n\n");
    }

    /* ---- HTML render ----------------------------------------------------- */
    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function escUrl(u) {
        u = String(u || "").trim();
        if (/^(javascript|data|vbscript):/i.test(u)) return "#";
        return esc(u);
    }
    function wrapRun(r, from, mapped) {
        const to = from + (r.text || "").length;
        if (r.type === "image") {
            return "<img src=\"" + escUrl(r.src) + "\" alt=\"" + esc(r.alt || "") + "\""
                + (mapped ? " data-from=\"" + from + "\" data-to=\"" + to + "\"" : "") + ">";
        }
        let inner = esc(r.text || "");
        const order = ["code", "strike", "underline", "italic", "bold"];
        for (const mk of order) {
            if ((r.marks || []).includes(mk)) inner = "<" + MARK_TAG[mk] + ">" + inner + "</" + MARK_TAG[mk] + ">";
        }
        if (r.href) inner = "<a href=\"" + escUrl(r.href) + "\">" + inner + "</a>";
        if (mapped) inner = "<span data-from=\"" + from + "\" data-to=\"" + to + "\">" + inner + "</span>";
        return inner;
    }
    function renderInlines(ins, from, mapped) {
        let html = "", pos = from;
        for (const r of ins || []) {
            html += wrapRun(r, pos, mapped);
            pos += (r.text || "").length;
        }
        return html;
    }
    function renderBlock(b, from, mapped) {
        const body = () => renderInlines(b.inlines, from, mapped);
        const caretHole = () => (mapped && !inlinesText(b.inlines))
            ? "<span data-from=\"" + from + "\" data-to=\"" + from + "\"><br></span>"
            : "";
        switch (b.type) {
            case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
                return "<" + b.type + ">" + (body() || caretHole()) + "</" + b.type + ">";
            case "hr": return "<hr>";
            case "pre": {
                const lang = String(b.lang || "").replace(/[^a-zA-Z0-9_-]/g, "");
                const inner = mapped
                    ? "<span data-from=\"" + from + "\" data-to=\"" + (from + (b.text || "").length) + "\">" + esc(b.text || "") + "</span>"
                    : esc(b.text || "");
                return "<pre><code class=\"language-" + lang + "\">" + inner + "</code></pre>";
            }
            case "ul":
            case "ol": {
                const tag = b.type;
                let pos = from, html = "<" + tag + ">";
                (b.items || []).forEach((it, i) => {
                    html += "<li>" + renderInlines(it, pos, mapped) + "</li>";
                    pos += inlinesText(it).length + (i < b.items.length - 1 ? 1 : 0);
                });
                return html + "</" + tag + ">";
            }
            case "quote": {
                let pos = from, html = "<blockquote>";
                (b.blocks || []).forEach((inner, i) => {
                    html += renderBlock(inner, pos, mapped);
                    pos += blockText(inner).length + (i < b.blocks.length - 1 ? 1 : 0);
                });
                return html + "</blockquote>";
            }
            case "table": {
                const rows = b.rows || [];
                if (!rows.length) return "";
                let html = "<table><thead><tr>";
                rows[0].forEach(c => { html += "<th>" + esc(c) + "</th>"; });
                html += "</tr></thead><tbody>";
                for (let r = 1; r < rows.length; r++) {
                    html += "<tr>";
                    rows[r].forEach(c => { html += "<td>" + esc(c) + "</td>"; });
                    html += "</tr>";
                }
                return html + "</tbody></table>";
            }
            default: return "<p>" + (body() || caretHole()) + "</p>";
        }
    }
    function html(doc) {
        doc = doc || state;
        return (doc.blocks || []).map(b => renderBlock(b, 0, false)).join("\n");
    }
    function previewHTML(doc) {
        doc = doc || state;
        const ix = index(doc);
        return (doc.blocks || []).map((b, i) => renderBlock(b, ix[i] ? ix[i].from : 0, true)).join("\n");
    }

    /* ---- ops ------------------------------------------------------------- */
    function splitInlines(ins, offset) {
        /* Do not merge after the cut. mergeInlines would glue the two halves
           back because they still share marks, and applyMarkToInlines would
           then skip the run (a >= lo && b <= hi fails). That was the
           "**abc **" / trailing-space no-op. Merge only after the mark is applied. */
        let o = 0;
        const out = [];
        for (const r of ins || []) {
            if (r.type === "image") { out.push(r); o += (r.text || "").length; continue; }
            const n = (r.text || "").length;
            if (offset > o && offset < o + n) {
                const k = offset - o;
                out.push({ ...r, text: r.text.slice(0, k) });
                out.push({ ...r, text: r.text.slice(k) });
            } else out.push(r);
            o += n;
        }
        return out;
    }
    function applyMarkToInlines(ins, lo, hi, mark, remove) {
        if (lo === hi) return ins;
        ins = splitInlines(ins, lo);
        ins = splitInlines(ins, hi);
        let o = 0;
        const out = [];
        for (const r of ins) {
            const n = (r.text || "").length;
            const a = o, b = o + n;
            o = b;
            if (n && a >= lo && b <= hi && r.type !== "image") {
                const set = new Set(r.marks);
                if (remove) set.delete(mark); else set.add(mark);
                out.push({ ...r, marks: [...set].sort() });
            } else out.push(r);
        }
        return mergeInlines(out);
    }
    function walkCharRuns(doc, from, to, fn) {
        const ix = index(doc);
        for (const b of ix) {
            if (to <= b.from || from >= b.to) continue;
            const lo = Math.max(0, from - b.from);
            const hi = Math.min(b.text.length, to - b.from);
            const block = doc.blocks[b.i];
            if (block.inlines) fn(block, lo, hi, "inlines");
            else if (block.items) {
                let o = 0;
                block.items.forEach((it, k) => {
                    const n = inlinesText(it).length;
                    const a = o, c = o + n;
                    o = c + (k < block.items.length - 1 ? 1 : 0);
                    const rlo = Math.max(0, lo - a);
                    const rhi = Math.min(n, hi - a);
                    if (rhi > rlo) fn(block, rlo, rhi, "item", k);
                });
            }
        }
    }
    function rangeFullyMarked(from, to, mark) {
        if (from === to) return false;
        let ok = true, any = false;
        walkCharRuns(state, from, to, (block, lo, hi, kind, item) => {
            const ins = kind === "item" ? block.items[item] : block.inlines;
            let o = 0;
            for (const r of ins || []) {
                const n = (r.text || "").length;
                const a = o, b = o + n;
                o = b;
                const s = Math.max(a, lo), e = Math.min(b, hi);
                if (e > s) {
                    any = true;
                    if (!(r.marks || []).includes(mark)) ok = false;
                }
            }
        });
        return any && ok;
    }

    function trimRange(from, to) {
        const text = docText(state);
        while (from < to && /\s/.test(text[from])) from++;
        while (to > from && /\s/.test(text[to - 1])) to--;
        return { from, to };
    }
    function trimSelWs() {
        sel = trimRange(sel.from, sel.to);
    }

    function toggleMark(mark) {
        trimSelWs();
        let { from, to } = sel;
        if (from === to) return;
        const remove = rangeFullyMarked(from, to, mark);
        walkCharRuns(state, from, to, (block, lo, hi, kind, item) => {
            if (kind === "item") block.items[item] = applyMarkToInlines(block.items[item], lo, hi, mark, remove);
            else block.inlines = applyMarkToInlines(block.inlines, lo, hi, mark, remove);
        });
    }

    function blocksOverlapping(from, to) {
        const ix = index(state);
        const out = [];
        for (const b of ix) {
            if (to < b.from || from > b.to) continue;
            if (from === to && from === b.from && b.i > 0 && from === ix[b.i - 1].to + 1) continue;
            out.push(b);
        }
        if (!out.length && ix.length) out.push(ix[locAt(state, from).block] || ix[0]);
        return out;
    }

    function convertBlockToP(i) {
        const block = state.blocks[i];
        if (!block || block.type === "p") return;
        if (block.type === "quote" && block.blocks && block.blocks.length) {
            state.blocks.splice(i, 1, ...block.blocks);
            return;
        }
        if (block.items) {
            state.blocks[i] = { type: "p", inlines: mergeInlines(block.items.flat()) };
            return;
        }
        if (block.type === "pre") {
            state.blocks[i] = { type: "p", inlines: parseInlines(block.text || "") };
            return;
        }
        if (block.inlines) {
            block.type = "p";
            return;
        }
        state.blocks[i] = { type: "p", inlines: [] };
    }

    function toggleBlock(type) {
        const { from, to } = sel;
        const hit = blocksOverlapping(from, to);
        if (!hit.length) return;
        const indices = hit.map(b => b.i).sort((a, b) => b - a);
        if (type === "p" || indices.every(i => state.blocks[i].type === type)) {
            indices.forEach(i => convertBlockToP(i));
            return;
        }
        hit.forEach(b => {
            const block = state.blocks[b.i];
            if (type === "ul" || type === "ol") {
                if (block.inlines) state.blocks[b.i] = { type, items: [block.inlines] };
                else if (block.items) block.type = type;
                else state.blocks[b.i] = { type, items: [[{ text: blockText(block), marks: [] }]] };
            } else if (type === "quote") {
                state.blocks[b.i] = { type: "quote", blocks: [{
                    type: block.type, inlines: block.inlines, items: block.items,
                    text: block.text, rows: block.rows, lang: block.lang
                }] };
            } else if (type === "pre") {
                state.blocks[b.i] = { type: "pre", lang: "", text: blockText(block) };
            } else if (block.inlines) {
                block.type = type;
            } else {
                state.blocks[b.i] = { type, inlines: parseInlines(blockText(block)) };
            }
        });
    }

    function runAt(pos) {
        const loc = locAt(state, pos);
        const block = state.blocks[loc.block];
        if (!block || !block.inlines) return null;
        let o = 0;
        for (const r of block.inlines) {
            const n = (r.text || "").length;
            if (pos - index(state)[loc.block].from < o + n || o + n === blockText(block).length) {
                if (index(state)[loc.block].from + o + n >= pos) return r;
            }
            o += n;
        }
        return block.inlines[block.inlines.length - 1] || null;
    }

    function marksAt(from, to) {
        from = from === undefined ? sel.from : from;
        to = to === undefined ? sel.to : to;
        if (from !== to) {
            const t = trimRange(from, to);
            from = t.from;
            to = t.to;
        }
        if (from === to) {
            const p = from > 0 ? from - 1 : from;
            const r = runContaining(p);
            return new Set(r ? r.marks || [] : []);
        }
        const counts = { bold: 0, italic: 0, underline: 0, strike: 0, code: 0 };
        let chars = 0;
        walkCharRuns(state, from, to, (block, lo, hi, kind, item) => {
            const ins = kind === "item" ? block.items[item] : block.inlines;
            let o = 0;
            for (const r of ins || []) {
                const n = (r.text || "").length;
                const a = o, b = o + n;
                o = b;
                const s = Math.max(a, lo), e = Math.min(b, hi);
                if (e > s) {
                    chars += e - s;
                    (r.marks || []).forEach(m => { if (counts[m] !== undefined) counts[m] += e - s; });
                }
            }
        });
        const set = new Set();
        Object.keys(counts).forEach(m => { if (chars && counts[m] === chars) set.add(m); });
        return set;
    }
    function runContaining(pos) {
        const loc = locAt(state, pos);
        const ix = index(state)[loc.block];
        if (!ix) return null;
        const block = state.blocks[loc.block];
        if (!block.inlines) return null;
        let o = 0;
        for (const r of block.inlines) {
            const n = (r.text || "").length;
            if (loc.offset >= o && loc.offset < o + n) return r;
            if (loc.offset === o + n && o + n === inlinesText(block.inlines).length) return r;
            o += n;
        }
        return null;
    }
    function blockTypeAt(pos) {
        const loc = locAt(state, pos === undefined ? sel.from : pos);
        return (state.blocks[loc.block] || {}).type || "p";
    }

    function deleteRange(from, to) {
        if (from === to) return from;
        if (from > to) { const t = from; from = to; to = t; }
        /* character-wise across blocks: rebuild blocks */
        const text = docText(state);
        const next = text.slice(0, from) + text.slice(to);
        /* keep block structure by deleting inside blocks then dropping empties */
        const ix = index(state).slice();
        for (let k = ix.length - 1; k >= 0; k--) {
            const b = ix[k];
            if (to <= b.from || from >= b.to) continue;
            const lo = Math.max(0, from - b.from);
            const hi = Math.min(b.text.length, to - b.from);
            const block = state.blocks[b.i];
            if (block.inlines) block.inlines = spliceInlines(block.inlines, lo, hi, "");
            else if (block.text != null) block.text = (block.text || "").slice(0, lo) + (block.text || "").slice(hi);
        }
        mergeEmpty();
        return from;
    }
    function spliceInlines(ins, lo, hi, insert, marks) {
        ins = splitInlines(ins, lo);
        ins = splitInlines(ins, hi);
        let o = 0;
        const out = [];
        let placed = false;
        for (const r of ins) {
            const n = (r.text || "").length;
            const a = o, b = o + n;
            o = b;
            if (b <= lo || a >= hi) {
                if (!placed && a >= hi && insert) {
                    out.push({ text: insert, marks: marksOf({ marks: marks || r.marks }) });
                    placed = true;
                }
                out.push(r);
            }
        }
        if (!placed && insert) out.push({ text: insert, marks: marksOf({ marks: marks || [] }) });
        return mergeInlines(out);
    }
    function docText(doc) {
        return index(doc).map(b => b.text).join("\n");
    }
    function mergeEmpty() {
        state.blocks = state.blocks.filter((b, i) => {
            if (state.blocks.length === 1) return true;
            if (b.type === "hr" || b.type === "pre" || b.type === "table") return true;
            return blockText(b).length > 0 || i === 0;
        });
        if (!state.blocks.length) state = empty();
    }

    function insertText(text) {
        let { from, to } = sel;
        if (from !== to) from = deleteRange(from, to);
        const parts = String(text || "").split("\n");
        const leftMarks = (runContaining(from > 0 ? from - 1 : from) || {}).marks || [];
        const loc = locAt(state, from);
        const block = state.blocks[loc.block];
        if (block.inlines) {
            block.inlines = spliceInlines(block.inlines, loc.offset, loc.offset, parts[0], leftMarks);
        } else if (block.text != null) {
            block.text = (block.text || "").slice(0, loc.offset) + parts[0] + (block.text || "").slice(loc.offset);
        }
        let pos = from + parts[0].length;
        for (let p = 1; p < parts.length; p++) {
            setSelection(pos, pos);
            splitBlock();
            pos = sel.from;
            const loc2 = locAt(state, pos);
            const bl = state.blocks[loc2.block];
            if (bl.inlines) bl.inlines = spliceInlines(bl.inlines, loc2.offset, loc2.offset, parts[p], leftMarks);
            pos += parts[p].length;
        }
        setSelection(pos, pos);
    }

    function splitBlock() {
        const { from } = sel;
        const loc = locAt(state, from);
        const block = state.blocks[loc.block];
        if (!block.inlines) {
            state.blocks.splice(loc.block + 1, 0, { type: "p", inlines: [] });
            setSelection(from + 1, from + 1);
            return;
        }
        const ins = splitInlines(block.inlines, loc.offset);
        const left = [], right = [];
        let o = 0;
        for (const r of ins) {
            const n = (r.text || "").length;
            if (o + n <= loc.offset) left.push(r);
            else if (o >= loc.offset) right.push(r);
            o += n;
        }
        block.inlines = mergeInlines(left);
        const newType = /^h[1-6]$/.test(block.type) ? "p" : (block.type === "p" ? "p" : "p");
        state.blocks.splice(loc.block + 1, 0, { type: newType, inlines: mergeInlines(right) });
        setSelection(from + 1, from + 1);
    }

    function deleteBackward() {
        let { from, to } = sel;
        if (from !== to) { setSelection(deleteRange(from, to)); return; }
        if (from <= 0) return;
        const loc = locAt(state, from);
        if (loc.offset === 0 && loc.block > 0) {
            const prev = state.blocks[loc.block - 1];
            const cur = state.blocks[loc.block];
            const joinAt = blockText(prev).length;
            if (prev.inlines && cur.inlines) {
                prev.inlines = mergeInlines(prev.inlines.concat(cur.inlines));
                state.blocks.splice(loc.block, 1);
                setSelection(index(state)[loc.block - 1].from + joinAt);
            } else {
                deleteRange(from - 1, from);
                setSelection(from - 1);
            }
            return;
        }
        deleteRange(from - 1, from);
        setSelection(from - 1);
    }
    function deleteForward() {
        let { from, to } = sel;
        if (from !== to) { setSelection(deleteRange(from, to)); return; }
        const n = totalLen(state);
        if (from >= n) return;
        deleteRange(from, from + 1);
        setSelection(from);
    }

    function load(md) {
        state = parse(md);
        const n = totalLen(state);
        sel = { from: clamp(sel.from, 0, n), to: clamp(sel.to, 0, n) };
        return state;
    }

    /* ---- caret map ------------------------------------------------------- */
    function domPointToDoc(root, node, offset) {
        if (!root || !node) return 0;
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const holder = el && el.closest ? el.closest("[data-from]") : null;
        if (holder && root.contains(holder)) {
            const base = +holder.getAttribute("data-from");
            try {
                const prefix = document.createRange();
                prefix.selectNodeContents(holder);
                prefix.setEnd(node, offset);
                return base + prefix.toString().length;
            } catch (e) { return base; }
        }
        const spans = root.querySelectorAll("[data-from]");
        if (!spans.length) return 0;
        return +spans[spans.length - 1].getAttribute("data-to") || 0;
    }
    function readPreviewSelection(root) {
        if (typeof window === "undefined") return sel;
        const s = window.getSelection();
        if (!s.rangeCount || !root.contains(s.anchorNode)) return sel;
        const r = s.getRangeAt(0);
        let a = domPointToDoc(root, r.startContainer, r.startOffset);
        let b = domPointToDoc(root, r.endContainer, r.endOffset);
        setSelection(a, b);
        return sel;
    }
    function docPointToDom(root, pos) {
        const spans = [...root.querySelectorAll("[data-from]")];
        if (!spans.length) return null;
        for (let i = 0; i < spans.length; i++) {
            const a = +spans[i].getAttribute("data-from");
            const b = +spans[i].getAttribute("data-to");
            if (pos < a || pos > b) continue;
            if (pos === b && i < spans.length - 1 && +spans[i + 1].getAttribute("data-from") === pos) continue;
            let remain = pos - a;
            const walker = document.createTreeWalker(spans[i], NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
                if (remain <= n.length) return { node: n, offset: remain };
                remain -= n.length;
            }
            const texts = spans[i].querySelectorAll ? null : null;
            return { node: spans[i], offset: 0 };
        }
        const last = spans[spans.length - 1];
        const walker = document.createTreeWalker(last, NodeFilter.SHOW_TEXT);
        let n, lastText = null;
        while ((n = walker.nextNode())) lastText = n;
        if (lastText) return { node: lastText, offset: lastText.length };
        return null;
    }
    function restorePreviewSelection(root) {
        if (typeof window === "undefined") return;
        const a = docPointToDom(root, sel.from);
        const b = docPointToDom(root, sel.to);
        if (!a || !b) return;
        try {
            const r = document.createRange();
            r.setStart(a.node, a.offset);
            r.setEnd(b.node, b.offset);
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(r);
        } catch (e) { /* layout not ready */ }
    }

    return {
        empty, parse, load, get,
        toMarkdown, html, previewHTML,
        selection, setSelection,
        toggleMark, toggleBlock,
        insertText, splitBlock, deleteBackward, deleteForward, deleteRange,
        marksAt, blockTypeAt, totalLen: () => totalLen(state),
        readPreviewSelection, restorePreviewSelection,
        MARK_TAG, TAG_MARK
    };
})();
