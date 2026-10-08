# Build brief: habit frequency for editable habits

Brand: iTHRIVE30
Date: 8 October 2026
From: chat (Copy stage), approved in principle by Andrew
For: Claude Code, iTHRIVE30 app repo
Status: ready to build. Copy marked DRAFT still needs Sharyn's approval through Andrew.

## The change in one line

The bottom three habits, the ones a Thriver writes themselves, each get a frequency: **daily**, **weekly** or **one-off**. Only daily habits decide a 100% day.

## Why

A 100% day should reward consistency, not punish ambition. A one-off stretch such as skydiving, a bucket-list goal or learning one new thing gives the strongest reward when it lands as a bonus. If it's counted as a daily requirement, it pulls the score down every day it hasn't happened yet. That turns a stretch into a reason to quit.

## Scope

**In**
- Frequency setting on the three editable habits only
- Scoring rules below
- Stretch wins logged to the Wins tab
- Data migration with existing habit ids unchanged

**Out**
- The 10 fixed habits. Their wording, order, ids and behaviour stay unchanged.
- Streak and missed-day wording. This is under a separate foundation check. Don't change it here, but make sure nothing in this build makes it harder to change later.
- Anything after Day 30

## Before building

1. Read how the 13 habits are stored and how the daily percentage and streak are calculated today.
2. Draft `BUILD.md` for this change and confirm it with Andrew before large edits.

## Rules

### Setting the frequency
- Each of the three editable habits has a frequency: `daily` | `weekly` | `one_off`.
- The default is `daily`, so existing users see no change until they choose one.
- The Thriver sets it when creating or editing the habit, using a simple three-way choice.
- A change applies from the next day. Past days are never recalculated.

### Daily
- Due every day.
- Counts toward the daily percentage, exactly as today.

### Weekly
- Due once per challenge week. Weeks follow the challenge rhythm: Days 1 to 7, 8 to 14, 15 to 21 and 22 to 28. Days 29 and 30 count as a short closing window.
- It can be completed on any day of its week.
- It is **never** part of the daily percentage. A day can be 100% whether or not the weekly habit is done.
- Shows week progress, for example "done this week" or "not yet this week".
- If it isn't done by the reflection day (7, 14, 21, 28), show a gentle prompt on that day. No red mark, no penalty, no effect on the streak.

### One-off
- Done once, with an optional target date.
- It is **never** part of the daily or weekly score, and it never lowers anything.
- When completed:
  - it counts as a **stretch win**
  - it is added to the Wins tab with the habit name and date
  - the Thriver can set a new one-off in that slot straight away
- A one-off still open at Day 30 stays open. It doesn't count as failed.

### The 100% day

```
day_percent = completed daily habits due today / daily habits due today
```

This covers the 10 fixed habits plus any editable habit set to daily. Weekly and one-off habits are excluded from both sides of the calculation.

Whatever the streak counts today, it must keep counting only daily habits. Weekly and one-off habits can never break a streak.

## Data

- Add a `frequency` field to the editable habits, defaulting to `daily`.
- One-off habits also store `target_date` (optional) and `completed_at`.
- Weekly habits store completions with the challenge week they belong to.
- Leave all existing habit ids and stored answers untouched.

## Copy

Chat owns every word here. Use these as placeholders in code under the ids shown, and log any change you need in `CHANGES.md`.

| Copy id | Draft |
|---|---|
| `habits.frequency.label` | DRAFT: how often |
| `habits.frequency.daily` | DRAFT: daily |
| `habits.frequency.weekly` | DRAFT: weekly |
| `habits.frequency.one_off` | DRAFT: one time |
| `habits.one_off.target_date` | DRAFT: by when (optional) |
| `habits.weekly.done` | DRAFT: done this week |
| `habits.weekly.not_yet` | DRAFT: not yet this week |
| `habits.weekly.reflection_prompt` | [[habits.weekly.reflection_prompt — MISSING]] |
| `wins.stretch.title` | [[wins.stretch.title — MISSING]] |
| `wins.stretch.message` | [[wins.stretch.message — MISSING]] |

The MISSING lines need Sharyn's voice, so they come back from chat after Andrew approves them.

## Acceptance checks

- A Thriver can set each editable habit to daily, weekly or one-off. The fixed 10 can't be changed.
- All daily habits done, weekly not done, one-off open: the day shows **100%**.
- A weekly habit done on any day of its week counts for that week only.
- A missed weekly habit triggers a gentle prompt on reflection day, with no change to the score or streak.
- Completing a one-off adds a stretch win to the Wins tab and frees the slot.
- An existing user's habits default to daily, and their past percentages and stored answers are unchanged.
- No colours, fonts or spacing are hardcoded. The build uses existing iTHRIVE30 tokens.

## Open decisions for Andrew

- [Should the admin programme builder suggest one-off prompts on certain days, such as "try one new thing" on stretch days 5 and 6? Not in this build unless you say yes.]
- [Should a stretch win earn its own badge, or is the Wins tab entry enough?]

---

## Paste into Claude Code

Use the copy-design-code skill. I'm continuing iTHRIVE30 at Phase 3, Build, for one feature: habit frequency on the three editable habits.
Brand: iTHRIVE30 (confirmed). Load only that brand's profile.
The brief is attached as ithrive30-habit-frequency-brief.md. Save it into /handoff and read it first, then PROJECT.md and CHANGES.md if they exist.
Your job this session: read how habits, the daily percentage and the streak work today, draft BUILD.md for this change and confirm it with me before editing. Then build to the acceptance checks.
Respect ownership: copy stays as the listed ids and placeholders, and anything outside this stage goes in CHANGES.md.
Finish with updated handoff files and a handoff note.
