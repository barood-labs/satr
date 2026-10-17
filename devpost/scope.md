---
doc: scope
status: draft
---
<!-- Draft prepared with the agent. Review and change anything that isn't what you want, then set status: approved. -->
# Satr · سطر

A browser tool that fixes the right-to-left problems in Arabic subtitle files before they reach a video editor.

## The Unique Kernel
It shows Arabic subtitles **the way a left-to-right video editor will actually render them**, side by side with a fixed version, and fixes them with one deterministic pass. Generic translators produce the text; nobody repairs how it *displays*.

## Who It's For
An Arabic-speaking YouTuber or freelance subtitler who translates an English video (often with an AI tool), exports an SRT, and burns it in with CapCut or Premiere. Today they find `؟` at the wrong end on screen and fix lines by hand, or insert invisible marks with copy-paste tricks.

## The Core Loop
Open Satr → drop subtitle file → read the before/after previews and warnings → download the fixed file → import it into the editor. Comes back for every video.

## Inspiration & Identity
Dark, "editing suite" feel; gold accent; previews look like a black video player. Bilingual labels (English + Arabic). Calm, trustworthy: "nothing is uploaded".

## Why This Matters to the Learner
Our team makes videos and does Arabic–English translation; this bug costs us time on every Arabic subtitle job.

## What "Working" Looks Like
Drop the sample SRT: the "Before" player shows `!مرحباً بكم في القناة` with the `!` on the wrong side; the "After" player shows it correctly; download gives a file that renders correctly. That side-by-side is the "oh, that's cool" beat.

## The POC Boundary
SRT + WebVTT input; five fix rules; two warnings; rule toggles; download. Client-side only.

## Later
Subtitle line re-wrapping, ASS/SSA format, batch folders, browser extension for YouTube Studio, Arabic dialect spell-check.

## Explicitly Cut
- AI translation — many tools already do it; our value is the display layer, and no-API-key keeps it free and private.
- Accounts/cloud storage — not needed to prove the kernel; would hurt the privacy promise.
- Video burn-in — editors already do this.
