#!/usr/bin/env bash

sketchybar --add item next_meeting q \
    --set next_meeting icon=":calendar:" \
          display=1 \
          update_freq=20 \
          updates=on \
          label.max_chars=60 \
          label.scroll_duration=300 \
          scroll_texts=on \
          icon.font="sketchybar-app-font:Regular:15.0" \
          popup.background.color="$ITEM_BACKGROUND_COLOR" \
          popup.height=20 \
          script="$PLUGIN_DIR/next_meeting.sh" \
          click_script="sketchybar -m --set next_meeting popup.drawing=toggle"
