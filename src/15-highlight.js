// ============================================================================
// HIGHLIGHT — syntax colouring for fenced code. No DOM, no dependencies.
//
// tokens(text, lang) cuts the text into runs that join back to exactly the
// text; html() escapes them and wraps the coloured runs in <span class="hl-*">.
// The caret map only counts text under a block's data-from span, so these
// spans do not move the caret. Unknown languages come back as one plain run.
//
// Classes: k keyword, s string, c comment, n number/constant, v variable,
// f command/function, t type/tag, a attribute/flag/key, h diff header,
// ins / del diff lines.
// ============================================================================
const Highlight = (() => {
    const ALIASES = {
        shell: "shell", sh: "shell", bash: "shell", zsh: "shell", ksh: "shell", console: "shell", shellsession: "shell",
        powershell: "powershell", ps1: "powershell", psm1: "powershell", pwsh: "powershell", ps: "powershell",
        javascript: "js", js: "js", jsx: "js", mjs: "js", cjs: "js", typescript: "js", ts: "js", tsx: "js",
        json: "json", jsonc: "json", json5: "json",
        python: "python", py: "python", python3: "python",
        css: "css", scss: "css", less: "css",
        html: "markup", htm: "markup", xhtml: "markup", xml: "markup", svg: "markup",
        sql: "sql", mysql: "sql", pgsql: "sql", postgres: "sql", postgresql: "sql", sqlite: "sql", tsql: "sql", plsql: "sql",
        yaml: "yaml", yml: "yaml",
        diff: "diff", patch: "diff",
        c: "clike", h: "clike", cpp: "clike", "c++": "clike", cc: "clike", cxx: "clike", hpp: "clike",
        cs: "clike", csharp: "clike", "c#": "clike", java: "clike", go: "clike", golang: "clike",
        rust: "clike", rs: "clike", kotlin: "clike", kt: "clike", swift: "clike", scala: "clike", dart: "clike"
    };

    /* The code-language picker. Value is what goes after ``` in the file. */
    const CHOICES = [
        ["", "Plain text"], ["shell", "Shell"], ["powershell", "PowerShell"],
        ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["json", "JSON"],
        ["python", "Python"], ["css", "CSS"], ["html", "HTML"], ["xml", "XML"],
        ["sql", "SQL"], ["yaml", "YAML"], ["diff", "Diff"],
        ["c", "C"], ["cpp", "C++"], ["csharp", "C#"], ["java", "Java"], ["go", "Go"], ["rust", "Rust"]
    ];

    const words = s => new Set(s.split(/\s+/).filter(Boolean));

    function canonical(lang) {
        return ALIASES[String(lang || "").trim().toLowerCase()] || "";
    }

    /* ---- context tests ---------------------------------------------------- */
    const isWordChar = ch => !!ch && /[\w$]/.test(ch);
    const notWordBefore = (t, i) => !isWordChar(t[i - 1]);
    const lineStart = (t, i) => i === 0 || t[i - 1] === "\n";
    const afterSpace = (t, i) => i === 0 || /\s/.test(t[i - 1]);
    const onlyIndentBefore = (t, i) => /^[ \t]*$/.test(t.slice(t.lastIndexOf("\n", i - 1) + 1, i));
    function followedBy(re, t, at) {
        re.lastIndex = at;
        return re.test(t);
    }
    const CALL = /[ \t]*\(/y;
    const isCall = (t, end) => followedBy(CALL, t, end);
    function prevNonSpace(t, i, crossLines) {
        let j = i - 1;
        while (j >= 0 && (t[j] === " " || t[j] === "\t" || (crossLines && (t[j] === "\n" || t[j] === "\r")))) j--;
        return j;
    }

    /* ---- shell ------------------------------------------------------------ */
    const SHELL_KW = words("if then else elif fi for while until do done case esac in function return local export select break continue declare readonly unset shift trap source alias");
    const SHELL_CMD_PREFIX = words("then do else sudo time exec xargs env if elif while until nohup command builtin");
    function shellCommandPosition(t, i) {
        const j = prevNonSpace(t, i, false);
        if (j < 0 || "\n|;&(`{!".includes(t[j])) return true;
        if (t[j] === "$" && lineStart(t, j)) return true;           /* "$ npm install" prompt */
        const m = /(^|[^\w-])([A-Za-z]+)$/.exec(t.slice(Math.max(0, j - 16), j + 1));
        return !!m && SHELL_CMD_PREFIX.has(m[2]);
    }
    function shellWord(w, t, i) {
        if (SHELL_KW.has(w)) return "k";
        if (t[i + w.length] === "=") return "v";
        return shellCommandPosition(t, i) ? "f" : null;
    }

    /* ---- PowerShell ------------------------------------------------------- */
    const PS_KW = words("if else elseif foreach for while do until switch function filter param return begin process end try catch finally throw trap break continue in class enum using exit");
    const PS_OPS = words("eq ne gt ge lt le like notlike match notmatch contains notcontains in notin replace and or not xor is isnot as split join f band bor ieq ine ceq cne ilike clike imatch cmatch");
    function psWord(w) {
        if (w.includes("-")) return "f";
        return PS_KW.has(w.toLowerCase()) ? "k" : null;
    }

    /* ---- JavaScript / TypeScript ------------------------------------------ */
    const JS_KW = words("break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch throw try typeof var void while with yield async await get set interface type enum implements namespace declare readonly as keyof abstract private protected public");
    const JS_CONST = words("true false null undefined NaN Infinity this");
    function jsWord(w, t, i) {
        if (JS_KW.has(w)) return "k";
        if (JS_CONST.has(w)) return "n";
        return isCall(t, i + w.length) ? "f" : null;
    }

    /* ---- Python ----------------------------------------------------------- */
    const PY_KW = words("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case");
    const PY_CONST = words("True False None self cls");
    const PY_BUILTIN = words("print len range open str int float list dict set tuple bool type isinstance enumerate zip map filter sorted sum min max abs super input repr iter next any all getattr setattr hasattr");
    function pyWord(w, t, i) {
        if (PY_KW.has(w)) return "k";
        if (PY_CONST.has(w)) return "n";
        return PY_BUILTIN.has(w) || isCall(t, i + w.length) ? "f" : null;
    }

    /* ---- CSS -------------------------------------------------------------- */
    const CSS_PROP = /[ \t]*:/y;
    const CSS_SELECTOR = /[^;{}]{0,200}\{/y;
    function cssWord(w, t, i) {
        const j = prevNonSpace(t, i, true);
        if (followedBy(CSS_PROP, t, i + w.length) && j >= 0 && "{;".includes(t[j])) return "a";
        if (j >= 0 && t[j] === ":") return null;
        return followedBy(CSS_SELECTOR, t, i) ? "t" : null;
    }

    /* ---- HTML / XML ------------------------------------------------------- */
    function tagTokens(s) {
        const head = /^<\/?[A-Za-z][\w:.-]*/.exec(s)[0];
        const out = [{ text: head, cls: "t" }];
        const re = /(\s+)|([^\s=\/>"']+)|(=)|("[^"]*"|'[^']*')|(\/?>)|([\s\S])/g;
        re.lastIndex = head.length;
        let m;
        while ((m = re.exec(s))) {
            const cls = m[2] ? "a" : m[4] ? "s" : m[5] ? "t" : null;
            out.push({ text: m[0], cls });
        }
        return out;
    }

    /* ---- SQL -------------------------------------------------------------- */
    const SQL_KW = words("select from where and or not in is null as on join inner left right full outer cross group by order having limit offset insert into values update set delete create table view index alter drop add column primary key foreign references unique default distinct union all case when then else end exists between like ilike asc desc with returning begin commit rollback transaction grant revoke truncate if replace temporary temp cascade constraint check");
    function sqlWord(w, t, i) {
        if (SQL_KW.has(w.toLowerCase())) return "k";
        return isCall(t, i + w.length) ? "f" : null;
    }

    /* ---- YAML ------------------------------------------------------------- */
    const yamlKeyPosition = (t, i) => /^[ \t]*(?:-[ \t]+)*$/.test(t.slice(t.lastIndexOf("\n", i - 1) + 1, i));
    const yamlValueStart = (t, i) => i === 0 || /[\s\[,:{]/.test(t[i - 1]);

    /* ---- C family (C, C++, C#, Java, Go, Rust, Kotlin, Swift) ------------- */
    const C_KW = words("if else for while do switch case default break continue return goto sizeof typedef struct union enum class interface extends implements new delete public private protected static const final virtual override abstract namespace using import package try catch finally throw throws async await yield template typename this operator inline extern volatile register mutable explicit friend fn let mut impl pub use mod match trait where loop move ref dyn unsafe crate func go defer chan select type var range map fallthrough val when object companion data sealed open internal fun lateinit guard struct protocol extension init deinit self super in is as out lock foreach get set readonly sealed record");
    const C_TYPES = words("int long short char void float double bool boolean byte unsigned signed size_t string String var auto u8 u16 u32 u64 u128 i8 i16 i32 i64 i128 f32 f64 usize isize str rune uint uint8 uint16 uint32 uint64 int8 int16 int32 int64 float32 float64 error any object dynamic decimal Self Vec Option Result");
    const C_CONST = words("true false null nil nullptr NULL None Some Ok Err");
    function clikeWord(w, t, i) {
        if (w.endsWith("!")) return "f";
        if (C_CONST.has(w)) return "n";
        if (C_TYPES.has(w)) return "t";
        if (C_KW.has(w)) return "k";
        if (isCall(t, i + w.length)) return "f";
        return /^[A-Z][a-z]/.test(w) ? "t" : null;
    }

    /* ---- rules ------------------------------------------------------------ */
    /* { re: sticky regex, cls: class | fn(match, text, index), when?: fn(text, index),
         sub?: fn(match) -> tokens }. First match at the position wins. */
    const NUM = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)/y;
    const BLOCK_COMMENT = /\/\*[\s\S]*?(?:\*\/|$)/y;
    const LINE_COMMENT = /\/\/.*/y;
    const DQ_LINE = /"(?:\\.|[^"\\\n])*"/y;
    const SQ_LINE = /'(?:\\.|[^'\\\n])*'/y;

    const RULES = {
        shell: [
            { re: /#.*/y, cls: "c", when: (t, i) => i === 0 || /[\s;|&(]/.test(t[i - 1]) },
            { re: /"(?:\\[\s\S]|[^"\\])*"/y, cls: "s" },
            { re: /'[^']*'/y, cls: "s" },
            { re: /\$(?:\{[^}\n]*\}|[A-Za-z_]\w*|[0-9@#?$!*-])/y, cls: "v" },
            { re: /--?[A-Za-z][\w-]*/y, cls: "a", when: afterSpace },
            { re: /\d+/y, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_][\w.+-]*/y, cls: shellWord }
        ],
        powershell: [
            { re: /<#[\s\S]*?(?:#>|$)/y, cls: "c" },
            { re: /#.*/y, cls: "c" },
            { re: /@"[\s\S]*?(?:\n"@|$)/y, cls: "s" },
            { re: /@'[\s\S]*?(?:\n'@|$)/y, cls: "s" },
            { re: /"(?:`[\s\S]|""|[^"`])*"/y, cls: "s" },
            { re: /'(?:''|[^'])*'/y, cls: "s" },
            { re: /\$(?:\{[^}\n]*\}|[A-Za-z_]\w*(?::[A-Za-z_]\w*)?|[$?^_])/y, cls: "v" },
            { re: /\[[A-Za-z_][\w.]*(?:\[\])?\]/y, cls: "t" },
            { re: /-[A-Za-z]\w*/y, cls: w => PS_OPS.has(w.slice(1).toLowerCase()) ? "k" : "a", when: notWordBefore },
            { re: NUM, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_]\w*(?:-[A-Za-z]\w*)?/y, cls: psWord }
        ],
        js: [
            { re: LINE_COMMENT, cls: "c" },
            { re: BLOCK_COMMENT, cls: "c" },
            { re: DQ_LINE, cls: "s" },
            { re: SQ_LINE, cls: "s" },
            { re: /`(?:\\[\s\S]|[^`\\])*`/y, cls: "s" },
            { re: NUM, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_$][\w$]*/y, cls: jsWord }
        ],
        json: [
            { re: LINE_COMMENT, cls: "c" },
            { re: DQ_LINE, cls: (m, t, i) => followedBy(/\s*:/y, t, i + m.length) ? "a" : "s" },
            { re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_]\w*/y, cls: w => (w === "true" || w === "false" || w === "null") ? "k" : null }
        ],
        python: [
            { re: /#.*/y, cls: "c" },
            { re: /(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, cls: "s", when: notWordBefore },
            { re: /(?:[rRbBuUfF]{1,2})?(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y, cls: "s", when: notWordBefore },
            { re: /@[A-Za-z_][\w.]*/y, cls: "f", when: onlyIndentBefore },
            { re: NUM, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_]\w*/y, cls: pyWord }
        ],
        css: [
            { re: BLOCK_COMMENT, cls: "c" },
            { re: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y, cls: "s" },
            { re: /@[\w-]+/y, cls: "k" },
            { re: /#[\da-fA-F]{3,8}(?![\w-])/y, cls: "n" },
            { re: /(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y, cls: "n", when: (t, i) => !/[\w-]/.test(t[i - 1] || "") },
            { re: /-{0,2}[A-Za-z_][\w-]*/y, cls: cssWord }
        ],
        markup: [
            { re: /<!--[\s\S]*?(?:-->|$)/y, cls: "c" },
            { re: /<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/y, cls: "s" },
            { re: /<![A-Za-z][^>]*>?/y, cls: "k" },
            { re: /<\?[\s\S]*?(?:\?>|$)/y, cls: "k" },
            { re: /<\/?[A-Za-z][\w:.-]*(?:[^<>"']|"[^"]*"|'[^']*')*\/?>?/y, sub: tagTokens },
            { re: /&(?:#\d+|#x[\da-fA-F]+|\w+);/y, cls: "n" }
        ],
        sql: [
            { re: /--.*/y, cls: "c" },
            { re: BLOCK_COMMENT, cls: "c" },
            { re: /'(?:''|[^'])*'/y, cls: "s" },
            { re: /"(?:""|[^"\n])*"|`[^`\n]*`/y, cls: "a" },
            { re: /@{1,2}\w+|\$\d+/y, cls: "v" },
            { re: NUM, cls: "n", when: notWordBefore },
            { re: /[A-Za-z_]\w*/y, cls: sqlWord }
        ],
        yaml: [
            { re: /#.*/y, cls: "c", when: afterSpace },
            { re: /(?:---|\.\.\.)(?=[ \t]*(?:\n|$))/y, cls: "h", when: lineStart },
            { re: /"(?:\\.|[^"\\\n])*"|'(?:''|[^'\n])*'/y, cls: "s" },
            { re: /[&*][\w-]+/y, cls: "v", when: afterSpace },
            { re: /!!?[\w-]*/y, cls: "t", when: afterSpace },
            { re: /[^\s#:"'\-][^\n:#]*?(?=[ \t]*:(?:[ \t]|\n|$))/y, cls: "a", when: yamlKeyPosition },
            { re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?=[ \t]*(?:#|\n|$|,|\]|\}))/y, cls: "n", when: yamlValueStart },
            { re: /(?:true|false|null|yes|no|on|off|~)(?=[ \t]*(?:#|\n|$|,|\]|\}))/iy, cls: "k", when: yamlValueStart }
        ],
        diff: [
            { re: /(?:diff |index |Index: |\+\+\+ |--- |={5,}).*/y, cls: "h", when: lineStart },
            { re: /@{2}.*/y, cls: "h", when: lineStart },   /* hunk; two @ written as {2}: build.js rejects the literal pair */
            { re: /[+>].*/y, cls: "ins", when: lineStart },
            { re: /[-<].*/y, cls: "del", when: lineStart },
            { re: /[^\n]+/y, cls: null }
        ],
        clike: [
            { re: LINE_COMMENT, cls: "c" },
            { re: BLOCK_COMMENT, cls: "c" },
            { re: /#[ \t]*[A-Za-z]+/y, cls: "k", when: onlyIndentBefore },
            { re: /[@$]?"(?:\\.|[^"\\\n])*"/y, cls: "s" },
            { re: /'(?:\\.|[^'\\\n]){1,8}'/y, cls: "s" },
            { re: /`[^`]*`/y, cls: "s" },
            { re: /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[uUlLfFdDmMiz]\w*)?/y, cls: "n", when: notWordBefore },
            { re: /@[A-Za-z_]\w*/y, cls: "f" },
            { re: /[A-Za-z_]\w*(?:!(?!=))?/y, cls: clikeWord }
        ]
    };

    function tokens(text, lang) {
        text = String(text == null ? "" : text);
        if (!text) return [];
        const rules = RULES[canonical(lang)];
        if (!rules) return [{ text, cls: null }];
        const out = [];
        let plain = "", i = 0;
        const push = (t, cls) => {
            if (!t) return;
            if (!cls) { plain += t; return; }
            if (plain) { out.push({ text: plain, cls: null }); plain = ""; }
            out.push({ text: t, cls });
        };
        scan: while (i < text.length) {
            for (const r of rules) {
                if (r.when && !r.when(text, i)) continue;
                r.re.lastIndex = i;
                const m = r.re.exec(text);
                if (!m || !m[0]) continue;
                if (r.sub) r.sub(m[0]).forEach(tok => push(tok.text, tok.cls));
                else push(m[0], typeof r.cls === "function" ? r.cls(m[0], text, i) : r.cls);
                i += m[0].length;
                continue scan;
            }
            plain += text[i++];
        }
        if (plain) out.push({ text: plain, cls: null });
        return out;
    }

    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function html(text, lang) {
        return tokens(text, lang)
            .map(t => t.cls ? "<span class=\"hl-" + t.cls + "\">" + esc(t.text) + "</span>" : esc(t.text))
            .join("");
    }

    return { tokens, html, canonical, CHOICES };
})();
