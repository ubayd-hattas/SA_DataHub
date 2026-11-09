#!/bin/bash
# Vercel's Ignored Build Step (see vercel.json). Exit 0 skips the build, exit 1 builds.
#
# Skips a deployment when nothing that affects the site changed since the
# branch's last successful deployment: only docs, Markdown, tests, CI and
# issue templates, data-build scripts, or the paused automation, ETL, database
# and validation code. Skipped builds store no output, which keeps
# deployment storage down. When in doubt it builds.

set -u

if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  echo "First deployment on this branch: building."
  exit 1
fi

if ! git cat-file -e "${VERCEL_GIT_PREVIOUS_SHA}^{commit}" 2>/dev/null; then
  echo "Last deployed commit ${VERCEL_GIT_PREVIOUS_SHA} is not in the clone: building."
  exit 1
fi

if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- . \
  ':(exclude)docs' \
  ':(exclude)*.md' \
  ':(exclude)tests' \
  ':(exclude).github' \
  ':(exclude)scripts' \
  ':(exclude)automation' \
  ':(exclude)etl' \
  ':(exclude)db' \
  ':(exclude)validation'; then
  echo "Only docs, tests, scripts or paused code changed since ${VERCEL_GIT_PREVIOUS_SHA}: skipping the build."
  exit 0
fi

echo "Site files changed since ${VERCEL_GIT_PREVIOUS_SHA}: building."
exit 1
