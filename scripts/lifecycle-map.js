#!/usr/bin/env node
/* Proves which of GitLab's nine DevSecOps stages Satr's automation touches, by checking that every claimed
   job, flow and file really exists in this commit. Fails if a stage loses all of its automation.
   Writes lifecycle.md (published with the site and exposed on every pipeline). Zero dependencies. */
"use strict";
const fs = require("fs");
const ci = fs.readFileSync(".gitlab-ci.yml", "utf8");
const job = n => ({ kind: "CI job", name: n, ok: new RegExp(`^${n}:`, "m").test(ci) || (n === "sast" || n === "secret_detection") && ci.includes(`Jobs/${n === "sast" ? "SAST" : "Secret-Detection"}`) });
const flow = n => ({ kind: "Duo flow", name: n, ok: fs.existsSync(`.gitlab/duo/flows/${n}.yaml`) });
const file = n => ({ kind: "file", name: n, ok: fs.existsSync(n) });
const STAGES = [
  ["Plan", "bug report → triaged regression task", [flow("bug-to-regression"), file(".gitlab/issue_templates/Subtitle-bug.md")]],
  ["Create", "agent writes the regression case / fix and opens an MR", [flow("bug-to-regression"), flow("mr-rtl-review"), file(".gitlab/duo/mr-review-instructions.yaml")]],
  ["Verify", "tests, Arabic golden regression, self-healing pipeline", [job("unit-tests"), job("arabic-regression"), job("subtitle-gate"), flow("pipeline-medic")]],
  ["Package", "versioned tarball in the Package Registry + SBOM", [job("package"), file("scripts/sbom.js"), file("Dockerfile")]],
  ["Secure", "SAST, secret detection, agent security review", [job("sast"), job("secret_detection"), flow("mr-rtl-review")]],
  ["Release", "one-click production, bilingual release notes, GitLab Release", [job("pages"), job("release"), flow("release-scribe")]],
  ["Configure", "environments as code, drift check, Cloud Run IaC", [job("config-check"), file("config/environments.json"), file("config/cloudrun/service.yaml")]],
  ["Monitor", "live smoke test on the deployed commit, carbon metrics", [job("verify-live"), job("sustainability")]],
  ["Govern", "license, CODEOWNERS, DCO, agent guardrails, audit evidence", [job("governance"), flow("compliance-steward"), file(".gitlab/CODEOWNERS")]],
];
let covered = 0; const lines = [];
for (const [stage, what, items] of STAGES) {
  const ok = items.filter(i => i.ok);
  if (ok.length) covered++;
  lines.push(`| ${ok.length ? "✅" : "❌"} | **${stage}** | ${what} | ${items.map(i => `${i.ok ? "" : "~~"}${i.kind} \`${i.name}\`${i.ok ? "" : "~~"}`).join(", ")} |`);
}
const md = `### DevSecOps lifecycle coverage: ${covered}/9 stages\n| | Stage | What the automation does | Evidence in this commit |\n|---|---|---|---|\n${lines.join("\n")}\n`;
fs.writeFileSync("lifecycle.md", md);
console.log(md);
process.exit(covered === STAGES.length ? 0 : 1);
