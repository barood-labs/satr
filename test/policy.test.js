/* Policy-as-code tests: each case breaks one rule in a scratch copy of the repo and asserts the
   governance / configure / lifecycle gates catch it. Zero dependencies. */
"use strict";
const assert = require("assert"), fs = require("fs"), os = require("os"), path = require("path");
const { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const COPY = [".gitlab-ci.yml", ".gitlab", "config", "scripts", "package.json", "LICENSE", "Dockerfile"];
function scratch(mutate) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "satr-policy-"));
  for (const f of COPY) fs.cpSync(path.join(ROOT, f), path.join(d, f), { recursive: true });
  mutate(d);
  return d;
}
const run = (d, script) => spawnSync(process.execPath, [path.join(d, "scripts", script)], { cwd: d, encoding: "utf8", env: { ...process.env, CI_MERGE_REQUEST_DIFF_BASE_SHA: "" } });
const edit = (d, f, a, b) => { const p = path.join(d, f), s = fs.readFileSync(p, "utf8"); assert.ok(s.includes(a), `fixture text missing in ${f}`); fs.writeFileSync(p, s.replace(a, b)); };
let n = 0;
const expect = (name, script, mutate, ok) => {
  const d = scratch(mutate), r = run(d, script);
  fs.rmSync(d, { recursive: true, force: true });
  assert.strictEqual(r.status === 0, ok, `${name}: expected ${ok ? "pass" : "fail"}\n${r.stdout}${r.stderr}`);
  n++;
};
const MEDIC = ".gitlab/duo/flows/pipeline-medic.yaml";
expect("clean repo passes governance", "governance.js", () => {}, true);
expect("clean repo passes config-check", "config-check.js", () => {}, true);
expect("clean repo covers 9/9 stages", "lifecycle-map.js", () => {}, true);
expect("agent loses primary-branch guardrail", "governance.js", d => edit(d, MEDIC, "Never push to the primary branch directly", "Try not to push to the primary branch"), false);
expect("code-writing agent gains a merge tool", "governance.js", d => edit(d, MEDIC, '"run_git_command"', '"run_git_command", "update_merge_request"'), false);
expect("license changed away from MIT", "governance.js", d => edit(d, "package.json", '"license": "MIT"', '"license": "UNLICENSED"'), false);
expect("CODEOWNERS stops covering agent configs", "governance.js", d => edit(d, ".gitlab/CODEOWNERS", "/.gitlab/duo/", "/docs/"), false);
expect("Cloud Run max instances drift in CI", "config-check.js", d => edit(d, ".gitlab-ci.yml", "--max-instances 1", "--max-instances 5"), false);
expect("scale-to-zero disabled in config", "config-check.js", d => edit(d, "config/environments.json", '"min_instances": 0', '"min_instances": 1'), false);
expect("service.yaml memory drift", "config-check.js", d => edit(d, "config/cloudrun/service.yaml", "memory: 128Mi", "memory: 2Gi"), false);
expect("production approval gate removed", "config-check.js", d => edit(d, ".gitlab-ci.yml", "      when: manual                      # Supervised", "      when: on_success                  # Supervised"), false);
expect("Govern stage loses its automation", "lifecycle-map.js", d => {
  fs.rmSync(path.join(d, ".gitlab/duo/flows/compliance-steward.yaml")); fs.rmSync(path.join(d, ".gitlab/CODEOWNERS"));
  edit(d, ".gitlab-ci.yml", "\ngovernance:", "\ngovernance-disabled:");
}, false);
console.log(`policy tests passed — ${n} cases`);
