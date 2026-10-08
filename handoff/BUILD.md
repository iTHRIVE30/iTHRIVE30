# BUILD: iTHRIVE30 foundation challenge (Days 1 to 30), Growth, foundations, habit frequency
_Last updated: 8 October 2026 · Owner: Code · Build A built (awaiting device test); Build B next_
**Brand: iTHRIVE30**, matches PROJECT.md

Sources: `foundation-challenge.json` (consolidated, 8 Oct, replaces weeks one and two),
`ithrive30-habit-frequency-brief.md`, the review PDF (same content as the JSON).
Decisions: Andrew, 8 Oct 2026, accepted every recommendation in the review, plus the
foundations model and the eight-area My Journey below.

Two builds, in this order, committed separately:
- **Build A:** the 30 days, the life wheel, the Wheel view in Progress, foundations in My Journey.
- **Build B:** habit frequency (daily, weekly, one-off).

---

## Build A

### A1. Content: the JSON is the source
- `foundation-challenge.json` is bundled as-is (`lib/challengeStore/content/`) and mapped
  at load. Chat's next version replaces the file; nothing is retyped. The hand-edited
  `level1-foundation.ts` retires.
- Day ids stay `l1-d1` … `l1-d30`; answers stay stored by position per day. A small
  lookup resolves copy ids (`foundation.d02.q2`) to day + question, so cross-day references
  use the JSON's own ids.
- `review_notes`, `status`, `role`, `anchor_type`, `pending_approval` never render.
- `affirmation_prompt` renders on the same line as the affirmation (JSON note).
- **Who-they-are notes: first appearance only, enforced in code.** A repeated note (Brockmann
  Day 11, Clear Day 22) is dropped. Missing first notes use Code's drafts until Sharyn
  confirms: Sharyn Day 1, Duckworth Day 3, Sinek Day 4, Robbins Day 12, Einstein Day 13.
- **A Done tick on every content day's action** (feeds "what you did").
- `check-content` validates the JSON: types, ids, sources that exist, show_if targets.
- **Second one-time wipe** (`RESET_ID` bumped): Days 1 and 2 swap and most days' questions
  change, so stored answers would land in the wrong boxes.

