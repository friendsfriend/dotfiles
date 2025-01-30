#!/bin/bash

source "$CONFIG_DIR/colors.sh" # Loads all defined colors

if sudo launchctl list | grep zscaler > /dev/null; then
    sketchybar --set zscaler background.color="$ALERT_PURPLE" \
               --set zscaler click_script="sudo /opt/scripts/zscaler-kill.sh stop" \
               --set zscaler label="on"
else
    sketchybar --set zscaler background.color=$ITEM_BACKGROUND \
               --set zscaler click_script="sudo /opt/scripts/zscaler-kill.sh start" \
               --set zscaler label="off"
fi
