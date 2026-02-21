#!/bin/sh

# Get all enabled keyboard layouts (IDs and names)
LAYOUTS=$(/usr/bin/swift - << 'EOF'
import Carbon

let filter = [kTISPropertyInputSourceIsEnabled: true, kTISPropertyInputSourceType: kTISTypeKeyboardLayout] as CFDictionary
let sources = TISCreateInputSourceList(filter, false).takeRetainedValue() as! [TISInputSource]
for source in sources {
    let name = TISGetInputSourceProperty(source, kTISPropertyLocalizedName)
    let id = TISGetInputSourceProperty(source, kTISPropertyInputSourceID)
    if let namePtr = name, let idPtr = id {
        let nameStr = Unmanaged<CFString>.fromOpaque(namePtr).takeUnretainedValue() as String
        let idStr = Unmanaged<CFString>.fromOpaque(idPtr).takeUnretainedValue() as String
        print("\(idStr)|\(nameStr)")
    }
}
EOF
)

# Get current layout ID
CURRENT_ID=$(/usr/bin/swift - << 'EOF'
import Carbon
let source = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let id = TISGetInputSourceProperty(source, kTISPropertyInputSourceID)
print(Unmanaged<CFString>.fromOpaque(id!).takeUnretainedValue() as String)
EOF
)

# Get current layout name
CURRENT_NAME=$(/usr/bin/swift - << 'EOF'
import Carbon
let source = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let name = TISGetInputSourceProperty(source, kTISPropertyLocalizedName)
print(Unmanaged<CFString>.fromOpaque(name!).takeUnretainedValue() as String)
EOF
)

# Map system layout names to custom display labels
layout_display_name() {
  case "$1" in
    "com.apple.keylayout.German") echo "Mac" ;;
    "com.apple.keylayout.German-DIN-2137") echo "PC" ;;
    "com.apple.keylayout.USInternational-PC") echo "US" ;;
    "dev.kellner.keyboardlayout.us-intl-linux.us-international-linux") echo "US" ;;
    *) echo "$2" ;; # fallback to the localized name
  esac
}

# On click: cycle to next layout
if [ "$SENDER" = "mouse.clicked" ]; then
  sketchybar --set "$NAME" label="..."

  LAYOUT_IDS=$(echo "$LAYOUTS" | cut -d'|' -f1)
  LAYOUT_COUNT=$(echo "$LAYOUT_IDS" | wc -l | tr -d ' ')

  if [ "$LAYOUT_COUNT" -lt 2 ]; then
    sketchybar --set "$NAME" label="$(layout_display_name "$CURRENT_ID" "$CURRENT_NAME")"
    exit 0
  fi

  # Find index of current layout
  CURRENT_INDEX=0
  INDEX=0
  while IFS= read -r LINE; do
    ID=$(echo "$LINE" | cut -d'|' -f1)
    if [ "$ID" = "$CURRENT_ID" ]; then
      CURRENT_INDEX=$INDEX
    fi
    INDEX=$((INDEX + 1))
  done <<< "$LAYOUTS"

  # Pick the next layout (cycle)
  NEXT_INDEX=$(( (CURRENT_INDEX + 1) % LAYOUT_COUNT ))

  NEXT_ID=$(echo "$LAYOUTS" | sed -n "$((NEXT_INDEX + 1))p" | cut -d'|' -f1)
  NEXT_NAME=$(echo "$LAYOUTS" | sed -n "$((NEXT_INDEX + 1))p" | cut -d'|' -f2)

  # Switch to next layout via AppleScript
  osascript -e "tell application \"System Events\" to set current keyboard layout to \"$NEXT_ID\"" 2>/dev/null || \
  /usr/bin/swift - << SWIFTEOF
import Carbon

let filter = [kTISPropertyInputSourceIsEnabled: true, kTISPropertyInputSourceID: "$NEXT_ID" as CFString] as CFDictionary
let sources = TISCreateInputSourceList(filter, false).takeRetainedValue() as! [TISInputSource]
if let source = sources.first {
    TISSelectInputSource(source)
}
SWIFTEOF

  sketchybar --set "$NAME" label="$(layout_display_name "$NEXT_ID" "$NEXT_NAME")"
else
  sketchybar --set "$NAME" label="$(layout_display_name "$CURRENT_ID" "$CURRENT_NAME")"
fi
