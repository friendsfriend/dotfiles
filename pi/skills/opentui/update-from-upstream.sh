#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${OPENTUI_REPO_URL:-https://github.com/anomalyco/opentui.git}"
REF="${OPENTUI_REF:-main}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Fetching OpenTUI official skill from ${REPO_URL} (${REF})..."
git clone --depth 1 --branch "$REF" --quiet "$REPO_URL" "$TMP_DIR"

SOURCE_DIR="$TMP_DIR/packages/web/src/content"
if [[ ! -f "$SOURCE_DIR/SKILL.md" || ! -d "$SOURCE_DIR/docs" ]]; then
  echo "Official skill not found at packages/web/src/content" >&2
  exit 1
fi

# Replace upstream-managed content, keep this updater script.
find "$SCRIPT_DIR" -mindepth 1 -maxdepth 1 \
  ! -name 'update-from-upstream.sh' \
  -exec rm -rf {} +

cp -R "$SOURCE_DIR/." "$SCRIPT_DIR/"
cp "$TMP_DIR/LICENSE" "$SCRIPT_DIR/LICENSE" 2>/dev/null || true

cat <<'NOTE'
Official OpenTUI skill updated from anomalyco/opentui.

Local project rules still live in AGENTS.md. If upstream SKILL.md changes conflict with project rules, AGENTS.md wins.
NOTE
