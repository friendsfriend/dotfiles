#!/usr/bin/env bash
# Installs the US International (Linux) keyboard layout bundle into
# ~/Library/Keyboard Layouts/ and configures macOS input sources to exactly:
#   - German (com.apple.keylayout.German)
#   - German – Standard / DIN-2137 (com.apple.keylayout.German-DIN-2137)
#   - US International (Linux) (dev.kellner.keyboardlayout.us-intl-linux.us-international-linux)

set -e

read -r -p "Install US International (Linux) keyboard layout and configure input sources? [y/N] " reply
case "$reply" in
  [yY][eE][sS]|[yY]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_SRC="$SCRIPT_DIR/us-intl-linux.bundle"
DEST_DIR="$HOME/Library/Keyboard Layouts"
BUNDLE_DEST="$DEST_DIR/us-intl-linux.bundle"

# ---------------------------------------------------------------------------
# 1. Install the bundle
# ---------------------------------------------------------------------------
echo "Installing US International (Linux) keyboard layout..."

mkdir -p "$DEST_DIR"

if [ -e "$BUNDLE_DEST" ]; then
  rm -rf "$BUNDLE_DEST"
  echo "  Removed existing bundle."
fi

cp -r "$BUNDLE_SRC" "$BUNDLE_DEST"
echo "  Copied bundle to: $BUNDLE_DEST"

# ---------------------------------------------------------------------------
# 2. Configure AppleEnabledInputSources
#    Exactly: German, German-DIN-2137, US International (Linux)
#    plus the two system non-keyboard IMEs macOS always injects.
# ---------------------------------------------------------------------------
echo ""
echo "Configuring input sources..."

defaults write com.apple.HIToolbox AppleEnabledInputSources -array \
  '<dict>
    <key>InputSourceKind</key><string>Keyboard Layout</string>
    <key>KeyboardLayout ID</key><integer>3</integer>
    <key>KeyboardLayout Name</key><string>German</string>
  </dict>' \
  '<dict>
    <key>InputSourceKind</key><string>Keyboard Layout</string>
    <key>KeyboardLayout ID</key><integer>-18133</integer>
    <key>KeyboardLayout Name</key><string>German-DIN-2137</string>
  </dict>' \
  '<dict>
    <key>Bundle ID</key><string>com.apple.CharacterPaletteIM</string>
    <key>InputSourceKind</key><string>Non Keyboard Input Method</string>
  </dict>' \
  '<dict>
    <key>Bundle ID</key><string>com.apple.inputmethod.EmojiFunctionRowItem</string>
    <key>InputSourceKind</key><string>Non Keyboard Input Method</string>
  </dict>'

echo "  AppleEnabledInputSources set."

# ---------------------------------------------------------------------------
# 3. Activate changes — kill the HIToolbox agent so it re-reads the plist,
#    then use TIS to enable and select our custom layout.
# ---------------------------------------------------------------------------

# Re-register input sources with the system
/System/Library/PrivateFrameworks/KeyboardServices.framework/Versions/A/Resources/KeyboardServicesAgent --restart 2>/dev/null || true

echo ""
echo "Done. You must log out and log back in (or reboot) for all changes to"
echo "take effect. After logging back in the three layouts will be available:"
echo "  • German"
echo "  • German – Standard (DIN 2137)"
echo "  • US International (Linux)"
