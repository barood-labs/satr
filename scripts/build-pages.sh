#!/bin/sh
# Assemble the static site for GitLab Pages (or any static host / Cloud Run) into ./public
set -eu
rm -rf public && mkdir -p public/src public/samples
cp index.html public/
cp src/satr.js src/app.js src/styles.css public/src/
cp samples/sample_ar.srt public/samples/
# Version stamp so the post-deploy smoke test can prove *this* commit is live
VERSION="${CI_COMMIT_SHORT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"
printf '{"version":"%s","built_at":"%s"}\n' "$VERSION" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > public/version.json
[ -f qa-report.md ] && cp qa-report.md public/qa-report.md || true
[ -f sci-report.md ] && cp sci-report.md public/sci-report.md || true
for f in lifecycle.md governance-report.md config-report.md; do [ -f "$f" ] && cp "$f" "public/$f"; done; true
echo "built public/ for $VERSION ($(du -sh public | cut -f1))"
