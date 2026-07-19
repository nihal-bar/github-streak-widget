# Streak widget for macOS

[!image](/assets/example.png)

Using Übersicht one can make widgets on macOS using React/CSS. I want to track on my own device how often I push, and want to create a habit of consistency.


##### You will need Übersicht for this. 
Install it first, and write a index.jsx file to /Library/Application Support/Übersicht/widgets 

You can set the cron job to poll for pushes as often as you like, currently I've set mine to 15 minutes.

``export const refreshFrequency = 15 * 60 * 1000;``

index.jsx exports a render() function that Übersicht uses to create the widget display

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


I've made it to resemble Boostcamp's UI. Attached is an image of the
