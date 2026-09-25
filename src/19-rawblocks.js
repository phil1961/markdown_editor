// ============================================================================
// RAW BLOCKS — the code fence or quote around a caret in the raw markdown.
// The raw pane edits text, not Doc. Each setter returns a splice
// { from, to, insert, map(pos) } (or null when there is nothing to change);
// map moves an old caret offset to where it belongs after the splice.
// No DOM: tested from dist/editor.cjs.
// ============================================================================
const RawBlocks = (() => {
    const ALERTS = ["note", "tip", "important", "warning", "caution"];
    const OPEN_FENCE = /^```([\w+#-]*)[ \t]*$/;

    function lines(text) {
        const out = [];
        let from = 0;
        String(text).split("\n").forEach(line => {
            out.push({ text: line, from, to: from + line.length });
            from += line.length + 1;
        });
        return out;
    }
    function lineIndexAt(ls, pos) {
        for (let k = 0; k < ls.length; k++) if (pos <= ls[k].to) return k;
        return ls.length - 1;
    }

    /* The closed fence whose opening..closing lines contain pos. */
    function fenceAt(text, pos) {
        const ls = lines(text);
        let open = null;
        for (const l of ls) {
            if (!open) {
                const m = OPEN_FENCE.exec(l.text);
                if (m) open = { from: l.from, to: l.to, lang: m[1] };
            } else if (/^```/.test(l.text)) {
                if (pos >= open.from && pos <= l.to) return { lineFrom: open.from, lineTo: open.to, lang: open.lang };
                open = null;
            }
        }
        return null;
    }

    function shiftAfter(from, to, insert) {
        const delta = insert.length - (to - from);
        return pos => pos <= from ? pos : pos >= to ? pos + delta : from + insert.length;
    }

    function setFenceLang(text, pos, lang) {
        const f = fenceAt(text, pos);
        if (!f) return null;
        const insert = "```" + String(lang || "").replace(/[^\w+#-]/g, "");
        const { lineFrom: from, lineTo: to } = f;
        const delta = insert.length - (to - from);
        return { from, to, insert, map: p => p <= from ? p : p >= to ? p + delta : Math.min(p + delta, from + insert.length) };
    }

    const depthOf = line => ((/^(?:>[ \t]?)*/.exec(line)[0].match(/>/g)) || []).length;
    const stripDepth = (line, d) => line.replace(new RegExp("^(?:>[ \\t]?){" + d + "}"), "");
    const marker = (d, kind) => "> ".repeat(d) + "[!" + kind.toUpperCase() + "]";

    /* The innermost quote on the caret's line: { kind, depth, first, markerLine }.
       kind is "" for a plain quote. Null when the line is not quoted. */
    function alertAt(text, pos) {
        const ls = lines(text);
        let k = lineIndexAt(ls, pos);
        const d = depthOf(ls[k].text);
        if (!d) return null;
        while (k > 0 && depthOf(ls[k - 1].text) >= d) k--;
        const m = /^\s*\[!(\w+)\]\s*$/.exec(stripDepth(ls[k].text, d));
        const kind = m && ALERTS.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "";
        return { kind, depth: d, first: ls[k], markerLine: kind ? ls[k] : null, all: ls };
    }

    function setAlert(text, from, to, kind) {
        kind = String(kind || "").toLowerCase();
        if (kind && !ALERTS.includes(kind)) return null;
        text = String(text);
        const q = alertAt(text, from);
        if (q) {
            if (q.markerLine) {
                const l = q.markerLine;
                if (kind) {
                    const insert = marker(q.depth, kind);
                    if (insert === l.text) return null;
                    return { from: l.from, to: l.to, insert, map: shiftAfter(l.from, l.to, insert) };
                }
                const end = Math.min(text.length, l.to + 1);
                return { from: l.from, to: end, insert: "", map: shiftAfter(l.from, end, "") };
            }
            if (!kind) return null;
            const insert = marker(q.depth, kind) + "\n";
            const at = q.first.from;
            return { from: at, to: at, insert, map: p => p < at ? p : p + insert.length };
        }
        /* Not in a quote: quote the selected lines, with the marker on top. */
        const ls = lines(text);
        const a = lineIndexAt(ls, from), b = lineIndexAt(ls, Math.max(from, to));
        const head = kind ? marker(1, kind) + "\n" : "";
        const quoted = ls.slice(a, b + 1).map(l => l.text ? "> " + l.text : ">");
        const start = ls[a].from, end = ls[b].to;
        const insert = head + quoted.join("\n");
        const map = p => {
            if (p < start) return p;
            if (p > end) return p + insert.length - (end - start);
            const k = lineIndexAt(ls, p);
            const added = head.length + (k - a + 1) * 2 - ls.slice(a, k + 1).filter(l => !l.text).length;
            return p + added;
        };
        return { from: start, to: end, insert, map };
    }

    return { fenceAt, setFenceLang, alertAt: (text, pos) => {
        const q = alertAt(text, pos);
        return q ? { kind: q.kind, depth: q.depth } : null;
    }, setAlert, ALERTS };
})();
