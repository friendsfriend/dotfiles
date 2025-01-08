import os, re, subprocess, datetime

class Event:
  def __init__(self, title, starttime, endtime, diff, ongoing):
      self.title = title
      self.title_cut = self.title[:100].strip()
      self.diff = diff
      self.human_diff = ':'.join(str(self.diff).split(':')[:-1])
      self.ongoing = ongoing
      self.starttime = starttime
      self.endtime = endtime 
      if self.ongoing:
          self.human_str = f"to {self.endtime} - {self.title_cut}"
      else:
          self.human_str = f"from {self.starttime} - {self.title_cut}"

  def __repr__(self):
      return f"Event(title: {self.title}, starttime: {self.starttime}, endtime: {self.endtime} diff: {self.diff}, ongoing: {self.ongoing}"

def get_events():
    datetime_format = '%d.%m.%Y at %H:%M'
    now = datetime.datetime.now()

    cmd = "icalBuddy -n -nc -nrd -npn -ea -ps '/|/' -nnr '' -b '' -ab '' -po 'title,datetime' -iep 'title,datetime' eventsFrom:today to:today"
    output = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()[0]
    lines = output.decode('utf-8').strip().split('\n')

    events = []
    event_pattern = r'^(.*?)\|(\d{2}\.\d{2}\.\d{4} at \d{2}:\d{2}) - (\d{2}:\d{2})'

    for line in lines:
        try:
            match = re.match(event_pattern, line)
            if not match:
                continue

            title, start_raw, end_raw = match.groups()
            starttime = datetime.datetime.strptime(start_raw, datetime_format)
            endtime = datetime.datetime.strptime(start_raw[:-5] + end_raw, datetime_format)

            ongoing = starttime <= now <= endtime
            diff = endtime - now if ongoing else starttime - now

            events.append(Event(title=title.strip(), diff=diff, ongoing=ongoing, starttime=starttime.strftime('%H:%M'), endtime=endtime.strftime('%H:%M')))
        except Exception as e:
            print(f"Error processing line: {line}, Error: {e}")

    return events

def plugin_undraw():
  now = datetime.datetime.now().strftime('%d.%m.%Y %H:%M')

  print(now)

  args = [
      f'--set calendar_with_meetings label="{now}"',
      f'--set calendar_with_meetings background.color={"0x44000000"}'
  ]
  os.system('sketchybar -m ' + ' '.join(args))

def plugin_draw(firstEvent, popup_items):
    now = datetime.datetime.now().strftime('%d.%m.%Y %H:%M')
    bg_color = determineBgColor(firstEvent)

    args = [
        f'--set calendar_with_meetings label="{now + ' | ' + firstEvent.human_str}"',
        f'--set calendar_with_meetings background.color={bg_color}'
        '--set calendar_with_meetings drawing=on',
    ]

    for j in range(20):
        query_cmd = f'sketchybar --query calendar_with_meetings.{j}'
        if os.system(query_cmd) == 0:  # If the item exists
            os.system(f'sketchybar --remove calendar_with_meetings.{j}')

    for i, item in enumerate(popup_items):
        args += [
            f'--add item calendar_with_meetings.{i} popup.calendar_with_meetings',
            f'--set calendar_with_meetings.{i} background.padding_left=10',
            f'--set calendar_with_meetings.{i} background.padding_right=10',
            f'--set calendar_with_meetings.{i} label="{item["text"]}"',
        ]
    print(args)
    os.system('sketchybar -m ' + ' '.join(args))

def determineBgColor(event):
    transparent="0x44000000"
    transparent_purple="0x884f42b5"
    alert_red = "0x88ed8796"  # Define the red color for alert

    now = datetime.datetime.now()
    starttime = datetime.datetime.strptime(event.starttime, '%H:%M').replace(
        year=now.year, month=now.month, day=now.day
    )
    time_to_start = starttime - now

    if event.ongoing:
        return transparent_purple
    elif datetime.timedelta(0) <= time_to_start <= datetime.timedelta(minutes=5):
        return alert_red

    return transparent

if __name__ == '__main__':
  events = get_events()
  if len(events) == 0:
      plugin_undraw()
  else:
      plugin_draw(events[0], ({'text': e.human_str} for e in events))
