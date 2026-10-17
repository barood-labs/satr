---
doc: spec
status: draft
---
# Satr — Technical Spec

## How This Works, In Plain Language
A single web page. A small "core" file reads the subtitle text, splits it into cues, runs each Arabic line through a list of fix rules, and writes the file back out. A "UI" file shows the results and handles file drop and download. Everything happens inside the browser tab — no server logic, so it's private and free to host.

## The Core Journey Through the System
User drops file → `app.js` reads text with `File.text()` → `Satr.analyze(text, enabled)` → `parse` makes cues → `fixLine` applies enabled rules → warnings computed from timings → `serialize` builds output → `app.js` renders before/after and a Blob download. PRD ref: `prd.md > The Core Journey`.

## Stack
Plain HTML/CSS/JavaScript (ES2020), no framework, no runtime dependencies. Node ≥ 18 for tests (`assert`). Rationale: smallest thing that proves the kernel; nothing to install.

## Where It Runs and How Someone Tries It
Any modern browser via a static server: `npm start` (http-server) or `python3 -m http.server 8080`, open `/`, click **Try a sample**. Demo recorded the same way. Optional deploy: GitHub Pages (static).

## Look and Feel
Per PRD: dark navy, gold accent, Noto fonts, video-player preview boxes with `direction: ltr`.

## Components
### Core (`src/satr.js`)
`parse`, `serialize`, `RULES[]` (id, labels, test, fix), `fixLine`, `analyze`. PRD ref: `prd.md > Features and Behavior`.
### UI (`index.html`, `src/app.js`, `src/styles.css`)
Drop zone, summary + rule chips, cue list, download. PRD ref: `prd.md > Screens and Layout`.

## Data Model
In-memory only: `{format, header, cues:[{id,timing,start,end,lines[]}]}`; rule toggle map. Lost on reload by design.

## File Structure
```
satr/
├── index.html
├── src/ satr.js · app.js · styles.css
├── samples/sample_ar.srt
├── test/satr.test.js
├── demo/                # video + frames
├── devpost/             # scope, prd, spec, checklist
├── README.md · LICENSE · package.json
```

## External Services and Dependencies
None at runtime. `http-server` via npx for local serving only.

## Important Failure Modes
- **Malformed timing lines** → cue skipped / 0 cues shown.
- **Renderer ignores RLM** (rare) → output still has correct Arabic punctuation; user sees no regression.

## What Was Simplified and Why
- **RLM anchoring** instead of full bidi reordering — marks are invisible, standard and reversible.
- **No re-wrapping** — warnings only; Arabic line-breaking needs more care.

## Decisions and Open Issues
- Rules are idempotent (verified by test). Open: whether some editors want RLE/PDF instead of RLM — test in CapCut and Premiere before submitting.
