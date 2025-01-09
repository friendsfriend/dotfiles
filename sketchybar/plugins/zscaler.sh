#!/bin/bash

TRANSPARENT="0x44000000"
TRANSPARENT_PURPLE="0x884f42b5"

if pgrep -i zscaler > /dev/null; then
    sketchybar --set zscaler background.color=$TRANSPARENT_PURPLE \
               --set zscaler label="on"
else
    sketchybar --set zscaler background.color=$TRANSPARENT \
               --set zscaler label="off"
fi
