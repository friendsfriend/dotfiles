#!/bin/sh

source "$CONFIG_DIR/colors.sh" # Loads all defined colors

NOTIFICATION_STATUS_COLOR=$BAR_COLOR

get_status_label() {
  osascript - "$1" 2>/dev/null <<'APPLESCRIPT'
on run argv
  tell application "System Events"
    try
      tell UI element (item 1 of argv) of list 1 of process "Dock"
        set statusLabel to value of attribute "AXStatusLabel"
        if statusLabel is missing value then return ""
        return statusLabel
      end tell
    on error
      return ""
    end try
  end tell
end run
APPLESCRIPT
}

LABEL=$(get_status_label "Mail")
if [[ -z "$LABEL" ]]; then
    LABEL=" "
fi

sketchybar --set outlook label="${LABEL}" 


LABEL=$(get_status_label "Microsoft Teams")
if [[ -n "$LABEL" ]]; then

   if [[ $LABEL == "•" ]]; then
        if [[ $NOTIFICATION_STATUS_COLOR != "$ALERT_RED" ]]; then
          NOTIFICATION_STATUS_COLOR=$ALERT_YELLOW
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$ALERT_RED
    else
        LABEL=" "
    fi
else 
  LABEL=" "
fi

sketchybar --set teams label="${LABEL}" 


if [[ "$NOTIFICATION_STATUS_COLOR" != "$BAR_COLOR" ]]; then
  sketchybar --animate sin 60 \
           --bar color="$NOTIFICATION_STATUS_COLOR"  \
                 color="$BAR_COLOR"
fi
