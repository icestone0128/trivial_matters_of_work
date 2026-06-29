#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== structure =="
test -d 100_Todo/drafts
test -d 100_Todo/projects
test -d 100_Todo/archive
test -d 200_Reference/docs
test -d 200_Reference/templates
test -d 200_Reference/past-work
test -d 200_Reference/scripts
test ! -e docs
test ! -e assets
test ! -e scripts
echo "structure ok"

echo "== json =="
python3 -m json.tool 100_Todo/projects/live-word-cloud/firebase.json >/dev/null
python3 -m json.tool 100_Todo/projects/screw-drive-types-design-tool/firebase.json >/dev/null
python3 -m json.tool 200_Reference/docs/live-word-cloud/firebase.json >/dev/null
echo "json ok"

echo "== git =="
git status --short

echo "== references =="
if rg -n '\.\./\.\./\.\./docs|`/docs`|main branch `/docs`|main 分支 `/docs`|source.*main.*`/docs`' AGENTS.md README.md 100_Todo 200_Reference 000_Agent --glob '!**/node_modules/**' --glob '!**/.firebase/**' --glob '!200_Reference/scripts/verify_project.sh'; then
  echo "Found legacy root docs references. Update active docs before publishing."
  exit 1
else
  echo "no legacy root docs references in active project files"
fi
