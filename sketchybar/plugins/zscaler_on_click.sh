#!/bin/bash

# Check if Zscaler is running
if pgrep -i zscaler > /dev/null; then
    # If running, stop Zscaler (using 'kill' or an appropriate method to disable it)
    echo "Zscaler is running, stopping it..."
    # Replace this with the appropriate command to stop Zscaler, e.g.:
    sudo pkill -f zscaler
    # Optionally, you can also disable Zscaler using its service commands if applicable:
    # sudo launchctl bootout system /Library/LaunchDaemons/com.zscaler.zscaleragent.plist
else
    # If not running, start Zscaler (using the appropriate method to start it)
    echo "Zscaler is not running, starting it..."
    # Replace this with the appropriate command to start Zscaler
    sudo /Applications/Zscaler/zscalerapp & # Modify path if necessary
    # Or use another method to start Zscaler
fi
