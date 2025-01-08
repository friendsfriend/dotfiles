#!/bin/bash

sketchybar --add item outlook right \
           --set outlook \
                 update_freq=5 \
                 script="$PLUGIN_DIR/notifications.sh" \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Microsoft Outlook'"\
                 icon=":mail:"\
                 background.border_width=0 \
           --subscribe outlook system_woke

sketchybar --add item teams right \
           --set teams \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Microsoft Teams'"\
                 icon=":microsoft_teams:"\
                 background.border_width=0 \
           --subscribe teams system_woke

sketchybar --add item mattermost right \
           --set mattermost \
                 icon.font="sketchybar-app-font:Mono:15.0" \
                 click_script="open -a 'Mattermost'"\
                 icon=":mattermost:"\
                 background.border_width=0 \
           --subscribe mattermost system_woke
