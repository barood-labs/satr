/* Satr core: detect & fix Arabic RTL problems in subtitle files (SRT / WebVTT).
   Pure functions, no dependencies. Works in the browser and in Node. */
(function (root) {
  const RLM = "\u200F";
  const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LAT = /[A-Za-z]/;
  const BIDI_CTRL = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
  const MAX_CHARS = 42, MAX_CPS = 17;

  function parse(text) {
    const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const isVtt = /^WEBVTT/.test(src);
    const blocks = src.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    const cues = [];
    let header = null;
    for (const b of blocks) {
      const lines = b.split("\n");
      const ti = lines.findIndex(l => l.includes("-->"));
      if (ti === -1) { if (isVtt && !header) header = b; continue; }
      const m = lines[ti].match(/(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/);
      const t = (h, mi, s, ms) => (parseInt(h || "0") * 3600 + +mi * 60 + +s) + +ms / 1000;
      cues.push({
        id: ti > 0 ? lines.slice(0, ti).join("\n") : String(cues.length + 1),
        timing: lines[ti],
        start: m ? t(m[1] && m[1].slice(0, -1), m[2], m[3], m[4]) : 0,
        end: m ? t(m[5] && m[5].slice(0, -1), m[6], m[7], m[8]) : 0,
        lines: lines.slice(ti + 1)
      });
    }
    return { format: isVtt ? "vtt" : "srt", header, cues };
  }

  function serialize(doc) {
    const body = doc.cues.map(c => [c.id, c.timing, ...c.lines].join("\n")).join("\n\n");
    return (doc.format === "vtt" ? (doc.header || "WEBVTT") + "\n\n" : "") + body + "\n";
  }

  // Each rule: id, label (EN / AR), test(line) -> bool, fix(line) -> line
  const RULES = [
    { id: "lookalike", en: "Persian/Urdu look-alike letters (ی ک) instead of Arabic (ي ك)", ar: "حروف فارسية بدل العربية",
      test: l => /[\u06CC\u06A9]/.test(l), fix: l => l.replace(/\u06CC/g, "\u064A").replace(/\u06A9/g, "\u0643") },
    { id: "tatweel", en: "Tatweel (ـ) stretching breaks search and line width", ar: "تطويل زائد",
      test: l => /\u0640/.test(l), fix: l => l.replace(/\u0640/g, "") },
    { id: "latin-punct", en: "Latin , ? ; used in Arabic text (should be ، ؟ ؛)", ar: "علامات ترقيم لاتينية",
      test: l => AR.test(l) && /[\u0600-\u06FF]\s*[,?;]|[,?;]\s*[\u0600-\u06FF]/.test(l),
      fix: l => l.replace(/([\u0600-\u06FF][\u0600-\u06FF\s]*?)\s*([,?;])/g, (m, a, p) => a.replace(/\s+$/, "") + { ",": "\u060C", "?": "\u061F", ";": "\u061B" }[p]) },
    { id: "space-punct", en: "Space before punctuation / double spaces", ar: "مسافات زائدة",
      test: l => /\s[\u060C\u061F\u061B.!:]|\s{2,}/.test(l.replace(BIDI_CTRL, "")),
      fix: l => l.replace(/\s+([\u060C\u061F\u061B.!:])/g, "$1").replace(/ {2,}/g, " ") },
    { id: "bidi-edge", en: "Punctuation or English at line edge will jump to the wrong side", ar: "علامات الترقيم تقفز للجهة الخطأ",
      test: l => AR.test(l) && !(l.startsWith(RLM) && l.endsWith(RLM)) &&
        (/^[\s\p{P}\p{S}\d A-Za-z-]/u.test(l.replace(BIDI_CTRL, "")) || /[\p{P}\p{S}\dA-Za-z]$/u.test(l.replace(BIDI_CTRL, ""))),
      fix: l => RLM + l.replace(BIDI_CTRL, "") + RLM }
  ];

  function fixLine(line, enabled) {
    if (!AR.test(line)) return { line, hits: [] };
    let out = line; const hits = [];
    for (const r of RULES) {
      if (enabled && !enabled[r.id]) continue;
      if (r.test(out)) { out = r.fix(out); hits.push(r.id); }
    }
    return { line: out, hits };
  }

  function analyze(text, enabled) {
    const doc = parse(text);
    const counts = Object.fromEntries(RULES.map(r => [r.id, 0]));
    const warnings = [];
    const rows = doc.cues.map((c, i) => {
      const fixed = c.lines.map(l => fixLine(l, enabled));
      fixed.forEach(f => f.hits.forEach(h => counts[h]++));
      const plain = c.lines.join(" ").replace(BIDI_CTRL, "");
      const dur = Math.max(0.001, c.end - c.start);
      const cps = plain.replace(/\s/g, "").length / dur;
      const longest = Math.max(...c.lines.map(l => l.replace(BIDI_CTRL, "").length), 0);
      const w = [];
      if (longest > MAX_CHARS) w.push({ id: "long", en: `Line has ${longest} chars (max ${MAX_CHARS})`, ar: "سطر طويل" });
      if (cps > MAX_CPS) w.push({ id: "fast", en: `Reading speed ${cps.toFixed(1)} chars/sec (max ${MAX_CPS})`, ar: "سرعة قراءة عالية" });
      w.forEach(x => warnings.push({ cue: i, ...x }));
      return { index: i, id: c.id, timing: c.timing, before: c.lines, after: fixed.map(f => f.line), hits: [...new Set(fixed.flatMap(f => f.hits))], warnings: w };
    });
    const fixedDoc = { ...doc, cues: doc.cues.map((c, i) => ({ ...c, lines: rows[i].after })) };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { format: doc.format, cueCount: doc.cues.length, counts, total, warnings, rows, output: serialize(fixedDoc) };
  }

  const api = { parse, serialize, analyze, fixLine, RULES, RLM };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Satr = api;
})(typeof window !== "undefined" ? window : globalThis);
