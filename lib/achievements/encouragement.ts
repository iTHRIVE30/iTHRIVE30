// The words that appear on a badge when it's earned.
//
// This is the whole reward now that points and rewards are gone: not "you scored 240", but
// the fact of what you did, stated plainly.
//
// VOICE - match the foundation challenge (lib/challengeStore/content/foundation-challenge.json), not a scoreboard:
//   - Short declaratives. Nothing over about twelve words. Two sentences at most.
//   - State the fact, then the truth. Never stack praise on top of praise.
//   - Contrast constructions are on-brand: "Discipline is power, not punishment."
//   - Imperative closers are on-brand: "Lean in." "Start designing."
//   - No "Bravo", no exclamation marks, no explaining the achievement back to the user.
//   - Echo the programme's own language where it genuinely fits ("Upgrade your inputs,
//     upgrade your output", "the machine that moves your mission", "Awareness is the
//     first win").
//
// An earlier version ran three sentences per badge and read like a greetings card. If a
// line here needs a comma splice to fit, it is too long - cut it.

import { Achievement, AchievementRule } from './types';

/**
 * The assumptions behind the "here's what that's worth" lines. All deliberately
 * conservative - it should never feel like an inflated claim - and all in one place so
 * they're easy to tune.
 */
export const PAYOFF_ASSUMPTIONS = {
  /** Spend on alcohol in a typical week, before stopping. */
  alcoholPerWeek: 100,
  /** Two takeaways a week at $25 each. */
  takeawayPerWeek: 50,
  /** 10,000 steps is roughly 8km for most people. */
  kmPer10kSteps: 8,
  /** "30-45 minutes" taken at the lower end. */
  hoursOfActivityPerDay: 0.5,
  /** An evening without TV gives back around two hours. */
  hoursReclaimedPerTvFreeDay: 2,
  /** The habit is "two pieces of fruit". */
  fruitPerDay: 2,
  /** The habit is "2L+ of water". */
  litresPerDay: 2,
  /** The habit is "7+ pages". */
  pagesPerDay: 7,
  /** Pages in a fairly average book, for turning pages into books. */
  pagesPerBook: 250,
};

const A = PAYOFF_ASSUMPTIONS;

// ---------------------------------------------------------------- formatting

/** Rounds to something a person would say out loud: $2,860 -> "$2,900". */
function money(amount: number): string {
  if (amount >= 1000) return `$${(Math.round(amount / 100) * 100).toLocaleString('en-US')}`;
  return `$${Math.round(amount / 10) * 10}`;
}

