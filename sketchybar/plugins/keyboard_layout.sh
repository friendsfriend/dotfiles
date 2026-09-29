#!/bin/sh
# Cycle enabled keyboard layouts on click.
# Fast path: cached keycd binary + defaults read. No swift JIT per render.

BIN="$HOME/.cache/sketchybar/keycd"
SRC="$PLUGIN_DIR/keycd.swift"

# Compile once (and again whenever the source changes). ~2s, paid once.
if [ ! -x "$BIN" ] || [ "$SRC" -nt "$BIN" ]; then
  mkdir -p "$(dirname "$BIN")"
  /usr/bin/swiftc -O -o "$BIN" "$SRC" 2>/dev/null
fi
if [ ! -x "$BIN" ]; then
  sketchybar --set "$NAME" label="?"
  exit 1
fi

# Map layout IDs to short display labels
layout_display_name() {
  case "$1" in
    "com.apple.keylayout.German") echo "Mac" ;;
    "com.apple.keylayout.German-DIN-2137") echo "PC" ;;
    "com.apple.keylayout.USInternational-PC") echo "US" ;;
    "dev.kellner.keyboardlayout.us-intl-linux.us-international-linux") echo "US" ;;
    *) echo "?" ;;
  esac
}

# Current layout straight from the plist (~7ms). TIS fallback if the key is gone.
current_layout_id() {
  ID=$(defaults read com.apple.HIToolbox AppleCurrentKeyboardLayoutInputSourceID 2>/dev/null)
  [ -n "$ID" ] || ID=$("$BIN" current)
  echo "$ID"
}

if [ "$SENDER" = "mouse.clicked" ]; then
  # Reserve the label so the click feels instant
  sketchybar --set "$NAME" label="..."

  LAYOUTS=$("$BIN" list)
  CURRENT_ID=$(current_layout_id)

  # Single pass: count layouts and locate the current one. No subprocesses.
  INDEX=0
  CURRENT_INDEX=-1
  for ID in $LAYOUTS; do
    [ "$ID" = "$CURRENT_ID" ] && CURRENT_INDEX=$INDEX
    INDEX=$((INDEX + 1))
  done
  COUNT=$INDEX

  if [ "$COUNT" -lt 2 ]; then
    sketchybar --set "$NAME" label="$(layout_display_name "$CURRENT_ID")"
    exit 0
  fi

  # Not found (stale plist) -> -1 + 1 = 0, i.e. fall back to the first layout
  NEXT_INDEX=$(( (CURRENT_INDEX + 1) % COUNT ))
  INDEX=0
  for ID in $LAYOUTS; do
    [ "$INDEX" -eq "$NEXT_INDEX" ] && NEXT_ID=$ID
    INDEX=$((INDEX + 1))
  done

  "$BIN" select "$NEXT_ID"
  sketchybar --set "$NAME" label="$(layout_display_name "$NEXT_ID")"
else
  sketchybar --set "$NAME" label="$(layout_display_name "$(current_layout_id)")"
fi
