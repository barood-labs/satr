#!/usr/bin/env node
/* Configure stage: config/environments.json is the single source of truth for deploy targets.
   Fails if .gitlab-ci.yml or config/cloudrun/service.yaml drift from it, or if a target breaks policy
   (scale-to-zero, memory cap, instance cap). Zero dependencies. Writes config-report.md. */
"use strict";
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("config/environments.json", "utf8"));
const ci = fs.readFileSync(".gitlab-ci.yml", "utf8");
const svc = fs.readFileSync("config/cloudrun/service.yaml", "utf8");
const rows = [], errs = [];
const check = (name, ok, detail) => { rows.push(`| ${ok ? "✅" : "❌"} | ${name} | ${detail} |`); if (!ok) errs.push(name); };
const mib = m => /Gi$/.test(m) ? parseFloat(m) * 1024 : parseFloat(m);

for (const [env, e] of Object.entries(cfg.environments)) {
  check(`${env}: job \`${e.job}\` exists`, new RegExp(`^${e.job}:`, "m").test(ci), e.platform);
  check(`${env}: environment declared in CI`, new RegExp(`name:\\s*${env}\\s*$`, "m").test(ci), `environment: ${env}`);
  if (e.approval === "manual") {
    const block = ci.split(new RegExp(`^${e.job}:`, "m"))[1].split(/^\S/m)[0];
    check(`${env}: human approval gate`, /when:\s*manual/.test(block), "manual deploy unless AUTO_DEPLOY=true");
  }
  if (e.smoke_test) check(`${env}: post-deploy smoke test \`${e.smoke_test}\``, new RegExp(`^${e.smoke_test}:`, "m").test(ci), "proves the deployed commit is live");
  if (e.platform === "google-cloud-run") {
    const p = cfg.policy;
    check(`${env}: scale-to-zero`, !p.scale_to_zero_required || e.min_instances === 0, `min ${e.min_instances}`);
    check(`${env}: instance cap`, e.max_instances <= p.max_instances_cap, `max ${e.max_instances} ≤ ${p.max_instances_cap}`);
    check(`${env}: memory cap`, mib(e.memory) <= p.max_memory_mib, `${e.memory} ≤ ${p.max_memory_mib}Mi`);
    check(`${env}: CI flags match config`, ci.includes(`--min-instances ${e.min_instances}`) && ci.includes(`--max-instances ${e.max_instances}`) &&
      ci.includes(`--memory ${e.memory}`) && ci.includes(`GCP_REGION:-${e.region}`), "deploy-cloud-run flags");
    check(`${env}: service.yaml matches config`, svc.includes(`minScale: "${e.min_instances}"`) && svc.includes(`maxScale: "${e.max_instances}"`) &&
      new RegExp(`memory:\\s*${e.memory}`).test(svc) && new RegExp(`name:\\s*${e.service}`).test(svc), "config/cloudrun/service.yaml");
  }
}
const md = `### Configuration drift check\n| | Check | Detail |\n|---|---|---|\n${rows.join("\n")}\n\n${errs.length ? `**${errs.length} problem(s).**` : "**No drift. All deploy targets follow policy.**"}\n`;
fs.writeFileSync("config-report.md", md);
console.log(md);
process.exit(errs.length ? 1 : 0);
