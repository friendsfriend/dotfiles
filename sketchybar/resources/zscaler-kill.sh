#!/bin/zsh

OP="$1"

if [ "$OP" = "start" ]
then
	launchctl load /Library/LaunchDaemons/com.zscaler.service.plist
	launchctl load /Library/LaunchDaemons/com.zscaler.tunnel.plist
	sleep 3
	ps -ax | grep MacOS/Zscaler | grep -v grep | awk -F' ' '{print $1}' | xargs kill
elif [ "$OP" = "stop" ]
then
	launchctl unload /Library/LaunchDaemons/com.zscaler.service.plist
	launchctl unload /Library/LaunchDaemons/com.zscaler.tunnel.plist
	ps -ax | grep Zscaler | grep -v grep | awk -F' ' '{print $1}' | xargs kill
else
	echo "Usage: $0 [start|stop]"
	exit 1
fi
