#!/usr/bin/env bash

sketchybar --add item clock right \
    --set clock icon.drawing=off \
          icon.padding_left=0 \
          icon.padding_right=0 \
          label.padding_left=12 \
          update_freq=10 \
          updates=on \
          script="$PLUGIN_DIR/clock.sh"
