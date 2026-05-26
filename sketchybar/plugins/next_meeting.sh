#!/usr/bin/env bash

source "$CONFIG_DIR/colors.sh" # Loads all defined colors

ALERT_STATE_DIR="${TMPDIR:-/tmp}/sketchybar-meeting-alerts"
mkdir -p "$ALERT_STATE_DIR"

extract_teams_url() {
  printf '%s\n' "$1" \
    | perl -MHTML::Entities -ne 'decode_entities($_); while (m{https?://[^\s<>"'"'"']*teams(?:\.microsoft)?\.com[^\s<>"'"'"']*}ig) { print "$&\n"; exit }'
}

show_meeting_popup() {
  local title="$1"
  local start="$2"
  local end="$3"
  local teams_url="$4"
  local event_key="$5"
  local state_file="$ALERT_STATE_DIR/$event_key"

  if [[ -e "$state_file" ]]; then
    return
  fi

  # Mark before showing so sketchybar's frequent refreshes cannot spawn duplicates.
  touch "$state_file"

  osascript - "$title" "$start" "$end" "$teams_url" <<'APPLESCRIPT' &
on run argv
  set meetingTitle to item 1 of argv
  set meetingStart to item 2 of argv
  set meetingEnd to item 3 of argv
  set teamsUrl to item 4 of argv

  tell application "System Events"
    activate
    if teamsUrl is not "" then
      set dialogResult to display dialog "Starts now: " & meetingStart & " – " & meetingEnd & return & return & meetingTitle with title "Meeting starting now" buttons {"Dismiss", "Join Teams"} default button "Join Teams" with icon caution
      if button returned of dialogResult is "Join Teams" then
        open location teamsUrl
      end if
    else
      display dialog "Starts now: " & meetingStart & " – " & meetingEnd & return & return & meetingTitle with title "Meeting starting now" buttons {"OK"} default button "OK" with icon caution
    end if
  end tell
end run
APPLESCRIPT
}

EVENTS="$(icalBuddy -n -nc -b '' -iep 'title,datetime,url,notes' -po 'title,datetime,url,notes' -ps '/|/' -nnr ' ' -ea eventsToday)"

if [[ -z "$EVENTS" ]]; then
  sketchybar --set "$NAME" label="No meetings" background.color="$ITEM_BACKGROUND" drawing=on
  exit 0
fi

MAX_EVENTS=10
for I in $(seq 1 "$MAX_EVENTS"); do
  if sketchybar --query "${NAME}.${I}" &>/dev/null; then
    sketchybar --remove "${NAME}.${I}"
  fi
done

N=0
while IFS= read -r EVENT; do
  TITLE="$(cut -d'|' -f1 <<<"$EVENT")"
  DATETIME=""
  DETAILS=""

  IFS='|' read -r -a EVENT_PARTS <<<"$EVENT"
  for PART in "${EVENT_PARTS[@]:1}"; do
    PART="$(xargs <<<"$PART")"
    if [[ -z "$DATETIME" && "$PART" =~ ^[0-9]{1,2}:[0-9]{2}[[:space:]]*-[[:space:]]*[0-9]{1,2}:[0-9]{2} ]]; then
      DATETIME="$PART"
    else
      DETAILS+=" $PART"
    fi
  done

  if [[ -z "$DATETIME" ]]; then
    continue
  fi

  TEAMS_URL="$(extract_teams_url "$DETAILS")"
  START="$(cut -d'-' -f1 <<<"$DATETIME" | xargs)"
  END="$(cut -d'-' -f2 <<<"$DATETIME" | xargs)"

  if [[ "$N" == 0 ]]; then
    CURRENT_SECONDS="$(date +"%s")"
    START_SECONDS="$(date -j -f "%H:%M" "$START" +"%s")"
    END_SECONDS="$(date -j -f "%H:%M" "$END" +"%s")"

    if [[ "$((CURRENT_SECONDS - START_SECONDS))" -ge 0 && "$((END_SECONDS - CURRENT_SECONDS))" -gt 0 ]]; then
      BG_COLOR="$ALERT_PURPLE"
      LABEL="to ${END} - ${TITLE}"

      # Show one big, blocking macOS popup right when the meeting starts.
      if [[ "$((CURRENT_SECONDS - START_SECONDS))" -lt 60 ]]; then
        EVENT_KEY="$(printf '%s|%s|%s|%s' "$(date +%Y-%m-%d)" "$TITLE" "$START" "$END" | shasum | awk '{print $1}')"
        show_meeting_popup "$TITLE" "$START" "$END" "$TEAMS_URL" "$EVENT_KEY"
      fi
    elif [[ "$((START_SECONDS - CURRENT_SECONDS))" -le 300 ]]; then
      BG_COLOR="$ITEM_BACKGROUND"
      sketchybar --animate sin 60 \
        --bar color="$ALERT_PURPLE" \
              color="$BAR_COLOR"
      LABEL="from ${START} - ${TITLE}"
    else
      BG_COLOR="$ITEM_BACKGROUND"
      LABEL="from ${START} - ${TITLE}"
    fi

    sketchybar --set "$NAME" \
      drawing=on \
      label="$LABEL" \
      background.color="$BG_COLOR"
  elif [[ "$N" -le "$MAX_EVENTS" ]]; then
    sketchybar --add item "${NAME}.${N}" "popup.${NAME}" \
      --set "${NAME}.${N}" icon="󰃶" \
      label="${TITLE} from ${START} to ${END}"
  fi

  N=$((++N))
done <<<"$EVENTS"
