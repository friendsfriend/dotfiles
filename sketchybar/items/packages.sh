#!/usr/bin/env bash

sketchybar -m --add item packages right \
              --set packages update_freq=120 \
                             script="$PLUGIN_DIR/packages.sh" \
                             click_script="bash $PLUGIN_DIR/packages.sh --upgrade" \
                             icon=""                         \
                             label="✓"
