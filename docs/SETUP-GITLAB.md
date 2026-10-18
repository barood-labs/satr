# Setting up Satr's agentic lifecycle on GitLab

1. **Import** — New project → Import project → Repository by URL → `https://github.com/baroodstore1-ai/satr.git`
   (or push this repo). Make it **Public**, MIT license is detected from `LICENSE`.
2. **Pipeline** — `.gitlab-ci.yml` runs on the first push. Settings → CI/CD → Variables (optional):
   - `AUTO_DEPLOY=true` → Hands-off mode (no manual production approval).
   - `GCP_PROJECT_ID`, `GCP_SA_KEY`, `GCP_REGION` → enables the optional `deploy-cloud-run` job.
3. **Pages** — the `pages` job publishes `public/`. The live URL appears under Deploy → Pages and in the
   `production` environment. `verify-live` then proves the deployed commit works.
4. **Duo Agent Platform** — Settings → GitLab Duo: turn on the Agent Platform and custom flows.
5. **Flows** — AI → Flows → New flow, one per file in `.gitlab/duo/flows/` (paste the YAML):
   | Flow | Display name | Trigger |
   |---|---|---|
   | `mr-rtl-review.yaml` | Satr MR Guardian | Assign reviewer |
   | `pipeline-medic.yaml` | Satr Pipeline Medic | Pipeline event (failed) |
   | `bug-to-regression.yaml` | Satr Bug-to-Regression | Mention |
   | `release-scribe.yaml` | Satr Release Scribe | Mention |
   Enable each flow in the project and add the trigger. Each flow gets a service account (for example `@ai-satr-mr-guardian`).
6. **Agents** — AI → Agents → New agent using `.gitlab/duo/agents/*.md` (chat agents for ad-hoc questions).
7. **Code Review** — `.gitlab/duo/mr-review-instructions.yaml` is picked up automatically by Duo Code Review.
8. **CI/CD Catalog** (optional) — publish `templates/subtitle-check` as a component so any content repo can gate subtitles.

Validate flow YAML locally: `python3 scripts/validate-flows.py`.
