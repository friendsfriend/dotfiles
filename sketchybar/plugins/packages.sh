#!/usr/bin/env bash

export PATH="/opt/homebrew/bin:$PATH"
source "$CONFIG_DIR/colors.sh" # Loads all defined colors

ZERO_LABEL="${PACKAGES_ZERO_LABEL:-✓}"
LOADING_LABEL="${PACKAGES_LOADING_LABEL:-↻}"

if [[ "$1" == "--upgrade" ]]; then
  sketchybar --set packages label="$LOADING_LABEL"
  if command -v brew >/dev/null 2>&1; then
    brew update >/dev/null 2>&1
    brew upgrade
  fi
  "$0"
  exit 0
fi

BREW=0
if command -v brew >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    BREW=$(brew outdated --json=v2 2>/dev/null | python3 -c 'import json,sys
raw=sys.stdin.read().strip()
if not raw:
    print(0)
    raise SystemExit
d=json.loads(raw)
print(len(d.get("formulae", [])) + len(d.get("casks", [])))' 2>/dev/null)
  fi
fi

if ! [[ "$BREW" =~ ^[0-9]+$ ]]; then
  BREW=0
fi

if [[ "$BREW" -gt 0 ]]; then
  sketchybar --animate sin 60 \
    --bar color="$ALERT_YELLOW" \
          color="$BAR_COLOR"
fi

if [[ "$BREW" -eq 0 ]]; then
  sketchybar --set packages label="$ZERO_LABEL"
else
  sketchybar --set packages label="$BREW"
fi
