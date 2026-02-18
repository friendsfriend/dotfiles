#!/usr/bin/env bash

source "$CONFIG_DIR/colors.sh" # Loads all defined colors

sketchybar --add item apple.logo left                                           \
           --set apple.logo icon=􀣺                                              \
                 label.padding_right=0                                          \
                 label.padding_left=0                                           \
                 icon.padding_right=10                                          \
                 icon.color="$ITEM_BACKGROUND"                                  \
                 background.border_color="00000000"                             \
                 background.color="00000000"                                    \
                 icon.font="SF Pro:Black:18.0"                                  \
                 click_script="sketchybar -m --set \$NAME popup.drawing=toggle" \
           --set apple.logo popup.background.border_color="$ITEM_BACKGROUND_BORDER_COLOR"        \
                 popup.background.border_width=1                                \
                 popup.background.color="$ITEM_BACKGROUND"                                \
                 popup.background.drawing=on                                    \
           --add item apple.preferences popup.apple.logo                        \
           --set apple.preferences icon=􀺽                                       \
                 background.drawing=off                                         \
                 label="Preferences"                                            \
                 click_script="open -a 'System Preferences'; sketchybar -m --set apple.logo popup.drawing=off"\
           --add item apple.activity popup.apple.logo                           \
           --set apple.activity icon=􀒓                                          \
                 background.drawing=off                                         \
                 label="Activity"                                               \
                 click_script="open -a 'Activity Monitor'; sketchybar -m --set apple.logo popup.drawing=off"\
           --add item apple.lock popup.apple.logo                               \
           --set apple.lock icon=􀒳                                              \
                 background.drawing=off                                         \
                 label="Lock Screen"                                            \
                 click_script="pmset displaysleepnow; sketchybar -m --set apple.logo popup.drawing=off"
