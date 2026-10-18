#!/usr/bin/env node
/* Deterministic fallback for the release job: if the Duo "release scribe" flow has not produced
   RELEASE_NOTES.md for this tag, build a bilingual skeleton from commit subjects since the last tag. */
"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const sh = c => { try { return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const tag = process.env.CI_COMMIT_TAG || sh("git describe --tags --abbrev=0") || "unreleased";
if (fs.existsSync("RELEASE_NOTES.md") && fs.readFileSync("RELEASE_NOTES.md", "utf8").includes(tag)) {
  console.log("RELEASE_NOTES.md already written for " + tag); process.exit(0);
}
const prev = sh(`git describe --tags --abbrev=0 ${tag}^`);
const log = sh(`git log --no-merges --format=%s ${prev ? prev + ".." : ""}${process.env.CI_COMMIT_SHA || "HEAD"}`).split("\n").filter(Boolean);
const notes = `# Satr ${tag}

## English
${log.map(s => "- " + s).join("\n") || "- Maintenance release"}

<div dir="rtl" lang="ar">

## بالعربية
${log.map(s => "- " + s).join("\n") || "- إصدار صيانة"}

</div>
`;
fs.writeFileSync("RELEASE_NOTES.md", notes);
console.log(notes);
