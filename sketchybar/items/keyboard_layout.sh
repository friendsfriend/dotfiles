#!/usr/bin/env bash

sketchybar --add item keyboard_layout right \
           --set keyboard_layout \
                 icon="󰌌" \
                 script="$PLUGIN_DIR/keyboard_layout.sh" \
                 click_script="$PLUGIN_DIR/keyboard_layout.sh" \
           --subscribe keyboard_layout mouse.clicked
