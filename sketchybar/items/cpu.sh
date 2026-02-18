#!/usr/bin/env bash

sketchybar --add item cpu right \
           --set cpu  update_freq=2 \
                      icon=":cpu:" \
                      icon.font="sketchybar-app-font:Regular:15.0" \
                      script="$PLUGIN_DIR/cpu.sh"
