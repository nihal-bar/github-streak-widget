# Streak widget for macOS

![image](/assets/example.png)

Using [Übersicht](https://ubersicht.macupdate.com/) one can make widgets on macOS using React/CSS. I want to track on my own device how often I push, and want to create a habit of consistency.


### You will need Übersicht for this. 
Install it first, and write a index.jsx file to /Library/Application Support/Übersicht/widgets 

You can set to poll for pushes as often as you like, currently I've set mine to 15 minutes.

``export const refreshFrequency = 15 * 60 * 1000;``

index.jsx exports a render() function that Übersicht uses to create the widget display. Write this in the created ../widgets folder. Name it as you like, it needn't be index.jsx.

```
export const refreshFrequency = 15 * 60 * 1000;

export const command =
  "cat /Users/nihal/practice-ts/github-streak-widget/streak.json";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export const render = ({ output }) => {
  if (!output) return <div>Loading...</div>;

  const data = JSON.parse(output);

  return (
    <div className="card">
      <div className="header">
        <span className="streak-number">{data.weekStreak}</span> Week Streak
      </div>

      <div className="grid">
        {DAY_LABELS.map((label, i) => (
          <div key={`label-${i}`} className="day-label">
            {label}
          </div>
        ))}

        {data.weeks.map((week, weekIdx) =>
          week.days.map((day, dayIdx) => {
            const isToday = day.date === data.today;
            const active = day.contributions > 0;

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`dot ${active ? "active" : ""} ${
                  isToday ? "today" : ""
                }`}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export const className = `
  background: #1e1e1e;
  border-radius: 16px;
  padding: 24px;
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  color: white;
  top: 20px;
  left: 20px;

  .header {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .streak-number {
    color: #e8734a;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    row-gap: 10px;
    justify-items: center;
  }

  .day-label {
    color: #999;
    font-size: 14px;
    font-weight: 600;
  }

  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3a3a3a;
  }

  .dot.active {
    background: #f0b429;
  }

  .dot.today {
    outline: 2px solid #f0b429;
    outline-offset: 2px;
    background: transparent;
  }
`;
```

### Automating the data fetch

`index.js` fetches your GitHub contribution data and writes `streak.json`, you need to run an automation for this. I don't like cron, so I used launchd via .plist file

`nano ~/Library/LaunchAgents/com.<yourname>.github-streak-widget.plist`:

Inside it, make sure to use the absolute path for node (copy and paste the result of `which node`, I use homebrew so its saved in /opt). Launchd does not parse `~`, so use absolute paths throughout.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.<yourname>.github-streak-widget</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/absolute/path/to/github-streak-widget/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/absolute/path/to/github-streak-widget</string>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>StandardOutPath</key>
    <string>/tmp/github-streak.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/github-streak-error.log</string>
</dict>
</plist>
```

**Notes:**

- `WorkingDirectory` is important: its where `dotenv` looks for `.env`, and where `index.js`'s relative `./streak.json` write lands.
- `StartInterval` is in seconds (900 = 15 min); adjust to taste.

**Load and managing the job:**

```bash
# Load it (starts running on the schedule)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.<yourname>.github-streak-widget.plist

# Force an immediate run without waiting for the interval
launchctl kickstart -k gui/$(id -u)/com.<yourname>.github-streak-widget

# Check status / last exit code
launchctl print gui/$(id -u)/com.<yourname>.github-streak-widget

# Unload it (stop the schedule)
launchctl bootout gui/$(id -u)/com.<yourname>.github-streak-widget
```

Logs land in `/tmp/github-streak.log` and `/tmp/github-streak-error.log` 


I've made it to resemble Boostcamp's UI. Shoutout [Boostcamp!](www.boostcamp.app)
