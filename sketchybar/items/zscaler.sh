#!/bin/bash

sketchybar --add item zscaler right \
           --set zscaler  update_freq=10 \
                      icon=":vpn:" \
                      icon.font="sketchybar-app-font:Regular:15.0" \
                      click_script="$PLUGIN_DIR/zscaler_on_click.sh"\
                      script="$PLUGIN_DIR/zscaler.sh"
