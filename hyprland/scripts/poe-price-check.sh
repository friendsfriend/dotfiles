#!/usr/bin/env bash

# Get the active workspace ID (first monitor in this case)
current_ws=$(hyprctl -j monitors | jq -r '.[0].activeWorkspace.id')

if [ "$current_ws" -eq 9 ]; then
  hyprctl dispatch killactive
  hyprctl dispatch workspace 1
else
  hyprctl dispatch workspace 9
  omarchy-launch-webapp "http://localhost:5000/trade/xurl_$(wl-paste | base64)"
fi


