---
doc: prd
status: approved
---
# Satr — Product Requirements
A browser tool for Arabic creators and subtitlers to repair RTL display problems in subtitle files. Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. User opens Satr and sees a drop zone (English + Arabic) and a "nothing is uploaded" badge.
2. User drops an `.srt`/`.vtt`, chooses a file, or clicks **Try a sample**.
3. A summary appears: number of fixes, cues, warnings, and one chip per rule with its count.
4. Below, each cue shows **Before** and **After** in black left-to-right "player" boxes, with tags for applied fixes and warnings.
5. User optionally toggles rules off/on; counts and previews update instantly.
6. User clicks **Download fixed file** and gets `<name>.fixed.srt`.
7. **New file** returns to step 1.

## Screens and Layout
One page: header (logo, tagline, privacy badge) → drop zone → (after load) summary bar → two-column before/after cue list.

## Look and Feel
Dark navy background, gold accent, green for fixes, amber for warnings; Noto Sans / Noto Sans Arabic; previews styled like a video player (white text, black box).

## Features and Behavior
### Fix rules
- Bidi anchoring with RLM at both ends of Arabic lines whose edge is punctuation, a digit or Latin text.
- Latin `, ? ;` adjacent to Arabic → `، ؟ ؛`.
- Persian `ی ک` → Arabic `ي ك`.
- Remove tatweel; remove space before punctuation and double spaces.
- Lines with no Arabic are never changed.
### Warnings
- Line longer than 42 characters; reading speed above 17 chars/sec.
### Output
- Same format as input, cue ids and timings preserved, UTF-8 with BOM.

## States and Boundaries
- **Empty** — drop zone only.
- **Loaded** — summary + cues.
- **Clean file** — 0 fixes shown; download still available.
- **Invalid file** — no cues parsed → 0 cues shown.
- Nothing persists between sessions.

## Product Decisions
- Deterministic rules, not AI — predictable, free, offline, private.
- Preview in an LTR container — it's the environment where the bug appears.

## What We're Building
Everything in Core Journey and Features above.

## Deferred From the POC
Re-wrapping long lines (needs Arabic-aware word breaking), ASS format, batch processing.

## Possible Later Enhancements
YouTube Studio extension; CLI for batch; dialect spell-check.

## Non-Goals
Translation, video editing, accounts.

## Open Questions
None blocking.
