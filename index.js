import 'dotenv/config';
import { graphql } from '@octokit/graphql';
import { writeFileSync } from 'fs';

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

const allWeeks = data.viewer.contributionsCollection.contributionCalendar.weeks;

// Take the last 5 weeks (matches the grid in your screenshot).
// GitHub's weeks are already Sunday-Saturday aligned — no need to re-derive.
const recentWeeks = allWeeks.slice(-5);

const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

// Calculate streak: walk backwards from most recent COMPLETE week.
// The current week (if still in progress) is checked separately so an
// empty-so-far week doesn't wrongly break the streak.
const isCurrentWeek = (week) =>
  week.contributionDays.some((d) => d.date === today);

let weeksToCheck = [...recentWeeks].reverse();
let weekStreak = 0;

for (const week of weeksToCheck) {
  const hasContribution = week.contributionDays.some(
    (day) => day.contributionCount > 0
  );

  if (isCurrentWeek(week)) {
    // only count it if it already has activity; otherwise skip without breaking streak
    if (hasContribution) weekStreak++;
    continue;
  }

  if (hasContribution) {
    weekStreak++;
  } else {
    break;
  }
}

console.log('Week Streak:', weekStreak);

const output = {
  today,
  weekStreak,
  weeks: recentWeeks.map((week) => ({
    days: week.contributionDays.map((day) => ({
      date: day.date,
      contributions: day.contributionCount,
    })),
  })),
};

writeFileSync('./streak.json', JSON.stringify(output, null, 2));

console.log('Saved streak.json');