### A2. New question and panel types
| JSON | Build |
|---|---|
| `life_wheel` | Eight 1 to 10 rows, each showing its 1, 5 and 10 anchors and its zone. |
| `second_look` | The Day 1 scores, each adjustable. Optional: untouched saves nothing. |
| `select_three` | Existing select three. |
| `options_order: lowest_score_first` | Day 1 q2 lists areas lowest score first (ties keep list order). |
| `default_from: focus_area` | Shown pre-selected but **display-only until touched**, so opening and closing a day never fakes an answer. |
| `show_if` | Day 20 q2 appears only on "It has grown". |
| `options_source` | Day 27: tracker habits (excluding Today's Challenge); Day 23's standard. |
| `option_actions` (Day 24) | "Share my progress": the existing text share. "Keep it in my Wins": saves the q1 note to In Your Own Words on Done, removed again if unticked. "A review in the App Store": **hidden until the app is live**. |
| panel `after_save` | Under the wheel once it has scores. |
| panel `wheel_contrast` | Day 2, after the questions. |
| panel `growth_pulse` | Reflection days: one 1 to 10 for the focus area, beside its Day 1 score. |
| panel `said_and_did` | **"What you did": the week's ticked actions only. Never a missed count.** |
| panel `witness_check` | Day 14, one tap, saved to the promise. |
| panel `replay` | Day 20, the current why, with "is it still true?" (see A3). |
| panel `wheel_reveal` | Day 30, Day 29 wheel over the baseline (see A4). |

Every panel that reads an earlier day has an empty state for when that day isn't done yet
(copy from Chat, CHANGES item 13). Nothing ever blocks.

### A3. Foundations: one home record, every change dated (Andrew's model)
- **Ordinary answers** edit in place on their own day, as now. No history.
- **Foundation answers** (the JSON's `saves` fields) live in one record on their home day:
  Day 1 wheel and focus area, Day 2 three words, Day 4 why, Day 6 promise and witness,
  Day 16 story, Day 17 opposite story, Day 23 standard, Day 24 note to Day 1, Day 26
  carry-lines, Day 27 what stays, and the Day 15 / 22 evidence lines.
- **A later day that calls one up saves back into the home record.** Day 20's "it has
  grown" adds a new version of the Day 4 why; Day 29's second look adds a version of the
  Day 1 wheel. The home day always shows the current version, with earlier ones beneath.
- **Versions:** an edit on the same day as the first save replaces it (fixing a typo);
  an edit on any later day adds a dated version. The first version is the benchmark.
- Store: `ithrive30_foundations_v1`. Not tied to Level 1, so later levels add versions.

### A4. The Wheel view (Progress tab)
**Progress layout (Andrew, 8 Oct):** the top selector holds only **Table** and **Wheel**.
Graph, Goals and Milestones move to a second, smaller selector beneath it. One view shows at
a time, whichever row it was picked from. Table stays the default. This replaces the
four-across row, and with it the worry about five labels fitting at phone width.

Contents of the Wheel view:
- **Life wheel:** Day 1 benchmark, Day 29 return, second look; zones comfort 1 to 4,
  growth 5 to 7, thrive 8 to 10. Drawn with react-native-svg.
- **Focus area pulses** from the reflection days, beside the Day 1 score.
- **What you did:** ticked actions by week.
- **Day 30 baseline:** the second look when one exists (their honest start), otherwise
  the Day 1 benchmark. Zero-movement wording from Chat (CHANGES item 14).
- Only ever the Thriver against themselves. No averages, no other Thrivers.

### A5. My Journey: the safe space
- New **foundations** section at the top: each foundation's current version, when it last
  changed, and its earlier versions, collapsed.
- **View, plus "it has grown" (Andrew, 8 Oct)** on the foundations meant to evolve (why,
  story and opposite story, standard, the lines that stay). It adds a dated version to the
  same home record, exactly as Day 20 does. The wheel is only re-rated on its own days.
- **Goal areas become the wheel's eight** (Health, Mindset, Relationships, Family &
  friends, Work, Money, Space, Joy & fun), replacing Life / Professionally / Personally /
  Relationships. "Add another area" stays. Each area shows its latest wheel score and zone
  beside its goals. No migration needed: the wipe clears existing goals. The goal badges
  only count how many areas have goals, so they keep working (more easily, with eight).

### A6. Actions that point at missing features
- Day 23: a "make it a habit" button puts the new standard into an editable habit slot
  (copy from Chat). Day 27's action needs rewording by Chat (no "carry on past Day 30"
  setting exists; habits never stop).

---

## Build B: habit frequency (brief of 8 Oct)
- Editable slots get a frequency with a **dated history** (a change applies from tomorrow;
  past days are never recalculated). Default daily.
- **One shared "due today" rule** replaces the eight places that score a day: Today, the
  Progress table and calendar, the daily / monthly / year-to-date graphs, the 100% streak
  (Progress and Wins) and the share summary.
- Weekly: ticks stay in the normal daily log; week status is derived. Weeks follow the
  challenge (1 to 7 … 22 to 28, 29 to 30 closing). Outside a challenge (tracker-only, or
  between levels): 7-day blocks continuing from the challenge start.
- One-off: target date optional; completion is saved **with its name and date** as a
  stretch win, so reusing the slot never renames history. Stretch wins sit on Wins after
  In Your Own Words. No stretch badge.
- Per-habit streak column: weeks in a row for weekly, blank for one-off.
- The custom-habit badges keep counting ticked days.
- Today tab restored to the committed version with its focus loop fixed (CHANGES item 22).

## Verify (both builds)
`tsc`, lint, `check-content`, and a data check of every cross-day reference and empty
state. Andrew tests in Expo Go on iPhone.
