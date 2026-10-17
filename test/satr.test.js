const assert = require("assert");
const fs = require("fs");
const S = require("../src/satr.js");
const r = S.analyze(fs.readFileSync(__dirname + "/../samples/sample_ar.srt", "utf8"));
assert.strictEqual(r.cueCount, 6);
assert.ok(r.output.includes("\u061F"), "question mark converted");
assert.ok(r.output.includes("\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643"), "keheh -> kaf");
assert.ok(!r.output.includes("\u0640"), "tatweel removed");
assert.ok(r.rows[0].after[0].startsWith(S.RLM) && r.rows[0].after[0].endsWith(S.RLM), "bidi anchored");
assert.ok(r.warnings.some(w => w.id === "long"), "long line warned");
// idempotent: fixing twice changes nothing
assert.strictEqual(S.analyze(r.output).output, r.output, "idempotent");
assert.strictEqual(S.analyze(r.output).total, 0, "clean on second pass");
// English-only cue untouched
assert.strictEqual(S.fixLine("Hello, world?").line, "Hello, world?");
// VTT
const v = S.analyze("WEBVTT\n\n00:00.000 --> 00:02.000\nكيف حالك?\n");
assert.ok(v.output.startsWith("WEBVTT") && v.output.includes("\u061F"));
console.log("all tests passed —", r.total, "fixes on sample");
