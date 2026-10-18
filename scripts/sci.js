#!/usr/bin/env node
/* Software Carbon Intensity (Green Software Foundation SCI spec, ISO/IEC 21031:2024) for Satr's CI checks.
   SCI = ((E × I) + M) per R
     E = energy of the check workload (kWh), from measured CPU time × per-vCPU power + memory power
     I = grid carbon intensity (gCO2e/kWh)           — env SCI_GRID_INTENSITY, default 475 (global average)
     M = embodied emissions share of the runner     — time- and resource-share of server embodied carbon
     R = functional unit: 1,000 subtitle cues verified
   Coefficients follow the Cloud Carbon Footprint methodology (avg 2.5 W/vCPU at typical utilisation,
   0.392 W/GB memory) and a 1,200 kgCO2e / 4-year / 48-vCPU server embodied estimate. These are ESTIMATES;
   override any coefficient by env var. Writes sci-report.md and sci.json. */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const env = (k, d) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const W_VCPU = env("SCI_W_PER_VCPU", 2.5), W_GB = env("SCI_W_PER_GB", 0.392), MEM_GB = env("SCI_MEM_GB", 0.25);
const I = env("SCI_GRID_INTENSITY", 475);                              // gCO2e/kWh
const EMB_G = env("SCI_SERVER_EMBODIED_G", 1.2e6), LIFE_S = env("SCI_SERVER_LIFE_S", 4 * 365 * 86400);
const VCPU = env("SCI_RUNNER_VCPU", 2), SERVER_VCPU = env("SCI_SERVER_VCPU", 48);

function childCpuSeconds() {                                           // cutime+cstime of reaped children
  const f = fs.readFileSync("/proc/self/stat", "utf8").split(") ")[1].split(" ");
  return (Number(f[13]) + Number(f[14])) / 100;
}
const steps = [["unit tests", ["test/satr.test.js"]], ["arabic regression", ["scripts/arabic-qa.js"]]];
const cpu0 = childCpuSeconds(), t0 = Date.now();
for (const [name, args] of steps) {
  const r = spawnSync(process.execPath, args, { stdio: "ignore" });
  if (r.status !== 0) { console.error(`step failed: ${name}`); process.exit(1); }
}
const cpuS = Math.max(childCpuSeconds() - cpu0, 0.01), wallS = (Date.now() - t0) / 1000;
const stats = JSON.parse(fs.readFileSync("qa-stats.json", "utf8"));
const cues = stats.cues + 6;                                           // corpus + unit-test sample
const E = (cpuS * W_VCPU + wallS * MEM_GB * W_GB) / 3.6e6;             // kWh
const M = EMB_G * (wallS / LIFE_S) * (VCPU / SERVER_VCPU);             // gCO2e
const R = cues / 1000;
const sci = (E * I + M) / R;                                           // gCO2e per 1k cues
// Whole-job view: a CI job also pays for runner boot + image pull. Docs-only pushes skip every check job
// (rules:changes), so each skipped pipeline saves the full job footprint below.
const JOB_S = env("SCI_JOB_SECONDS", Number(process.env.CI_JOB_STARTED_AT ? (Date.now() - Date.parse(process.env.CI_JOB_STARTED_AT)) / 1000 : 30));
const jobG = ((JOB_S * VCPU * W_VCPU + JOB_S * 4 * W_GB) / 3.6e6) * I + EMB_G * (JOB_S / LIFE_S) * (VCPU / SERVER_VCPU);
const out = { sci_g_per_1k_cues: sci, energy_kwh: E, embodied_g: M, cpu_seconds: cpuS, wall_seconds: wallS, cues, grid_intensity: I, job_seconds: JOB_S, job_g: jobG };
fs.writeFileSync("sci.json", JSON.stringify(out, null, 2));
const md = `### Sustainability — Software Carbon Intensity (SCI)
| Metric | Value |
|---|---|
| **SCI** (gCO2e per 1,000 cues verified) | **${sci.toExponential(3)}** |
| Energy E | ${(E * 1000).toExponential(3)} Wh (CPU ${cpuS.toFixed(2)} s, wall ${wallS.toFixed(2)} s) |
| Grid intensity I | ${I} gCO2e/kWh |
| Embodied M | ${M.toExponential(3)} gCO2e |
| Functional unit R | ${cues} cues |
| Est. footprint of one check job (${JOB_S.toFixed(0)} s on ${VCPU} vCPU) | ${jobG.toFixed(4)} gCO2e — saved on every docs-only push |

Method: GSF SCI spec; coefficients from Cloud Carbon Footprint; estimates, not metered.
`;
fs.writeFileSync("sci-report.md", md);
console.log(md);
console.log(`sci_g_per_1k_cues ${sci}`);                               // metrics line
