---
doc: checklist
status: draft
---
# Build Checklist

Build mode: fast

## Slices
- [x] **1. Drop a file and see before/after previews**
  Becomes usable: page loads an SRT/VTT and renders cues in LTR player boxes.
  Why now: proves the whole path end to end.
  PRD ref: `prd.md > The Core Journey` (1-4)
  Spec ref: `spec.md > Components`
  Build: core parse/serialize, UI drop + render.
  Verify (mechanical): sample loads with 6 cues.
  Learner check: drop your own SRT and compare.
  Commit: `Satr: core rules, UI, sample, tests`

- [x] **2. Fix rules, warnings, toggles, download**
  Becomes usable: fixed file downloads; rules toggle live.
  Why now: the kernel.
  PRD ref: `prd.md > Features and Behavior`
  Spec ref: `spec.md > Core (src/satr.js)`
  Build: five rules, two warnings, chips, Blob download.
  Verify (mechanical): `npm test` passes (idempotency, VTT, English untouched).
  Learner check: download, import into CapCut/Premiere, confirm punctuation side.
  Commit: (same)

## Hands-on Checkpoints
- [ ] Early usable behavior explored — learner tries sample + own file
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map
- [ ] Learning activity complete
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown

## Revisions
