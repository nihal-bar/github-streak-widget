### Streak widget

Using Übersicht one can make widgets on macOS using React/CSS. I want to track on my own device how often I push, and want to create a habit of consistency.


##### You will need Übersicht for this. 
Install it first, and write a index.jsx file to /Library/Application Support/Übersicht/widgets 

You can set the cron job to poll for pushes as often as you like, currently I've set mine to 15 minutes.

``export const refreshFrequency = 15 * 60 * 1000;``

index.jsx exports a render() function that Übersicht uses to create the widget display

´´´
export const refreshFrequency = 15 * 60 * 1000; 
export const command = "cat streak.json"; // Update this relative to the streak.json file location created by index.js in this project

export const render = ({ output }) => {
  if (!output) return <div>Loading...</div>;

  const data = JSON.parse(output);

  return (
    <div className="streak-widget">
      <div className="streak-count">🔥 {data.weekStreak} week streak</div>
      <div className="days">
        {data.days.map(day => (
          <div
            key={day.date}
            className="day"
            style={{ opacity: day.contributions > 0 ? 1 : 0.2 }}
            title={`${day.date}: ${day.contributions}`}
          />
        ))}
      </div>
    </div>
  );
};

export const className = `
  top: 20px;
  left: 20px;
  color: white;
  font-family: -apple-system;

  .day {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin: 2px;
    background: #39d353;
    border-radius: 2px;
  }
`;
´´´


Now you will have to also make a launch daemon to poll every 15 minutes.
