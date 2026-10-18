# Satr · سطر — Arabic subtitles that land on the right side

Export Arabic subtitles from a translator or AI tool, drop them into Premiere, CapCut or a burn-in tool, and the `؟` / `!` / English brand names jump to the wrong end of the line. Satr fixes that in one drop — entirely in your browser.

![demo](demo/frames/s5_cues.png)

## What it does
Drop an `.srt` or `.vtt` file (or click **Try a sample**). Satr:
- **Anchors bidi direction** — wraps Arabic lines in Right-to-Left Marks so edge punctuation and Latin words render on the correct side in left-to-right players.
- **Arabic punctuation** — `,` `?` `;` next to Arabic become `،` `؟` `؛`.
- **Look-alike letters** — Persian/Urdu `ی` `ک` → Arabic `ي` `ك` (fixes search and some fonts).
- **Cleans** tatweel (ـ), spaces before punctuation, double spaces.
- **Warns** on lines > 42 chars and reading speed > 17 chars/sec.
- Shows **before/after previews in a left-to-right player**, lets you toggle each rule, and downloads `name.fixed.srt` (UTF-8 with BOM for editor compatibility).

English-only lines are never touched, and running Satr twice changes nothing (idempotent).

## Run it
Requires any static server (or Node ≥ 18).
```bash
npm start          # serves on http://localhost:8080
# or: python3 -m http.server 8080
npm test           # runs the rule tests
npm run qa         # Arabic golden-corpus regression
node cli/satr-cli.js check subs/*.srt   # CLI gate
```
Open http://localhost:8080 and click **Try a sample**. No API keys, no accounts, no network calls.

## Project layout
```
index.html          UI shell
src/satr.js         core: parse SRT/VTT, rules, analyze, serialize (pure, works in Node + browser)
src/app.js          UI: drop/file input, previews, rule toggles, download
src/styles.css      styling
samples/            sample Arabic subtitle file with typical errors
test/               Node tests (assert)
devpost/            planning docs from the Devpost Learn skill pack (scope, prd, spec, checklist)
demo/               demo video + frames + narration script
```

## How it was built
Planned and built with the [Devpost Learn skill pack](https://github.com/challengepost/learn-ai-basics) (`scope → prd → spec → build`) and an AI coding agent. Planning docs are in `devpost/`. No pre-existing code was used; no third-party runtime libraries.

## Life after code: Satr on GitLab (agentic DevSecOps)
Satr now ships through a GitLab pipeline run by **GitLab Duo Agent Platform** flows:

```
issue ─▶ Bug-to-Regression flow ─▶ MR ─▶ MR Guardian flow (RTL linguist · security · auto-fix · bilingual verdict)
        pipeline: lint · Duo-config · unit · Arabic golden regression · subtitle gate · SAST · secrets · build · SCI
        failed pipeline ─▶ Pipeline Medic flow ─▶ fix MR
merge ─▶ [human approves] ─▶ Pages deploy ─▶ verify-live smoke test ─▶ Release Scribe flow (EN/AR notes, human gate) ─▶ tag ─▶ GitLab release
```

| Before (GitHub, manual) | After (GitLab, agentic) |
|---|---|
| Run `npm test` by hand, eyeball Arabic output | Golden-corpus Arabic regression + JUnit report on every MR |
| No security checks | SAST + secret detection + Duo security reviewer |
| Copy files to a host by hand | Pages deploy + live smoke test proving the commit is live |
| Bug reports sit in issues | Mention a flow → regression test + fix MR |
| English-only changelog, if any | Bilingual EN/AR release notes, human-approved |
| No idea what CI costs the planet | SCI carbon report per pipeline; docs-only pushes skip all checks |

Files: `.gitlab-ci.yml`, `.gitlab/duo/flows/*.yaml`, `.gitlab/duo/agents/`, `.gitlab/duo/mr-review-instructions.yaml`,
`templates/subtitle-check/` (reusable CI/CD component), `cli/satr-cli.js`, `scripts/`, `qa/`. Setup: `docs/SETUP-GITLAB.md`.

## License
MIT
