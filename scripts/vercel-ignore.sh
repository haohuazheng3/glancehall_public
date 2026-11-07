#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json → ignoreCommand), used while Vercel builds main itself.
# Exit 0 = skip the build, exit 1 = build. Mirrors deploy.yml's paths-ignore: pushes that only touch
# files the site never reads (docs, reports, benchmark runner, workflows) don't spend a build.
# If the previous deployed commit isn't in Vercel's shallow clone, git diff fails and we build.
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git diff --quiet "$base" HEAD -- . \
  ':(exclude,glob)*.md' \
  ':(exclude,glob)docs/**' \
  ':(exclude,glob)ops-reports/**' \
  ':(exclude,glob)bench/**' \
  ':(exclude,glob)tasks/**' \
  ':(exclude,glob)content/runs/**' \
  ':(exclude,glob)workers/**' \
  ':(exclude,glob).github/**'
code=$?
if [ "$code" -eq 0 ]; then echo "Only non-site files changed since $base: skipping build."; exit 0; fi
echo "Site files changed since $base (or diff unavailable): building."; exit 1
