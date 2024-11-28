#!/bin/sh

TRANSPARENT="0x44000000"
TRANSPARENT_RED="0x88ed8796"
TRANSPARENT_YELLOW="0x88fee49f"

NOTIFICATION_STATUS_COLOR=$TRANSPARENT

STATUS_LABEL=$(lsappinfo info -only StatusLabel "Microsoft Outlook")
ICON=":mail:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

    if [[ $LABEL == "•" ]]; then
          NOTIFICATION_STATUS_COLOR=$TRANSPARENT_YELLOW
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$TRANSPARENT_RED
    fi
fi

sketchybar --set outlook icon=$ICON label="${LABEL}" 


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Microsoft Teams")
ICON=":microsoft_teams:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

   if [[ $LABEL == "•" ]]; then
        if [[ $NOTIFICATION_STATUS_COLOR != $TRANSPARENT_RED ]]; then
          NOTIFICATION_STATUS_COLOR=$TRANSPARENT_YELLOW
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$TRANSPARENT_RED
    fi
fi

sketchybar --set teams icon=$ICON label="${LABEL}" 


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Mattermost")
ICON=":mattermost:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

    if [[ $LABEL == "•" ]]; then
        if [[ $NOTIFICATION_STATUS_COLOR != $TRANSPARENT_RED ]]; then
          NOTIFICATION_STATUS_COLOR=$TRANSPARENT_YELLOW
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        NOTIFICATION_STATUS_COLOR=$TRANSPARENT_RED
    fi
fi

sketchybar --set mattermost icon=$ICON label="${LABEL}" 

sketchybar --bar color=$NOTIFICATION_STATUS_COLOR  \
                 height=37        \
                 blur_radius=30   \
                 position=top     \
                 sticky=off       \
                 padding_left=10  \
                 padding_right=10 







