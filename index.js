import 'dotenv/config';
import { graphql } from '@octokit/graphql';

const client = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const data = await client(`
{
  viewer {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`);

const weeks = data.viewer.contributionsCollection.contributionCalendar.weeks;

const days = weeks.flatMap(week => week.contributionDays);

const currentMonth = "2026-07"; //TODO remove hardcode value

const monthDays = days.filter(day => 
  day.date.startsWith(currentMonth)
);

const weeksWithActivity = monthDays.reduce((weeks, day) => {
  const weekNumber = 
  Math.floor(
    (new Date(day.date).getDate() - 1)/7
  );


  if (!weeks[weekNumber]) {
    weeks[weekNumber] = [];
  }

  weeks[weekNumber].push(day);

  return weeks;
}, []);

let weekStreak = 0;

for(const week of weeksWithActivity.reverse()) {
  const hasContribution = week.some(day => day.contributionCount > 0);

  if (hasContribution) {
    weekStreak++;
  } else {
    break;
  }
}


console.log("Week Streak :",weekStreak);