function num(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

// ---------------------------------------------------------------- tone by tier

type Band = 'starting' | 'building' | 'established' | 'rare';

/**
 * How hard-won this tier is. Driven by actual days, not tier index, so it works for every
 * ladder - a 3-day badge must never claim rarity.
 */
function bandFor(days: number): Band {
  if (days <= 7) return 'starting';
  if (days <= 30) return 'building';
  if (days <= 120) return 'established';
  return 'rare';
}

/** Four words, not a paragraph. */
function closer(band: Band): string {
  switch (band) {
    case 'starting': return 'This is how it starts.';
    case 'building': return 'Habit now, not experiment.';
    case 'established': return 'Mark it properly.';
    case 'rare': return 'Few get here. You did.';
  }
}

// ---------------------------------------------------------------- habit payoffs

/** The tangible fact for a habit ladder. One short sentence. */
function habitPayoff(habitId: string, days: number): string | null {
  switch (habitId) {
    case 'alcohol-free':
      return `${days} days clear. At $${A.alcoholPerWeek} a week, ${money((days / 7) * A.alcoholPerWeek)} you kept.`;
    case 'no-takeaway':
      return `${days} days cooked, not ordered. Around ${money((days / 7) * A.takeawayPerWeek)} still yours.`;
    case 'steps':
      return `${num(days * A.kmPer10kSteps)}km under your own power. Momentum is built, not found.`;
    case 'activity':
      return `${num(days * A.hoursOfActivityPerDay)} hours in motion. You didn't find the time. You made it.`;
    case 'no-tv':
      return `${num(days * A.hoursReclaimedPerTvFreeDay)} hours back. You spent them on you.`;
    case 'fruit':
      return `${num(days * A.fruitPerDay)} pieces. Nourish the machine that moves your mission.`;
    case 'water':
      return `${num(days * A.litresPerDay)} litres. Your body kept score even when you didn't.`;
    case 'reading': {
      const pages = days * A.pagesPerDay;
      const books = Math.round(pages / A.pagesPerBook);
      return books >= 1
        ? `${num(pages)} pages, about ${books} ${books === 1 ? 'book' : 'books'}. Upgrade your inputs, upgrade your output.`
        : `${num(pages)} pages. Upgrade your inputs, upgrade your output.`;
    }
    case 'selfie':
      return `${days} days on record. Proof, not memory.`;
    default:
      return null;
  }
}

const REFLECTION_PAYOFF: Record<string, (count: number) => string> = {
  intention: (n) => `${num(n)} days you chose the day before it chose you.`,
  gratitude: (n) => `${num(n)} days looking for what's good. That changes what you see.`,
  notes: (n) => `${num(n)} days you named it instead of carrying it.`,
  mood: (n) => `${num(n)} honest check-ins. Awareness is the first win.`,
};

// ---------------------------------------------------------------- the rules

function messageFor(rule: AchievementRule): string | null {
  switch (rule.kind) {
    case 'habitDays': {
      const payoff = habitPayoff(rule.habitId, rule.count);
      return payoff ? `${payoff} ${closer(bandFor(rule.count))}` : closer(bandFor(rule.count));
    }

    case 'reflectionDays': {
      const payoff = REFLECTION_PAYOFF[rule.field]?.(rule.count);
      return payoff ? `${payoff} ${closer(bandFor(rule.count))}` : closer(bandFor(rule.count));
    }

    case 'coreStreak':
      if (rule.days === 1) return 'Day one. Every streak starts here.';
      if (rule.days <= 7) return `${rule.days} days unbroken. Don't waste the hard part.`;
      if (rule.days <= 30) return `${rule.days} days, every habit, no gaps. That isn't luck.`;
      if (rule.days <= 100) return `${rule.days} days straight. You rebuilt how your days run.`;
      return `${rule.days} days in a row. One ordinary day at a time. Few get here.`;

    case 'allHabitStreak':
      return rule.days === 1
        ? 'Every habit, one day. Now you know it can be done.'
        : `Everything, every day, ${rule.days} days. ${closer(bandFor(rule.days))}`;

    case 'anyHabitDays':
      return rule.count <= 1
        ? 'You showed up. That was the job.'
        : `${num(rule.count)} days you came back. Consistency beats intensity.`;

    case 'anyHabitStreak':
      return `${rule.days} days without a gap. ${closer(bandFor(rule.days))}`;

    case 'totalCheckOffs':
      return `${num(rule.count)} habits ticked, one at a time. None of it was an accident.`;

    case 'noBlankDays':
      return `${rule.days} days, none of them empty. Bad days still counted.`;

    case 'weeklyActive':
      return `${rule.weeks} weeks without disappearing. Show up, repeat.`;

    case 'allCoreDays':
      return rule.count === 1
        ? 'All nine, one day. Now you know what a full day feels like.'
        : `${num(rule.count)} full days, every core habit. ${closer(bandFor(rule.count))}`;

    case 'fullCircleDays':
      return rule.count === 1
        ? 'Every habit and every reflection, one day. The whole thing, properly.'
        : `${num(rule.count)} complete days. Body and mind, same day.`;

    case 'comboDays':
      return `${num(rule.count)} days stacked together. Habits hold each other up.`;

    case 'comboAnyN':
      return `${num(rule.count)} days, three habits or more. The stack is the point.`;

    case 'weekendPerfect':
      return `${rule.weekends} weekends straight. Weekends are where most people stop.`;

    case 'levelComplete':
      return `Level ${rule.level}, all 30 days. Look at who you were on Day 1.`;

    case 'levelsCompleted':
      return rule.count >= 12
        ? 'Twelve Levels. A year of deliberate work. You are not that person any more.'
        : `${rule.count} full Levels. The foundation is holding.`;

    case 'levelPerfect':
      return 'A whole Level, nothing left blank. Rarer than you think.';

    case 'levelCompleteWithMiss':
      return "You missed days and finished anyway. Anyone can continue when it's easy.";

    case 'challengeOnTimeLevel':
      return 'Every response on its own day. You kept the appointment with yourself.';

    case 'challengeWordy':
      return rule.count === 1
        ? 'You gave a question more than it asked for. That is where the answers live.'
        : `${rule.count} answers that went past the prompt. That is the work nobody sees.`;

    case 'challengeStreak':
      return `${rule.days} days of reflection, unbroken. Thinking is harder than moving.`;

    case 'challengeWeekday':
      return 'Same day, week after week. Rhythm is what makes it stick.';

    case 'firstChallengeWithin24h':
      return "You didn't wait for perfect timing. Courage comes from action.";

    case 'challengeEdited':
      return 'You went back and looked again. That is how you see the distance travelled.';

    case 'levelAvgCompletion':
      return `${rule.percent}%+ across a whole Level. Not a good week. A good month.`;

    case 'monthsRising':
      return `${rule.months} months rising. Progress compounds quietly, then all at once.`;

    case 'completionMonths':
      return `${rule.percent}%+ for ${rule.months} straight months. This is what it working looks like.`;

    case 'accountMonths':
      return rule.months >= 24
        ? 'Two years. This stopped being a programme. It is how you live.'
        : `${rule.months} months in. Mark the anniversary.`;

    case 'seasonsUsed':
      return "All four seasons. The weather changed. You didn't.";

    case 'startedInMonth':
      return 'Started in January and kept going. Almost nobody does.';

    case 'moodAllValues':
      return 'The whole range logged, flat days included. Honesty is the useful part.';

    case 'moodHighStreak':
      return `${rule.days} days feeling genuinely good. Notice what you did. Repeat it.`;

    case 'moodLowDays':
      return rule.count === 1
        ? 'You logged a hard day instead of skipping it. That takes more than a good one.'
        : `${rule.count} hard days named, not hidden. That isn't weakness. It's data.`;

    case 'moodLowThenNextDay':
      return 'A one-star day, and you came back the next morning. That is the whole skill.';

    case 'habitOnLowMoodDay':
      return "You felt terrible and did it anyway. Motivation didn't carry you. You did.";

    case 'moodImprovedMonth':
      return 'Your average mood is up on last month. It is in your own numbers.';

    case 'streakThroughLowMoodWeek':
      return 'A full week held through a day that tried to break it. Resilience, measured.';

    case 'gapReturn':
      return rule.days >= 30
        ? 'A month away, and you came back. Starting again is the harder one.'
        : 'You broke off and returned. Coming back is the skill nobody celebrates.';

    case 'backfillDays':
      return rule.count === 1
        ? 'You filled in a day you missed. Nothing is lost here.'
        : `${rule.count} missed days caught up, not written off. Grace, not guilt.`;

    case 'streakRestartedNextDay':
      return 'One day off, straight back on. A slip is not a stop.';

    case 'streakBeatPrevious':
      return 'New streak beat your old best. The floor keeps rising.';

    case 'streakRebuilt':
      return `You rebuilt ${rule.days} days after losing them. The second time counts more.`;

    case 'customRenamed':
      return rule.count === 1
        ? 'You made one of these yours. This is a frame, not a cage.'
        : 'All three slots are yours. Nobody else has this exact set.';

    case 'customHabitDays':
      return `${num(rule.count)} days on a habit you chose. That one was nobody else's idea.`;

    case 'newThingEntries':
      return `${rule.count} new things tried. Curiosity is a habit too.`;

    case 'goalsSet':
      return rule.count === 1
        ? 'You wrote it down. Most people skip that part.'
        : `${rule.count} goals named. A wish is not a plan.`;

    case 'goalsAchieved':
      return rule.count === 1
        ? 'First goal, done. Look at the date you set it.'
        : `${rule.count} goals achieved. ${closer(rule.count >= 10 ? 'rare' : 'established')}`;

    case 'goalCategories':
      return rule.achieved
        ? `Finished something in ${rule.count} parts of your life. Not one at the cost of the rest.`
        : `Goals across ${rule.count} areas. Balance is a decision.`;

    case 'goalAllFields':
      return 'What, how it feels, who else it touches. The third one is why it sticks.';

    case 'goalsActive':
      return `${rule.count} goals live at once, and still on top of them.`;

    case 'goalAchievedWithin':
      return `Set and done inside ${rule.days} days. Decide properly and you move fast.`;

    case 'goalAchievedAfter':
      return `${rule.days}+ days holding on, and you finished. Slow goals change you.`;

    case 'goalsAchievedInMonth':
      return `${rule.count} ${rule.count === 1 ? 'goal' : 'goals'} in a single month. Momentum is real.`;

    case 'goalHeldMonths':
      return `${rule.months} months carrying the same goal. Some things are worth the wait.`;

    case 'archiveOpened':
      return 'You went looking for more. Everything in there is there to help.';

    case 'screensVisited':
      return rule.sameDay
        ? 'The whole app in one day. Now you know where everything is.'
        : 'You have been everywhere in here. Use what helps, ignore the rest.';

    case 'nightOwl':
      return 'Written after 11pm. Some days the words only come once it is quiet.';

    case 'earlyBird':
      return 'Done before 8am. The rest of the day is yours.';

    case 'weekdayReflectionMonth':
      return 'Every Sunday for a month. A reset you can rely on.';

    case 'goalWithTargetDate':
      return 'You gave it a date. A wish with a deadline is a plan.';

    case 'goalEdited':
      return 'You sharpened it. Goals are meant to be revised, not obeyed.';

    case 'goalArchivedAndReplaced':
      return 'You let one go and set another. Outgrowing something is not failing it.';

    case 'goalsReviewed':
      return `Back to your goals ${rule.count} times. Reviewing is the habit, not setting.`;

    // ---- transformation montages ----
    case 'montageUnlocked':
      return `Level ${rule.level}, start to finish, in your own face. Look properly.`;

    case 'montagesUnlocked':
      return `${rule.count} montages side by side. The change stopped being an opinion.`;

    case 'allMontagesUnlocked':
      return 'Every montage unlocked. Twelve levels of evidence, and all of it yours.';

    case 'montageViewed':
      return 'You watched yourself change. Most people never sit down and look.';

    case 'sideBySideViewed':
      return 'Day one beside today. The gap between them is the work.';

    case 'manual':
      return null;

    default: {
      const unreachable: never = rule;
      return unreachable;
    }
  }
}

/**
 * The encouragement shown on a badge. Always returns something - a badge with no words is
 * worse than a general one.
 */
export function encouragementFor(achievement: Achievement): string {
  return messageFor(achievement.rule) ?? 'You earned this one. Take the second it deserves.';
}
