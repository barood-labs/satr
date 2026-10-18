#!/usr/bin/env node
/* Satr CLI — used by CI jobs and by the GitLab Duo agents (via run_command).
   Usage:
     node cli/satr-cli.js check <file...> [--json]   exit 1 if any file still needs fixes
     node cli/satr-cli.js fix   <file...>            rewrite files in place (UTF-8)
     node cli/satr-cli.js report <file...>           Markdown report (EN + AR labels) */
"use strict";
const fs = require("fs");
const path = require("path");
const S = require("../src/satr.js");

const [cmd, ...rest] = process.argv.slice(2);
const json = rest.includes("--json");
const files = rest.filter(a => !a.startsWith("--"));
if (!["check", "fix", "report"].includes(cmd) || files.length === 0) {
  console.error("usage: satr-cli.js <check|fix|report> <file.srt|file.vtt...> [--json]");
  process.exit(2);
}
const label = Object.fromEntries(S.RULES.map(r => [r.id, { en: r.en, ar: r.ar }]));
const results = files.map(f => {
  const text = fs.readFileSync(f, "utf8");
  const r = S.analyze(text);
  if (cmd === "fix" && r.total > 0) fs.writeFileSync(f, r.output, "utf8");
  return { file: path.relative(process.cwd(), f), format: r.format, cues: r.cueCount, fixes: r.total, counts: r.counts,
    warnings: r.warnings.map(w => ({ cue: w.cue + 1, id: w.id, en: w.en, ar: w.ar })) };
});

if (json) { console.log(JSON.stringify(results, null, 2)); }
else if (cmd === "report") {
  const out = ["| File | Cues | Fixes needed | Warnings |", "|---|---|---|---|"];
  for (const r of results) out.push(`| ${r.file} | ${r.cues} | ${r.fixes} | ${r.warnings.length} |`);
  for (const r of results) {
    const hits = Object.entries(r.counts).filter(([, n]) => n > 0);
    if (!hits.length && !r.warnings.length) continue;
    out.push("", `**${r.file}**`);
    for (const [id, n] of hits) out.push(`- ${n} × ${label[id].en} — ${label[id].ar}`);
    for (const w of r.warnings) out.push(`- ⚠️ cue ${w.cue}: ${w.en} — ${w.ar}`);
  }
  console.log(out.join("\n"));
} else {
  for (const r of results) console.log(`${r.fixes ? "✗" : "✓"} ${r.file}: ${r.cues} cues, ${r.fixes} fixes ${cmd === "fix" ? "applied" : "needed"}, ${r.warnings.length} warnings`);
}
if (cmd === "check" && results.some(r => r.fixes > 0)) process.exit(1);
