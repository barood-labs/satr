#!/usr/bin/env node
/* Post-deploy verification. Fetches the LIVE site, checks the deployed version matches this commit,
   then downloads the live satr.js and runs it against the live sample to prove the deployed app works.
   Usage: node scripts/smoke.js <base-url> [expected-version] */
"use strict";
const vm = require("vm");
const base = (process.argv[2] || process.env.SMOKE_URL || "").replace(/\/$/, "");
const want = process.argv[3] || process.env.CI_COMMIT_SHORT_SHA || "";
if (!base) { console.error("usage: smoke.js <base-url> [expected-version]"); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(p) { const r = await fetch(base + p, { cache: "no-store" }); if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`); return r.text(); }
(async () => {
  let version = "";
  for (let i = 0; i < 20; i++) {             // Pages can take a minute to publish
    try { version = JSON.parse(await get("/version.json")).version; } catch (e) { version = ""; }
    if (!want || version === want) break;
    console.log(`waiting for deploy… live=${version || "?"} want=${want}`); await sleep(15000);
  }
  if (want && version !== want) throw new Error(`live version ${version} != ${want}`);
  const html = await get("/");
  if (!html.includes("src/satr.js")) throw new Error("index.html does not load satr.js");
  const sandbox = { globalThis: {} }; sandbox.window = sandbox;
  vm.runInNewContext(await get("/src/satr.js"), sandbox);
  const r = sandbox.Satr.analyze(await get("/samples/sample_ar.srt"));
  if (!(r.total > 0 && r.output.includes("\u061F"))) throw new Error("live satr.js did not fix the live sample");
  if (sandbox.Satr.analyze(r.output).total !== 0) throw new Error("live build is not idempotent");
  console.log(`✅ live ${base} version=${version || "n/a"}: ${r.cueCount} cues, ${r.total} fixes, idempotent`);
})().catch(e => { console.error("❌ smoke test failed:", e.message); process.exit(1); });
