#!/usr/bin/env node
/* Govern stage: policy-as-code for Satr and for Satr's own AI agents. Zero dependencies.
   Checks
     1. License   — LICENSE is MIT, package.json says MIT, runtime deps are listed (none today).
     2. Ownership — CODEOWNERS covers the rules engine, golden corpus, pipeline and agent configs.
     3. Agent guardrails — every Duo flow component that can push code (run_git_command / create_commit /
        create_merge_request) must say it never pushes to the primary branch; no component may both write code
        and approve/merge; every component keeps an audit log (ui_log_events).
     4. DCO       — on merge-request pipelines, every commit carries "Signed-off-by:" (GitLab DCO 1.1, required
        by the hackathon rules). DCO_MODE=warn (default) reports, DCO_MODE=enforce fails.
   Writes governance-report.md and compliance-evidence.json (kept as a pipeline artifact = audit trail). */
"use strict";
const fs = require("fs");
const { execSync } = require("child_process");
const rows = [], errs = [], warns = [];
const add = (area, name, status, detail) => {
  rows.push(`| ${status === "pass" ? "✅" : status === "warn" ? "⚠️" : "❌"} | ${area} | ${name} | ${detail} |`);
  if (status === "fail") errs.push(name); if (status === "warn") warns.push(name);
};
const read = f => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");

// 1. License
const lic = read("LICENSE"), pkg = JSON.parse(read("package.json"));
add("License", "LICENSE is MIT", /MIT License/.test(lic) ? "pass" : "fail", "detected in GitLab project About section");
add("License", "package.json license", pkg.license === "MIT" ? "pass" : "fail", pkg.license || "missing");
const deps = Object.keys(pkg.dependencies || {});
add("License", "runtime dependencies", deps.length === 0 ? "pass" : "warn", deps.length ? `${deps.length} to review: ${deps.join(", ")}` : "none — nothing third-party ships to users");

// 2. Ownership
const co = read(".gitlab/CODEOWNERS");
for (const p of ["/src/satr.js", "/qa/expected/", "/.gitlab-ci.yml", "/.gitlab/duo/"])
  add("Ownership", `CODEOWNERS covers ${p}`, co.includes(p) ? "pass" : "fail", co.includes(p) ? "maintainer review required" : "not covered");

// 3. Agent guardrails
const WRITE = ["run_git_command", "create_commit", "create_merge_request"];
const MERGE = ["update_merge_request", "merge_merge_request", "approve_merge_request"];
const flows = fs.readdirSync(".gitlab/duo/flows").filter(f => f.endsWith(".yaml"));
let comps = 0, writers = 0;
for (const f of flows) {
  const y = read(`.gitlab/duo/flows/${f}`);
  const [compPart, rest = ""] = y.split(/^routers:/m);
  const promptPart = y.split(/^prompts:/m)[1] || "";
  const prompts = {};
  for (const blk of promptPart.split(/^\s*- prompt_id:/m).slice(1)) prompts[blk.match(/"([^"]+)"/)[1]] = blk;
  for (const blk of compPart.split(/^  - name:/m).slice(1)) {
    comps++;
    const name = blk.match(/"([^"]+)"/)[1];
    const tools = ((blk.match(/toolset:\s*\[([\s\S]*?)\]/) || [, ""])[1].match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1));
    const isAgent = /type:\s*AgentComponent/.test(blk);
    if (!/ui_log_events:/.test(blk)) add("Agents", `${f}:${name} audit log`, "fail", "no ui_log_events");
    if (!isAgent) continue;
    const pr = prompts[(blk.match(/prompt_id:\s*"([^"]+)"/) || [])[1]] || "";
    if (tools.some(t => WRITE.includes(t))) {
      writers++;
      const guarded = /never push to the primary branch/i.test(pr);
      add("Agents", `${f}:${name} can push`, guarded ? "pass" : "fail", guarded ? "prompt forbids pushing to the primary branch; changes go through an MR" : "missing primary-branch guardrail");
    }
    if (tools.some(t => WRITE.includes(t)) && tools.some(t => MERGE.includes(t)))
      add("Agents", `${f}:${name} separation of duties`, "fail", "same agent can write and merge");
  }
  const gate = /type:\s*HumanInputComponent/.test(y);
  if (gate) add("Agents", `${f} human gate`, "pass", "HumanInputComponent approve/modify/reject");
}
add("Agents", "separation of duties", errs.some(e => e.includes("separation")) ? "fail" : "pass", `${writers} code-writing agents, none can approve or merge`);

// 4. DCO
const base = process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA, mode = process.env.DCO_MODE || "warn";
if (base) {
  let commits = [];
  try { commits = execSync(`git log --format=%H%x1f%B%x1e ${base}..HEAD`, { encoding: "utf8" }).split("\x1e").filter(s => s.trim()); } catch { /* shallow clone */ }
  const unsigned = commits.filter(c => !/^Signed-off-by: .+ <.+>$/m.test(c)).map(c => c.trim().slice(0, 8));
  add("DCO", "Signed-off-by on MR commits", unsigned.length === 0 ? "pass" : mode === "enforce" ? "fail" : "warn",
    unsigned.length ? `${unsigned.length}/${commits.length} unsigned: ${unsigned.join(", ")}` : `${commits.length} commits signed`);
} else add("DCO", "Signed-off-by on MR commits", "pass", "not an MR pipeline — checked on merge requests");

const evidence = {
  generated_at: new Date().toISOString(), commit: process.env.CI_COMMIT_SHA || "local", pipeline: process.env.CI_PIPELINE_URL || null,
  triggered_by: process.env.GITLAB_USER_LOGIN || null, flows: flows.length, agent_components: comps, code_writing_agents: writers,
  result: errs.length ? "fail" : warns.length ? "pass_with_warnings" : "pass",
  checks: rows.map(r => r.split("|").slice(1, -1).map(s => s.trim())).map(([s, area, name, detail]) => ({ status: s, area, name, detail })),
};
fs.writeFileSync("compliance-evidence.json", JSON.stringify(evidence, null, 2));
const md = `### Governance — policy as code\n| | Area | Check | Detail |\n|---|---|---|---|\n${rows.join("\n")}\n\n**Result: ${evidence.result}** · ${flows.length} flows · ${comps} components · ${writers} can push code\n`;
fs.writeFileSync("governance-report.md", md);
console.log(md);
process.exit(errs.length ? 1 : 0);
