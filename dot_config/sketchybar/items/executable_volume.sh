#!/bin/bash

sketchybar --add item volume right \
           --set volume script="$PLUGIN_DIR/volume.sh" icon.font="sketchybar-app-font:Regular:16.0" \
                 background.border_width=0 \
           --subscribe volume volume_change \
