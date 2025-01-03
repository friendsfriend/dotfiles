#!/bin/bash

sketchybar -m --add item calendar_with_meetings left \
    --set calendar_with_meetings icon=":calendar:" \
          update_freq=20 \
          updates=on \
          label.max_chars=75\
          label.scroll_duration=300\
          scroll_texts=on\
          icon.font="sketchybar-app-font:Regular:16.0" \
          popup.background.color=0x88000000 \
          popup.height=20 \
          script="python3 $PLUGIN_DIR/calendar_with_meetings.py" \
          click_script="sketchybar -m --set calendar_with_meetings popup.drawing=toggle"
