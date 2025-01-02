on run argv

  set appName to item 1 of argv

  tell application "System Events"
    set isRunning to (name of every process) contains appName
  end tell

  if not isRunning then
    tell application appName to activate
  end if

end run

