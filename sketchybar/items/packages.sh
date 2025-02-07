#!/bin/bash

sketchybar -m --add item packages right \
              --set packages update_freq=120 \
                             script="$PLUGIN_DIR/packages.sh" \
                             click_script="sketchybar --set packages label=''; brew upgrade ; ./$PLUGIN_DIR/packages.sh" \
                             icon=""                         \
                             label=""
