// Reads scripts/source/achievements.xlsx (Sharyn's master achievements sheet) and rewrites
// lib/achievements/data.ts with a typed, machine-evaluable entry per achievement.
//
//   npm run sync-achievements
//
// The spreadsheet is the source of truth for names, requirement wording and point values.
// The *rules* - the bit the app can actually evaluate - come from two places:
//   1. Regex patterns below, for the big regular ladders (Habit Mastery, Reflection, Streak).
//   2. BESPOKE_RULES, a hand-written lookup keyed by the sheet's own "#" column, for the
//      one-off achievements whose wording doesn't follow a pattern.
//
// Anything with no rule becomes { kind: 'manual' } and shows in the app as permanently
// locked with a reason - that's the honest state for Teams, transformation montages, etc.,
// which describe features that don't exist yet.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SOURCE = path.join(__dirname, 'source', 'achievements.xlsx');
const OUTPUT = path.join(__dirname, '..', 'lib', 'achievements', 'data.ts');

// ---------------------------------------------------------------- xlsx reading

function readZip(buf) {
  const out = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd === -1) throw new Error('Not a zip / xlsx file');
  const n = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
    const name = buf.toString('utf8', off + 46, off + 46 + nl);
    const lho = buf.readUInt32LE(off + 42);
    const ds = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const cs = buf.readUInt32LE(off + 20);
    out[name] = buf.readUInt16LE(off + 10) === 0
      ? buf.slice(ds, ds + cs)
      : zlib.inflateRawSync(buf.slice(ds, ds + cs));
    off += 46 + nl + el + cl;
  }
  return out;
}

const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');

