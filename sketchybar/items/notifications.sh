#!/usr/bin/env bash

sketchybar --add item outlook e \
           --set outlook \
                 display=1  \
                 update_freq=5 \
                 script="$PLUGIN_DIR/notifications.sh" \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Mail'" \
                 icon=":mail:" \
           --subscribe outlook system_woke

sketchybar --add item teams e \
           --set teams \
                 display=1  \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Microsoft Teams'" \
                 icon=":microsoft_teams:" \
           --subscribe teams system_woke

sketchybar --add item mattermost e \
           --set mattermost \
                 display=1  \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Mattermost'" \
                 icon=":mattermost:" \
           --subscribe mattermost system_woke
