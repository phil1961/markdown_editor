// ============================================================================
// LOCATE — map a selection between the raw markdown and Doc's visible text
// (the offsets the preview uses). No DOM: tested from dist/editor.cjs.
//
// Raw → Doc: wrap the span in two private-use sentinels, parse, read where
// they land. Exact, unless the sentinels vanish (a word inside a URL) or
// change the parse; then the same-ordinal occurrence is used.
// Doc → raw: try raw occurrences of the same text, nearest the same ordinal
// first, and keep the one that maps back to exactly this Doc range.
// ============================================================================
const Locate = (() => {
    const OPEN = "\uE000", CLOSE = "\uE001";
    const WORD_CHAR = /[\p{L}\p{N}_'\u2019-]/u;
    const MAX_TRIES = 60;

    function visible(md) {
        return Doc.text(Doc.parse(md));
    }

    /* Trim a range to non-space; a collapsed caret grows to the word around it. */
    function span(text, from, to) {
        from = Math.max(0, Math.min(text.length, from | 0));
        to = Math.max(from, Math.min(text.length, to | 0));
        if (from === to) {
            while (from > 0 && WORD_CHAR.test(text[from - 1])) from--;
            while (to < text.length && WORD_CHAR.test(text[to])) to++;
        } else {
            while (from < to && /\s/.test(text[from])) from++;
            while (to > from && /\s/.test(text[to - 1])) to--;
        }
        return { from, to };
    }

    function hits(hay, needle) {
        const out = [];
        if (!needle) return out;
        for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) out.push(i);
        return out;
    }

    function ordinal(text, needle, at) {
        return hits(text, needle).filter(i => i < at).length;
    }

    function sameOrdinal(srcText, s, dstText) {
        const needle = srcText.slice(s.from, s.to);
        const list = hits(dstText, needle);
        if (!list.length) return null;
        const pos = list[Math.min(ordinal(srcText, needle, s.from), list.length - 1)];
        return { from: pos, to: pos + needle.length };
    }

    function exactRawToDoc(md, from, to, plain) {
        const marked = md.slice(0, from) + OPEN + md.slice(from, to) + CLOSE + md.slice(to);
        const t = visible(marked);
        const a = t.indexOf(OPEN), b = t.indexOf(CLOSE);
        if (a < 0 || b < a) return null;
        if (t.slice(0, a) + t.slice(a + 1, b) + t.slice(b + 1) !== plain) return null;
        return { from: a, to: b - 1 };
    }

    /* Raw selection → Doc range, or null when there is nothing to find. */
    function rawToDoc(md, from, to) {
        const s = span(md, from, to);
        if (s.from === s.to) return null;
        const plain = visible(md);
        const exact = exactRawToDoc(md, s.from, s.to, plain);
        if (exact && exact.from < exact.to) return exact;
        return sameOrdinal(md, s, plain);
    }

    /* Doc range → raw selection, or null when there is nothing to find. */
    function docToRaw(md, from, to) {
        const plain = visible(md);
        const s = span(plain, from, to);
        if (s.from === s.to) return null;
        const needle = plain.slice(s.from, s.to);
        const raw = hits(md, needle);
        if (!raw.length) return null;
        const k = ordinal(plain, needle, s.from);
        const order = raw.map((pos, i) => ({ pos, d: Math.abs(i - k) }))
            .sort((x, y) => x.d - y.d)
            .slice(0, MAX_TRIES);
        for (const { pos } of order) {
            const m = exactRawToDoc(md, pos, pos + needle.length, plain);
            if (m && m.from === s.from && m.to === s.to) return { from: pos, to: pos + needle.length };
        }
        return sameOrdinal(plain, s, md);
    }

    return { rawToDoc, docToRaw, span };
})();
