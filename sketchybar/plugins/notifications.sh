#!/bin/sh

source "$CONFIG_DIR/colors.sh" # Loads all defined colors

NOTIFICATION_STATUS_COLOR=$BAR_COLOR

STATUS_LABEL=$(lsappinfo info -only StatusLabel "Mail")
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"
else
    LABEL=" "
fi

sketchybar --set outlook label="${LABEL}" 


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Microsoft Teams")
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

   if [[ $LABEL == "•" ]]; then
        if [[ $NOTIFICATION_STATUS_COLOR != "$ALERT_RED" ]]; then
          NOTIFICATION_STATUS_COLOR=$ALERT_YELLOW
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$ALERT_RED
    else
        LABEL=" "
    fi
else 
  LABEL=" "
fi

sketchybar --set teams label="${LABEL}" 


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Mattermost")
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

    if [[ $LABEL == "•" ]]; then
        if [[ $NOTIFICATION_STATUS_COLOR != "$ALERT_RED" ]]; then
          NOTIFICATION_STATUS_COLOR=$ALERT_YELLOW
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$ALERT_RED
    else
        LABEL=" "
    fi
else
  LABEL=" "
fi

sketchybar --set mattermost label="${LABEL}" 

if [[ "$NOTIFICATION_STATUS_COLOR" != "$BAR_COLOR" ]]; then
  sketchybar --animate sin 60 \
           --bar color="$NOTIFICATION_STATUS_COLOR"  \
                 color="$BAR_COLOR"
fi







