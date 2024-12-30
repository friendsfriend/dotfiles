#!/bin/bash

sketchybar --add item outlook right \
           --set outlook \
                 update_freq=5 \
                 script="$PLUGIN_DIR/notifications.sh" \
                 label.font="sketchybar-app-font:Regular:16.0" \
                 icon.font="sketchybar-app-font:Regular:16.0" \
                 click_script="open -a 'Microsoft Outlook'"\
                 background.border_width=0 \
           --subscribe outlook system_woke

sketchybar --add item teams right \
           --set teams \
                 label.font="sketchybar-app-font:Regular:16.0" \
                 icon.font="sketchybar-app-font:Regular:16.0" \
                 click_script="open -a 'Microsoft Teams'"\
                 background.border_width=0 \
           --subscribe teams system_woke

sketchybar --add item mattermost right \
           --set mattermost \
                 label.font="sketchybar-app-font:Regular:16.0" \
                 icon.font="sketchybar-app-font:Regular:16.0" \
                 click_script="open -a 'Mattermost'"\
                 background.border_width=0 \
           --subscribe mattermost system_woke

sketchybar --add bracket notifications outlook teams mattermost \
           --set notifications background.corner_radius=4  \
                               background.color=0x00000000 