function readAchievementRows() {
  const zip = readZip(fs.readFileSync(SOURCE));
  const shared = [];
  if (zip['xl/sharedStrings.xml']) {
    for (const m of zip['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      let text = '';
      for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
      shared.push(decodeXml(text));
    }
  }
  const sheet = zip['xl/worksheets/sheet1.xml'].toString('utf8');
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const c of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const col = (/\br="([A-Z]+)\d+"/.exec(c[1]) || [])[1];
      const type = (/\bt="([^"]*)"/.exec(c[1]) || [])[1] || 'n';
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[2]);
      let value = '';
      if (type === 's' && v) value = shared[+v[1]];
      else if (type === 'inlineStr') { const i = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2]); value = i ? decodeXml(i[1]) : ''; }
      else if (v) value = decodeXml(v[1]);
      if (col && value !== '') cells[col] = value;
    }
    if (cells.A && /^\d+$/.test(cells.A)) {
      rows.push({
        n: +cells.A,
        category: cells.B,
        tier: cells.C ? +cells.C : null,
        name: cells.D,
        requirement: cells.E,
        points: +cells.F,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------- rule derivation

// Habit Mastery requirement wording -> the habit id it actually tracks in habitStore.
const HABIT_SUBJECTS = [
  [/physical activity/i, 'activity'],
  [/10,000\+ steps/i, 'steps'],
  [/alcohol-free day/i, 'alcohol-free'],
  [/no-TV day/i, 'no-tv'],
  [/Skip takeaway/i, 'no-takeaway'],
  [/pieces of fruit/i, 'fruit'],
  [/water intake/i, 'water'],
  [/pages read/i, 'reading'],
  [/daily selfie/i, 'selfie'],
];

// Reflection & Mindset wording -> the reflection field it tracks.
// NOTE: "Evening Reflection" is mapped to `notes`. The standalone evening-reflection field was
// replaced on the Today tab by freeform timestamped notes, which are its direct successor.
const REFLECTION_SUBJECTS = [
  [/Set Today's Intention/i, 'intention'],
  [/3-part gratitude/i, 'gratitude'],
  [/Evening Reflection/i, 'notes'],
  [/daily mood/i, 'mood'],
];

function derivePatternRule(row) {
  const req = row.requirement;

  if (row.category === 'Habit Mastery') {
    const count = /\b(\d+)\s+total (?:days|times)\b/.exec(req);
    const subject = HABIT_SUBJECTS.find(([re]) => re.test(req));
    if (count && subject) return { kind: 'habitDays', habitId: subject[1], count: +count[1] };
  }

  if (row.category === 'Reflection & Mindset') {
    const count = /\b(\d+)\s+total (?:days|times)\b/.exec(req);
    const subject = REFLECTION_SUBJECTS.find(([re]) => re.test(req));
    if (count && subject) return { kind: 'reflectionDays', field: subject[1], count: +count[1] };
  }

  if (row.category === 'Daily Streak') {
    if (/for 1 full day/i.test(req)) return { kind: 'coreStreak', days: 1 };
    const days = /\b(\d+)\s+days? in a row\b/.exec(req);
    if (days) return { kind: 'coreStreak', days: +days[1] };
  }

  return null;
}

// One-off rules, keyed by the "#" column so re-ordering the sheet can't silently mis-assign
// them. `manual` entries carry the reason the app can't award them yet.
const NEEDS_TEAMS = { kind: 'manual', reason: 'Needs Teams (requires a backend)' };
const NEEDS_MONTAGE = { kind: 'manual', reason: 'Needs the selfie montage feature' };

const BESPOKE_RULES = {
  // ---- Challenge & Program
  203: { kind: 'levelComplete', level: 1 },
  204: { kind: 'levelComplete', level: 2 },
  205: { kind: 'levelComplete', level: 3 },
  206: { kind: 'levelPerfect' },
  207: { kind: 'levelsCompleted', count: 3 },
  208: { kind: 'levelsCompleted', count: 6 },
  209: { kind: 'levelsCompleted', count: 12 },
  210: { kind: 'challengeEdited' },
  211: { kind: 'challengeWordy', words: 100, count: 1 },
  212: { kind: 'challengeWordy', words: 100, count: 10 },
  213: { kind: 'challengeStreak', days: 14 },
  214: { kind: 'challengeOnTimeLevel' },

  // ---- Compound Growth
  215: { kind: 'anyHabitDays', count: 30 },
  216: { kind: 'anyHabitDays', count: 60 },
  217: { kind: 'anyHabitDays', count: 100 },
  218: { kind: 'anyHabitStreak', days: 90 },
  219: { kind: 'anyHabitDays', count: 180 },
  220: { kind: 'anyHabitDays', count: 365 },
  221: { kind: 'anyHabitDays', count: 730 },
  222: { kind: 'anyHabitDays', count: 1000 },
  223: { kind: 'totalCheckOffs', count: 1000 },
  224: { kind: 'totalCheckOffs', count: 5000 },
  225: { kind: 'totalCheckOffs', count: 10000 },
  // These four described the old points multiplier, which no longer exists - the app
  // dropped points in favour of per-badge encouragement. The underlying milestone (having
  // unlocked Level 2 / 4 / 8 / 12) is still real and still worth marking, so they're
  // re-mapped to that, and TEXT_OVERRIDES below rewrites their wording to match.
  226: { kind: 'levelsCompleted', count: 1 },
  227: { kind: 'levelsCompleted', count: 3 },
  228: { kind: 'levelsCompleted', count: 7 },
  229: { kind: 'levelsCompleted', count: 11 },
  230: { kind: 'noBlankDays', days: 90 },
  231: { kind: 'levelAvgCompletion', percent: 80 },
  232: { kind: 'monthsRising', months: 2, allowHold: false },
  233: { kind: 'monthsRising', months: 3, allowHold: false },
  234: { kind: 'monthsRising', months: 6, allowHold: true },
  235: { kind: 'weeklyActive', weeks: 26 },
  236: { kind: 'weeklyActive', weeks: 52 },
  237: { kind: 'accountMonths', months: 24 },
  238: { kind: 'completionMonths', percent: 90, months: 6 },

  // ---- Resilience & Comeback
  239: { kind: 'backfillDays', count: 1 },
  240: { kind: 'gapReturn', days: 3 },
  241: { kind: 'gapReturn', days: 7 },
  242: { kind: 'gapReturn', days: 30 },
  243: { kind: 'allHabitStreak', days: 7 },
  244: { kind: 'backfillDays', count: 5 },
  245: { kind: 'backfillDays', count: 10 },
  246: { kind: 'anyHabitDays', count: 180 },
  247: { kind: 'levelCompleteWithMiss' },
  248: { kind: 'habitOnLowMoodDay' },
  249: { kind: 'streakRestartedNextDay' },
  250: { kind: 'streakBeatPrevious' },

  // ---- Mood & Emotional Growth
  251: { kind: 'moodLowThenNextDay' },
  252: { kind: 'moodHighStreak', min: 4, days: 5 },
  253: { kind: 'moodImprovedMonth' },
  254: { kind: 'moodAllValues' },
  255: { kind: 'moodLowDays', count: 1 },
  256: { kind: 'reflectionDays', field: 'mood', count: 30 },
  257: { kind: 'moodLowDays', count: 10 },
  258: { kind: 'streakThroughLowMoodWeek' },
  259: { kind: 'reflectionDays', field: 'mood', count: 365 },

  // ---- Personalization
  260: { kind: 'customRenamed', count: 1 },
  261: { kind: 'customRenamed', count: 3 },
  262: { kind: 'newThingEntries', count: 10 },
  263: { kind: 'customHabitDays', count: 30, sameSlot: true },
  264: { kind: 'customHabitDays', count: 60, sameSlot: false },
  265: { kind: 'customHabitDays', count: 180, sameSlot: true },

  // ---- Social & Team (all blocked on the multi-user backend)
  266: NEEDS_TEAMS, 267: NEEDS_TEAMS, 268: NEEDS_TEAMS, 269: NEEDS_TEAMS, 270: NEEDS_TEAMS,
  271: NEEDS_TEAMS, 272: NEEDS_TEAMS, 273: NEEDS_TEAMS, 274: NEEDS_TEAMS, 275: NEEDS_TEAMS,
  276: NEEDS_TEAMS, 277: NEEDS_TEAMS, 278: NEEDS_TEAMS,

  // ---- Selfie & Transformation
  // The montage feature exists now (lib/montageStore.ts + app/(tabs)/montage.tsx), so these
  // are real rules rather than `manual`. The four Level montages still can't be earned in
  // practice until Levels 4-12 have written content - but that's the content backlog doing
  // the gating, which is honest, rather than the app claiming the feature is missing.
  279: { kind: 'montageUnlocked', level: 4 },
  280: { kind: 'montageUnlocked', level: 6 },
  281: { kind: 'montageUnlocked', level: 10 },
  282: { kind: 'montageUnlocked', level: 12 },
  283: { kind: 'sideBySideViewed' },
  284: { kind: 'montagesUnlocked', count: 2 },
  285: { kind: 'allMontagesUnlocked' },
  286: { kind: 'montageViewed' },

  // ---- Meta & App Engagement
  287: { kind: 'anyHabitDays', count: 1 },
  288: { kind: 'anyHabitDays', count: 1 },
  289: { kind: 'allHabitStreak', days: 1 },
  290: { kind: 'allHabitStreak', days: 7 },
  291: { kind: 'allHabitStreak', days: 30 },
  292: { kind: 'allHabitStreak', days: 90 },
  293: { kind: 'archiveOpened' },
  294: { kind: 'screensVisited', sameDay: false },
  295: { kind: 'nightOwl' },
  296: { kind: 'earlyBird' },
  297: { kind: 'streakRebuilt', days: 7 },
  298: { kind: 'seasonsUsed', count: 4 },
  299: { kind: 'screensVisited', sameDay: true },
  300: { kind: 'accountMonths', months: 12 },
  301: { kind: 'accountMonths', months: 24 },

  // ---- Seasonal & Special
  302: { kind: 'startedInMonth', month: 1 },
  303: { kind: 'manual', reason: 'Needs per-Level start dates' },
  304: { kind: 'accountMonths', months: 12 },
  305: { kind: 'accountMonths', months: 24 },
  306: { kind: 'challengeWeekday', weekday: 1, count: 4 },
  307: { kind: 'weekdayReflectionMonth', weekday: 0 },
  308: { kind: 'firstChallengeWithin24h' },
  309: { kind: 'manual', reason: 'Needs local weather / location data' },
  310: { kind: 'manual', reason: 'Needs local weather / location data' },
  311: { kind: 'manual', reason: 'Needs a date of birth in your profile' },

  // ---- Combo & Multi-Habit ('r:' prefixed ids are reflection fields, not habits)
  312: { kind: 'comboDays', ids: ['activity', 'r:notes'], count: 5 },
  313: { kind: 'comboDays', ids: ['fruit', 'water'], count: 10 },
  314: { kind: 'comboDays', ids: ['alcohol-free', 'no-tv', 'no-takeaway'], count: 7 },
  315: { kind: 'comboDays', ids: ['activity', 'reading', 'water'], count: 10 },
  316: { kind: 'comboDays', ids: ['fruit', 'water', 'no-takeaway'], count: 15 },
  317: { kind: 'allCoreDays', count: 1 },
  318: { kind: 'allCoreDays', count: 10 },
  319: { kind: 'allCoreDays', count: 30 },
  320: { kind: 'allCoreDays', count: 100 },
  321: { kind: 'comboDays', ids: ['activity', 'reading', 'r:notes'], count: 10 },
  322: { kind: 'comboDays', ids: ['r:intention', 'r:gratitude', 'r:notes'], count: 10 },
  323: { kind: 'fullCircleDays', count: 1 },
  324: { kind: 'comboDays', ids: ['no-tv', 'alcohol-free'], count: 20 },
  325: { kind: 'comboDays', ids: ['fruit', 'water', 'activity'], count: 20 },
  326: { kind: 'comboDays', ids: ['no-tv', 'r:gratitude'], count: 15 },
  327: { kind: 'comboDays', ids: ['steps', 'selfie'], count: 15 },
  328: { kind: 'comboDays', ids: ['no-takeaway', 'alcohol-free'], count: 15 },
  329: { kind: 'comboDays', ids: ['reading', 'r:notes'], count: 15 },
  330: { kind: 'fullCircleDays', count: 5 },
  331: { kind: 'weekendPerfect', weekends: 4 },
  332: { kind: 'comboAnyN', n: 3, count: 30 },

  // ---- Goals & My Journey
  333: { kind: 'goalsSet', count: 1 },
  334: { kind: 'goalAllFields' },
  335: { kind: 'goalCategories', count: 2, achieved: false },
  336: { kind: 'goalCategories', count: 3, achieved: false },
  337: { kind: 'goalCategories', count: 4, achieved: false },
  338: { kind: 'goalWithTargetDate' },
  339: { kind: 'goalsAchieved', count: 1 },
  340: { kind: 'goalCategories', count: 2, achieved: true },
  341: { kind: 'goalCategories', count: 4, achieved: true },
  342: { kind: 'goalsAchieved', count: 3 },
  343: { kind: 'goalsAchieved', count: 5 },
  344: { kind: 'goalsAchieved', count: 10 },
  345: { kind: 'goalsAchieved', count: 25 },
  346: { kind: 'goalsAchieved', count: 50 },
  347: { kind: 'goalEdited' },
  348: { kind: 'goalAchievedWithin', days: 30 },
  349: { kind: 'goalAchievedAfter', days: 90 },
  350: { kind: 'goalsReviewed', count: 10 },
  351: { kind: 'goalsActive', count: 3 },
  352: { kind: 'goalAchievedAfter', days: 180 },
  353: { kind: 'goalsAchievedInMonth', count: 1 },
  354: { kind: 'goalsAchievedInMonth', count: 2 },
  355: { kind: 'goalCategories', count: 4, achieved: true },
  356: { kind: 'goalArchivedAndReplaced' },
  357: { kind: 'goalHeldMonths', months: 12 },
};

/**
 * Requirement wording that no longer matches the app, keyed by the sheet's "#" column.
 * The spreadsheet is still the source of truth for names and tiers; this is only for text
 * that describes a mechanic that has since been removed.
 */
const TEXT_OVERRIDES = {
  226: 'Unlock Level 2 by completing Level 1',
  227: 'Unlock Level 4 by completing Level 3',
  228: 'Unlock Level 8 by completing Level 7',
  229: 'Unlock Level 12 by completing Level 11',
};

// ---------------------------------------------------------------- emit

const rows = readAchievementRows();
if (rows.length === 0) {
  console.error('No achievement rows found - is scripts/source/achievements.xlsx the right file?');
  process.exit(1);
}

let patternCount = 0;
let bespokeCount = 0;
let manualCount = 0;

const entries = rows.map((row) => {
  let rule = BESPOKE_RULES[row.n];
  if (rule) bespokeCount += 1;
  else {
    rule = derivePatternRule(row);
    if (rule) patternCount += 1;
  }
  if (!rule) rule = { kind: 'manual', reason: 'Not yet trackable in the app' };
  if (rule.kind === 'manual') manualCount += 1;
  const requirement = TEXT_OVERRIDES[row.n] || row.requirement;
  return { ...row, requirement, id: `a${row.n}`, rule };
});

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function ruleLiteral(rule) {
  const parts = Object.entries(rule).map(([k, v]) =>
    `${k}: ${typeof v === 'string' ? q(v) : JSON.stringify(v)}`
  );
  return `{ ${parts.join(', ')} }`;
}

const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);

const out = `// ============================================================================
// AUTO-GENERATED by scripts/generate-achievements.js - DO NOT EDIT BY HAND.
// Source of truth: scripts/source/achievements.xlsx
// Regenerate with: npm run sync-achievements
//
// ${entries.length} achievements - ${totalPoints.toLocaleString('en-US')} base points available.
// ${patternCount} rules derived from requirement wording, ${bespokeCount} hand-mapped,
// ${manualCount} not yet trackable (shown in the app as locked, with a reason).
// ============================================================================

import { Achievement } from './types';

export const ACHIEVEMENTS: Achievement[] = [
${entries
  .map(
    (e) => `  {
    id: ${q(e.id)},
    category: ${q(e.category)},
    tier: ${e.tier === null ? 'null' : e.tier},
    name: ${q(e.name)},
    requirement: ${q(e.requirement)},
    points: ${e.points},
    rule: ${ruleLiteral(e.rule)},
  },`
  )
  .join('\n')}
];

/** Sum of every achievement's base points, before any Level multiplier. */
export const TOTAL_POINTS_AVAILABLE = ${totalPoints};
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, out);

console.log(`Wrote ${entries.length} achievements (${totalPoints.toLocaleString('en-US')} points) to lib/achievements/data.ts`);
console.log(`  ${patternCount} pattern-derived, ${bespokeCount} hand-mapped, ${manualCount} manual/locked`);

const byCategory = {};
entries.forEach((e) => {
  byCategory[e.category] = byCategory[e.category] || { total: 0, manual: 0 };
  byCategory[e.category].total += 1;
  if (e.rule.kind === 'manual') byCategory[e.category].manual += 1;
});
Object.entries(byCategory).forEach(([cat, s]) => {
  console.log(`  ${cat}: ${s.total}${s.manual ? ` (${s.manual} locked)` : ''}`);
});
