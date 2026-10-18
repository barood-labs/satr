#!/usr/bin/env node
/* Arabic RTL regression gate.
   For every subtitle in qa/corpus/ it checks Satr's output against the reviewed golden file in qa/expected/
   and enforces invariants: idempotent, cue count + timings preserved, English-only lines untouched,
   no bidi controls on non-Arabic lines.
   Writes qa-junit.xml (GitLab test report) and qa-report.md (posted to MRs by the Duo review flow).
   --update  regenerate golden files (a human must review the diff in the MR). */
"use strict";
const fs = require("fs");
const path = require("path");
const S = require("../src/satr.js");

const root = path.join(__dirname, "..");
const corpusDir = path.join(root, "qa/corpus"), expDir = path.join(root, "qa/expected");
const update = process.argv.includes("--update");
const AR = /[\u0600-\u06FF]/, BIDI = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
const show = s => JSON.stringify(s).replace(/\u200F/g, "\\u200F");

const files = fs.readdirSync(corpusDir).filter(f => /\.(srt|vtt)$/.test(f)).sort();
const cases = [];
const t0 = process.hrtime.bigint();
let cues = 0;
for (const f of files) {
  const input = fs.readFileSync(path.join(corpusDir, f), "utf8");
  const r = S.analyze(input);
  cues += r.cueCount;
  const fails = [];
  const expPath = path.join(expDir, f);
  if (update) fs.writeFileSync(expPath, r.output, "utf8");
  if (!fs.existsSync(expPath)) fails.push("missing golden file qa/expected/" + f + " (run: npm run qa:update)");
  else if (fs.readFileSync(expPath, "utf8") !== r.output) fails.push("output differs from golden file qa/expected/" + f);
  if (S.analyze(r.output).output !== r.output) fails.push("not idempotent: second pass changed the file");
  const inDoc = S.parse(input), outDoc = S.parse(r.output);
  if (inDoc.cues.length !== outDoc.cues.length) fails.push(`cue count changed ${inDoc.cues.length} -> ${outDoc.cues.length}`);
  inDoc.cues.forEach((c, i) => {
    const o = outDoc.cues[i]; if (!o) return;
    if (c.timing !== o.timing) fails.push(`cue ${i + 1}: timing changed`);
    c.lines.forEach((l, j) => {
      if (!AR.test(l) && o.lines[j] !== l) fails.push(`cue ${i + 1}: English/non-Arabic line was modified: ${show(l)} -> ${show(o.lines[j])}`);
      if (!AR.test(l) && BIDI.test(o.lines[j] || "")) fails.push(`cue ${i + 1}: bidi control added to non-Arabic line`);
    });
  });
  cases.push({ name: f, fails, fixes: r.total, counts: r.counts });
}
const secs = Number(process.hrtime.bigint() - t0) / 1e9;
const failed = cases.filter(c => c.fails.length);

const junit = [`<?xml version="1.0" encoding="UTF-8"?>`,
  `<testsuite name="arabic-rtl-regression" tests="${cases.length}" failures="${failed.length}" time="${secs.toFixed(4)}">`,
  ...cases.map(c => `  <testcase classname="qa.corpus" name="${esc(c.name)}">` +
    (c.fails.length ? `<failure message="${esc(c.fails[0])}">${esc(c.fails.join("\n"))}</failure>` : "") + `</testcase>`),
  `</testsuite>`].join("\n");
fs.writeFileSync(path.join(root, "qa-junit.xml"), junit, "utf8");

const md = [`### Arabic RTL regression — ${failed.length ? "❌ " + failed.length + " failing" : "✅ all " + cases.length + " passing"}`,
  `اختبار انحدار اتجاه النص العربي — ${failed.length ? "فشل " + failed.length : "نجحت كل الحالات (" + cases.length + ")"}`, "",
  "| Case | Fixes applied | Result |", "|---|---|---|",
  ...cases.map(c => `| ${c.name} | ${c.fixes} (${Object.entries(c.counts).filter(([, n]) => n).map(([k, n]) => k + "×" + n).join(", ") || "none"}) | ${c.fails.length ? "❌ " + c.fails.join("; ") : "✅"} |`),
  "", `${cues} cues processed in ${(secs * 1000).toFixed(1)} ms.`].join("\n");
fs.writeFileSync(path.join(root, "qa-report.md"), md + "\n", "utf8");
console.log(md);
fs.writeFileSync(path.join(root, "qa-stats.json"), JSON.stringify({ cases: cases.length, failed: failed.length, cues, seconds: secs }), "utf8");
process.exit(failed.length && !update ? 1 : 0);
