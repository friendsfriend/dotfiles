#!/bin/sh

WHITE="0xffffffff"
TRANSPARENT="0x00000000"

STATUS_LABEL=$(lsappinfo info -only StatusLabel "Microsoft Outlook")
ICON=":mail:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"
    echo$LABEL

NOTIFICATION_STATUS_COLOR=$TRANSPARENT

    if [[ $LABEL == "" ]]; then
        ICON_COLOR=$WHITE
    elif [[ $LABEL == "•" ]]; then
        ICON_COLOR="0xffeed49f"
        NOTIFICATION_STATUS_COLOR=$ICON_COLOR
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        ICON_COLOR="0xffed8796"
        NOTIFICATION_STATUS_COLOR=$ICON_COLOR
    else
        ICON_COLOR=$WHITE
    fi
else
  ICON_COLOR=$WHITE
fi

sketchybar --set outlook icon=$ICON label="${LABEL}" icon.color=${ICON_COLOR}


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Microsoft Teams")
ICON=":microsoft_teams:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"

    if [[ $LABEL == "" ]]; then
        ICON_COLOR=$WHITE
    elif [[ $LABEL == "•" ]]; then
        ICON_COLOR="0xffeed49f"
        if [[ $NOTIFICATION_STATUS_COLOR != "0xffed8796" ]]; then
          NOTIFICATION_STATUS_COLOR=$ICON_COLOR
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        ICON_COLOR="0xffed8796"
    else
        ICON_COLOR=$WHITE
    fi
else
  ICON_COLOR=$WHITE
fi

sketchybar --set teams icon=$ICON label="${LABEL}" icon.color=${ICON_COLOR}


STATUS_LABEL=$(lsappinfo info -only StatusLabel "Mattermost")
ICON=":mattermost:"
if [[ $STATUS_LABEL =~ \"label\"=\"([^\"]*)\" ]]; then
    LABEL="${BASH_REMATCH[1]}"
    echo$LABEL

    if [[ $LABEL == "" ]]; then
        ICON_COLOR=$WHITE
    elif [[ $LABEL == "•" ]]; then
        ICON_COLOR="0xffeed49f"
        if [[ $NOTIFICATION_STATUS_COLOR != "0xffed8796" ]]; then
          NOTIFICATION_STATUS_COLOR=$ICON_COLOR
        fi
    elif [[ $LABEL =~ ^[0-9]+$ ]]; then
        ICON_COLOR="0xffed8796"
    else
        ICON_COLOR=$WHITE
    fi
else
  ICON_COLOR=$WHITE
fi

sketchybar --set mattermost icon=$ICON label="${LABEL}" icon.color=${ICON_COLOR}



if [[ $NOTIFICATION_STATUS_COLOR != $TRANSPARENT ]]; then
    sketchybar --set notifications background.border_color=$NOTIFICATION_STATUS_COLOR background.border_width=2
else
    sketchybar --set notifications background.border_color=$TRANSPARENT background.border_width=2
fi







