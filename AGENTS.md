# iTHRIVE30 — Agent Notes

## Read this first
Expo has changed a lot release-to-release. Before writing any code against an
Expo/expo-router/expo-* API, check the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ rather than relying on training data.

## Project overview
iTHRIVE30 is a React Native (Expo) mobile app for Bondi Project Global, a
structured 30-day-at-a-time personal development platform. Content is
organized into named Levels (1 = Foundation, 2 = Awareness, 3 = Discovery,
4-12+ planned). Brand: black `#0B0B0B` + gold `#D4AF37`, tagline "Your Next
Best Self Awaits," motto "Change · Grow · Evolve."

**Who's who:** Andrew builds the app (non-developer). Sharyn is the founder
and a co-decision-maker on product direction — a change she requests, relayed
by Andrew, carries the same weight as one from Andrew directly, and can
override a standing decision (e.g. she had a graph-lock feature undone the
day after it shipped).

## Tech stack
- React Native + Expo SDK 57, expo-router, TypeScript (`strict: true`)
- AsyncStorage for all data persistence — **there is no backend**
- expo-sensors (Pedometer), expo-image-picker + expo-media-library (selfies),
  expo-web-browser, expo-sharing + expo-asset (Archive downloads),
  react-native-svg (charts)
- Windows dev machine, Expo Go for live device testing

## Architecture principles — do not violate without explicit sign-off
- **Local-only, no backend.** Teams, subscriptions, and multi-user
  accountability features are explicitly deferred and investment-gated. Don't
  wire these up speculatively. See the **Teams tab** section for the model
  they must follow when they do arrive.
- **Never-blocking, calendar-based progression.** Days and challenges unlock
  on schedule regardless of whether earlier ones got done. Nothing should
  ever block a user from progressing.
- **No day ever locks for editing.** Every day of habit/challenge data —
  today or any day in the past, with entries or without — stays fully
  editable, permanently. An earlier "submitted artefact, read-only once it
  has data" design was explicitly reverted: Andrew's call was that if someone
  edits their own data to cheat, that's on them, not something to engineer
  around.
- **Autosave everywhere, no submit buttons.** Every input saves the instant
  it changes. Friction removal is the core retention mechanic.
- **The 13 habits are a baseline, not a threshold.** They are a fixed standard
  every user works to, which is what makes the tracker mean the same thing for
  everyone. **Do not make the baseline user-tunable** — no configurable step
  target, no configurable water goal, no "personal targets" in Settings. That
  would quietly turn a shared standard into a self-set one. Personal targets
  already have a home: **My Journey and the goal functions**, expressed through
  the three editable habits (`new-thing`, `choose-own`, `bonus`). Hardcoded
  values like `WATER_GOAL_GLASSES = 8` are the standard, not a default awaiting a
  setting.
- **Local dates only.** Always build date keys from local `Date` getters
  (`getFullYear`/`getMonth`/`getDate`), never `toISOString()` — that
  previously froze the app for users in positive UTC offsets (e.g.
  Australia).
- **Cap lookback loops.** Streak/history calculations must stay bounded
  (180 days). An earlier unbounded date-range loop froze the app.

## Project structure
- `app/(tabs)/index.tsx` — Today tab
- `app/(tabs)/progress.tsx` — Progress tab
- `app/(tabs)/wins.tsx` — Wins tab
- `app/(tabs)/challenges.tsx` — Challenges tab (see its own section below)
- `app/(tabs)/archive.tsx`, `app/(tabs)/account.tsx` (My Journey), `app/(tabs)/teams.tsx`,
  `app/(tabs)/settings.tsx` — menu screens. They live **inside** the tab group with
  `href: null` so the tab bar stays visible and you leave by tapping any tab. In the root
  stack they pushed over the tabs, hiding the bar and showing a back button labelled with
  the raw route name.
- `lib/settingsStore.ts` / `lib/backupStore.ts` / `lib/monitoring.ts` /
  `lib/reminders.ts` — Settings, data export/restore/erase, crash reporting, and
  daily notifications (see their own sections below)
- `constants/theme.ts` / `hooks/useTheme.tsx` — the theme token layer.
  **No screen may hardcode a colour any more** (see below)
- `lib/montageStore.ts` / `components/TransformationTile.tsx` /
  `app/(tabs)/montage.tsx` — transformation montages (see below)
- `legal/privacy-policy.md` (source of truth, hand-edited) and
  `legal/privacy-policy.html` (the page published to GitHub Pages). Both carry
  `[[BRACKETED]]` placeholders that must be filled before launch.
- `lib/acknowledgementStore.ts` / `components/AcknowledgementTile.tsx` — self-
  acknowledgements and their shareable branded tile
- `lib/habitStore.tsx` — daily habit/mood/notes/detail data
- `lib/challengeStore/` — folder module: `index.ts` (logic), `types.ts`,
  `level1-foundation.ts`, `level2-awareness.ts`, `level3-discovery.ts`
- `lib/achievements/` — folder module: the 357-badge engine, including the encouragement
  copy (see its own section below). No points — that system was removed.
- `lib/rewardEvents.ts` — small AsyncStorage record of things badges can't derive after
  the fact, plus the earned-badge list that makes badges permanent
- `lib/analytics.ts` — derived stats: streaks, completion rates, rating
  trends (not yet reviewed in detail — treat call signatures already used
  elsewhere in the app as the source of truth)
- `lib/goalsStore.ts` — Goals **and** Milestones both live in this one file. **Not the
  same thing as `lib/journeyStore.ts`**, which holds My Journey's richer category goals
  (achieve / feel / impact / target date / archive) — that is the one the goal badges read.
- `components/Onboarding.tsx` — first-run cards (see below)
- `lib/archiveStore.ts` / `archiveCategories.ts` / `archiveMeta.ts` /
  `archiveFiles.generated.ts` — Archive / Digital Library (see below)
- `lib/brand.ts` — the logo lockups and which tagline cut to use
- `lib/dailyHero.ts` / `lib/heroImages.generated.ts` — the once-a-day welcome
- `components/SplashLoader.tsx`, `components/DailyHero.tsx` — opening sequence
- `scripts/generate-archive.js`, `scripts/generate-heroes.js`,
  `scripts/generate-achievements.js`, `scripts/optimise-assets.js`,
  `scripts/reset-project.js`
- `components/Charts.tsx`, `components/Fireworks.tsx` (not yet reviewed in
  detail — `Charts.tsx`'s multi-series support is unconfirmed, which is why
  the Levels comparison chart was built as its own inline SVG component
  instead of extending it)

## Levels & challenge content
- Level 1 (Foundation) is fully written and live in testing.
- Level 2 (Awareness) and Level 3 (Discovery) have partial/placeholder
  content and are scheduled for a major rewrite. **Do not edit
  `level2-awareness.ts` or `level3-discovery.ts` content, or build features
  that assume their current content is final, without explicit instruction.**
- `isLevelUnlocked()` / `getLevelProgress()` define "level complete" as *all
  currently-written days having a submitted response* — not literal day 30.
  That's intentional; content is still being filled in.

## Today tab
- Autosave throughout, no submit button, no single journal-entry field.
- Mood is a standalone 1-5 scale (`getMoodRating`/`saveMoodRating`),
  decoupled from Challenge completion — this replaced the old journal entry.
- Notes are freeform, timestamped, multiple per day (`getNotes`/`addNote`/
  `deleteNote`) — not a single journal field.
- Per-habit detail panels already exist in `habitStore`: activity
  (multi-select + other), fruit (free text), water (0-10 glass scale, goal 8),
  reading (book title/author or podcast title/host/guest).
- The day strip runs **a whole Level, Day 1 to today** — scroll right back to where the
  Level started. A picker above it switches between Levels already begun, which is how
  older history is reached. `getStartedLevels()` supplies the day-number -> real-date
  mapping; `getLevelStartDate()` is deliberately read-only so merely *viewing* a Level
  never starts its 30-day clock.
- Day dots come from `getDaysWithData()` (two storage reads for the whole strip). The
  per-date `hasAnyDataForDate` would be hundreds of reads across 30 days.
- No day is ever locked (see Architecture principles).
- `auto` habits (steps via Pedometer, Today's Challenge) stay automatic only
  on Today — on any other day they're manually toggleable, since there's no
  live sensor for a past day.
- There is no catch-up-blocking mechanic. An earlier banner referencing
  `getTodayCatchUpStatus` was removed entirely — that function never existed
  in `challengeStore`, and the banner contradicted the never-blocking design
  anyway.

## Challenges tab
- **The day modal autosaves on exit.** A single `Done` button, no Cancel — and the
  Android back gesture saves too (`onRequestClose={saveAndClose}`). Matches the Today
  tab: nothing is lost by leaving, and there is no submit step.
- **It will not create a response out of nothing.** Opening a day, reading it and backing
  out must not mark it complete — `isLevelUnlocked`/`getLevelProgress` count a level as
  done from days that have a response, so a phantom save would falsely complete a level.
  `hasAnswerContent()` is the guard.
- **`submitChallengeResponse` never re-stamps `completedAt`.** It is called on every exit,
  so re-stamping would make a day answered weeks ago look like it was answered today —
  corrupting the challenge-streak, weekday and 'on time' achievements. Its `moodRating`
  argument is optional; omitting it keeps the rating captured on the day.
- The mood popup now fires **only on first completion**, not on every save — nobody wants
  a popup each time they reread a day.
- There is no read-only mode. An earlier `isActiveLocked` ('Submitted - this response is
  locked for reflection') contradicted the never-locks principle and blocked autosave; it
  and its Cancel button are gone.

## Progress tab
Four segments: **Table** (default) / **Graph** / **Goals** / **Milestones**.
- **Table**: 30-day habit tracker, green ticks only (no "missed" marker),
  horizontally scrollable, with a current/best streak column per habit and a
  daily %-complete summary row — modelled directly on Andrew's own Excel
  tracker.
- **Graph**: Daily / By Habit / Mood / Monthly / Year to Date, plus a
  **Levels** view — a custom inline SVG multi-line chart, one coloured line
  per level, plotting cumulative completion % across each level's 30-day arc.
  This view is always visible, no lock (an earlier lock-until-Level-1
  version was explicitly reverted at Sharyn's request).
- **Goals** and **Milestones** both read/write `lib/goalsStore.ts`.

## Wins tab
Only things that actually mattered, in this order: the four streak quadrants, **In Your
Own Words** (self-acknowledgements), Goals Achieved, Milestones Reached, and **Major
Milestones** — earned badges of `major` significance only.
- **No running badge count, no score, nothing in a prime position.** A "52 / 328" counter
  at the top turns the programme into a scoreboard; that was removed on purpose. The full
  badge list lives in My Journey, collapsed.
- Goals and Milestones appear here **read-only and only once achieved** — they are wins,
  not a second editor. Creating and managing them stays on Progress.
- **In Your Own Words** (`lib/acknowledgementStore.ts`) is the one place the app has no
  opinion: the user writes what they want to remember, it is saved, and it can be shared
  as a branded 1080x1080 tile (`components/AcknowledgementTile.tsx`, captured with
  react-native-view-shot). The tile renders off-screen at full size so the shared PNG is
  identical on every device; the on-screen preview is the same view scaled down.

## Badges (`lib/achievements/`)
357 badges, from Sharyn's master spreadsheet.

**There are no points, no multiplier and no redemption tiers.** An earlier version scored
every badge, multiplied the total by your Level, and dangled merch behind point
thresholds. That was removed deliberately: it aimed attention at an external scoreboard
instead of at the work. **Do not reintroduce a score without an explicit decision from
Andrew or Sharyn.**

What a badge gives instead is a sentence about what you actually did — `encouragement.ts`
turns the rule into something you can feel: 200 alcohol-free days becomes "that's almost
$2,800 you haven't spent", 200 days of steps becomes "roughly 1,600km on your own two
feet". At tiers that take months it adds a nudge to mark it yourself, and at the rarest
tiers it says so plainly. Self-validation, not currency.
- `PAYOFF_ASSUMPTIONS` holds every number behind those claims ($100/week on alcohol, 8km
  per 10k steps, 250 pages a book...). Deliberately conservative — it should never read as
  an inflated claim. Tune them there, in one place.
- **Voice: match `level1-foundation.ts`, not a scoreboard.** Short declaratives, nothing
  over ~12 words, two sentences max. State the fact then the truth; never stack praise.
  Contrast constructions and imperative closers are on-brand ("Discipline is power, not
  punishment", "Lean in"). No "Bravo", no exclamation marks. The header comment in
  `encouragement.ts` is the full brief - an earlier three-sentence version read like a
  greetings card and was rejected.
- Tone escalates by *days*, not tier index, via `bandFor()`: starting / building /
  established / rare. A 3-day badge must not claim rarity.
- `scripts/source/achievements.xlsx` is still the source of truth for names, tiers and
  requirement wording. `npm run sync-achievements` regenerates `data.ts` — **never
  hand-edit it**. `TEXT_OVERRIDES` in the generator rewrites sheet wording that describes
  removed mechanics (the four old "compound multiplier" badges now read as Level unlocks).
- `Achievement.points` survives in the data as a **difficulty weight only** — it ranks the
  "closest to earning" list and drives `significanceOf()`. Never surface it as a score.
- **`significance`**: `major` (weight >= 600, roughly 93 badges — the ones that take
  months) or `minor`. Wins shows earned `major` badges only; **My Journey holds the full
  list**, collapsed by default. Keep the counter out of prime position.
- `types.ts` (rule union) / `context.ts` (one snapshot of all user data) / `evaluate.ts`
  (rule → earned?) / `encouragement.ts` (rule → words) / `index.ts` (public API:
  `getBadgeSummary`, `getBadgeTally`). Screens import from `lib/achievements` only.
- **Everything is derived** from the habit log, reflections, challenge responses and goals.
  No ledger, no backend.
- **Badges never un-earn.** A few rules describe a *state* that stops being true when you
  succeed ("3 or more active goals at once"). Earned ids persist in
  `rewardEvents.earnedAchievementIds` and are unioned back in. Keep that guarantee.
- Completing a Challenge day is **not** an award — fireworks only.
- **17 badges are permanently locked** with a visible reason: all 13 Social & Team (needs a
  backend), 2 needing weather/location, 1 needing a birthday, 1 needing per-Level start
  dates. Rule kind `manual`. Building the feature is what unlocks them — give them a real
  rule then, in `BESPOKE_RULES`, and regenerate. It was 29; montages took out 8 and the
  goal work took out 4.
- `lib/rewardEvents.ts` records what leaves no trace in the data (screens visited,
  backfilled days, challenge edits, custom-slot labels, early-bird completions). Writes are
  best-effort and never throw.
- "Evening Reflection" badges map to **notes**. "Core habits" = the 9 non-editable,
  non-challenge habits — note this differs from `analytics.getPerfectDayStreak`, which
  counts *every* habit; both definitions are intentional.

## Archive tab ("Digital Library")
Categorised, ordered library of downloadable files, **bundled inside the
app** (Andrew's explicit choice over externally hosting/linking them —
accepted tradeoff: shipping a new file to production needs a rebuild, though
Expo Go picks it up on a Metro reload during dev).
- Files live in `assets/archive/<categoryId>/`. Metro needs `.pdf`/`.docx`/
  `.doc`/`.pptx`/`.xlsx`/`.zip` in `resolver.assetExts` (`metro.config.js`)
  and matching `declare module` blocks (`archive-assets.d.ts`) or requiring
  them won't compile.
- `lib/archiveFiles.generated.ts` is auto-generated by
  `scripts/generate-archive.js` (`npm run sync-archive`) — **never hand-edit
  it**, it gets overwritten on every run.
- `lib/archiveMeta.ts` is the hand-editable override layer (title/
  description/order per item, keyed by id) — safe to edit, never touched by
  the generator.
- `lib/archiveCategories.ts` is hand-maintained; a new category needs a
  matching new folder under `assets/archive/`, and the `id` must match the
  folder name **exactly** — `npm run sync-archive` warns when they don't line
  up (a mismatch silently renders an empty category).
- A category can set `layout: 'grid'` to render as tappable thumbnails
  instead of download rows, and `itemLabel` to turn numeric filenames into
  readable titles ("7.jpg" → "Quote 7") without 60 hand overrides.
- Images (`.jpg`/`.png`) open in a full-screen viewer with a Save/Share
  action; documents still go straight to the share sheet.
- `lib/archiveStore.ts` is the public API the screen imports from — combines
  the three sources above. Current categories: Purpose Designed, Environmental
  Setters (grid), Quote Tiles (grid, 61 items), Gallery.

## Settings, backup & crash reporting
`app/(tabs)/settings.tsx`, reached from the header menu. **It is Settings, never an
Account** — no email, no password, no login. Adding one means a server holding
credentials, which is investment-gated.

- **`lib/settingsStore.ts`** — first name, date of birth, appearance, crash-report opt-out,
  plus `installId` and `SCHEMA_VERSION`. Those last two do nothing today: they exist so a
  future cloud sync can migrate existing users instead of making them start over. Keep
  them written on every save.
- **No personal targets here** — see the baseline-not-threshold rule in Architecture
  principles.
- **`appearance` is stored but has no control yet.** Light mode isn't built; a selector
  that changed nothing would be a dead control, which is the thing we fixed on Teams.
  Wire the control up in the same pass that lands the theme.
- **`lib/backupStore.ts`** — the only way data leaves the device. Every key the app owns
  starts `ithrive30_`, which is what makes a one-pass export possible; **keep that prefix
  for any new key or it silently drops out of backups.** Restore is a *replace*, not a
  merge — merging two habit logs has no correct answer — and the screen confirms first.
  Uses the modern `expo-file-system` API (`new File(Paths.cache, name)`, `.write()`,
  `.text()`, `File.pickFileAsync()`), not the deprecated `expo-file-system/legacy` one.
- **`lib/monitoring.ts`** — Sentry behind three guards: not Expo Go, DSN configured, user
  hasn't opted out. The opt-out is enforced in `beforeSend` with the flag defaulting to
  **off** until the stored preference is read, so the failure mode is losing an early
  crash report rather than sending one the user declined. Never throws, by design.
- Config lives in `app.json` → `expo.extra`: `sentryDsn`, `privacyPolicyUrl`,
  `supportEmail`. Empty string means "not set", and the matching UI row hides rather than
  rendering a dead link.

## Theming (`constants/theme.ts`, `hooks/useTheme.tsx`)
Two palettes, one token set. `dark` is the black + gold brand; `light` is **Eucalypt** —
cool ivory ground, sage primary — from Sharyn's A/B design handoff, aimed at women 30-60.
Driven by `settings.appearance`: System / Light / Dark, with System following the device
live rather than sampling once.

- **Never hardcode a colour in a screen again.** Use
  `const styles = useThemedStyles(createStyles)` with
  `const createStyles = (t: Theme) => StyleSheet.create({ ... })` at module scope.
- **Brand gold cannot carry text in light mode.** `#D4AF37` is 9.19:1 on brand black and
  **2.10:1 on white**. So `primary` becomes sage `#5F7355`, and gold survives only as
  `accentGold` `#B79447` on AUTO chips and earned badges.
- **Do not lighten `muted`, `faint`, `secondary` or `secondaryDim` in the light palette.**
  Inverting a dark UI is not a mirror of its grey ramp — `#666` reads fine on black and
  lands near 2.5:1 on ivory. These values clear 4.5:1 at 9-12px on `ground` and `surface`.
- **A surface whose ground is dark in both themes keeps the dark palette.** That is
  `SplashLoader` (the native splash runs before any JS and cannot follow a setting, so a
  light one would flash black → ivory → app on every launch), `DailyHero` (its ground is a
  photo scrim; sage on it is ~3.4:1) and the Archive lightbox. They import `DarkTheme`.
- `AcknowledgementTile` and `TransformationTile` **do** follow the theme, per the handoff,
  so a light-mode user shares a light tile. Flagged in-file as the one call worth revisiting
  — two users of the same programme produce tiles that look like different products.
- `app.json` must stay `"userInterfaceStyle": "automatic"`. Pinned to `"dark"` the OS
  reports dark forever and `useColorScheme()` can never return light.

## Transformation montages
`app/(tabs)/montage.tsx`, reached from the header menu. Unlocks all 8 Selfie &
Transformation badges — permanently-locked badges are now **21, not 29**.
- **Nothing new is stored.** A montage is assembled on demand from selfies already saved
  against their dates, so there is nothing extra to migrate, corrupt or back up.
- Day-to-date mapping comes from `getStartedLevels()` and is never recomputed — one home
  for the local-date rule, not two.
- **Available for any started Level once there are two photos**, not gated behind Level 4.
  The four badge montages (4/6/10/12) are the milestone; gating the feature itself would
  hide the app's most shareable output from every current user.
- **The filmstrip shows only days that have a photo.** Rendering 30 slots with gaps turns
  it into a record of what someone missed — the opposite of the point, and against the
  never-blocking principle.
- The before and after are **the same size, same treatment**. Enlarging or warming the
  "after" would be the app editorialising about someone's body.

## Reminders (`lib/reminders.ts`)
Morning and evening, both off by default, each with its own time. **Local notifications
only** — scheduled and fired by the device. No push server, no token registration, no
backend, no cost.
- **Tone is a hard constraint.** Nothing counts, scolds, or mentions a streak at risk.
  Loss-aversion pressure is the exact mechanic this programme rejects, and a nudge that
  makes someone feel caught is a nudge they switch off. The evening one is an open door,
  not a deadline.
- Copy is fixed rather than naming the day's challenge: a DAILY trigger carries static
  text, and a rolling reschedule would quietly lapse for exactly the person the reminder
  is for.
- `syncReminders()` cancels **by identifier**, never
  `cancelAllScheduledNotificationsAsync()`, so it can't clear something a future feature
  scheduled. Called on every app open, since the schedule drifts when permissions are
  revoked or the app is reinstalled. Never throws.
- Guarded off in Expo Go, with the reason shown in Settings rather than a dead switch.

## First-run onboarding
`components/Onboarding.tsx`, four swipe cards, shown once. An overlay from
`app/_layout.tsx` above the `Stack` — never a route, so the router can't navigate back
into it. Gated on `settings.onboardedAt` **alone, never on habit data**: it explains the
programme, it does not judge whether someone has started properly.
- **Card three is the load-bearing one.** "You cannot fall behind" is the least obvious
  thing about this programme from the interface, and someone who believes they can fail on
  day three stops on day three.
- On first run the Daily Hero is skipped and marked seen. Four cards plus a second
  full-screen welcome is one screen too many on a first launch; the hero greets them
  tomorrow.
- Badge `a287` ("Complete onboarding and set up your first day") is **not** gated on this —
  it already runs on `anyHabitDays: 1` and deliberately stays there. Ticking a habit is the
  real milestone; dismissing four cards is not.

## Teams tab
`app/(tabs)/teams.tsx` is a deliberate "coming soon" screen, and the copy now says what
Teams is for rather than just that it is absent. **Keep it in the header menu** — an
earlier suggestion to hide it until Teams ships was rejected. It is a statement of intent,
not an unfinished stub.
- **No email capture, no waitlist, no "notify me".** That would collect an address with
  nowhere to keep it, in an app whose whole privacy position is that nothing leaves the
  device.

**The model is real-life connection, not virtual.** You start solo, then team up with
someone you already know in actual life and grow together. The app supports a
relationship that already exists; it never creates one. Three stages, in order:
1. **Solo** — where the app is now, and where every user starts.
2. **Paired or grouped with a real-life connection.**
3. **Community, plus group features for businesses and organisations** — a B2B line
   (seats, admin view, aggregate reporting), gated on a network existing first.

Consequences for anything built here:
- **No discovery mechanics.** No search, no matching, no friend requests, no feed, no
  recommendations. That is the virtual connection the model rejects — and it is also
  where nearly all of a social platform's cost and moderation burden lives. Two people
  who already know each other only need to link and exchange progress, which is why
  this backend is far smaller than "Teams" usually implies.
- **No leaderboards.** Same reason the points system was removed (see Badges) — it
  aims attention at a scoreboard instead of at the work.
- **Four of the 13 Team badges are off-model** and need rewriting via `TEXT_OVERRIDES`
  when Teams is built, exactly as the compound-multiplier badges were: *"Get matched
  with an accountability partner"* (matching), *"Your Team tops the Teams leaderboard"*
  (scoreboard), *"members in 3+ countries"* (virtual network + needs location), and
  *"Encourage 5 teammates"* (in-app messaging). The other nine fit as written.

## Opening sequence & daily hero
Both render as overlays from `app/_layout.tsx` above the `Stack`, not as
routes — they must never become something the router can navigate back into.
- `components/SplashLoader.tsx` — every launch. A gold ring sweeps around the
  logo while the lockup underneath changes: mark (0-33%), "your next best
  self is here" (33-66%), "change | grow | evolve" (66-100%). The three
  lockups share one artboard with the mark in an identical position, which is
  what makes the cross-fade read as the tagline morphing rather than a swap.
  It takes a `holdUntil` promise so the ring hitting 100% means genuinely
  ready, rather than being an animation the app races.
- `components/DailyHero.tsx` + `lib/dailyHero.ts` — first open of each
  calendar day. Full-bleed picture, the day's challenge quote, a way in.
  Gated on a stored date key, **not** on habit data: it greets, it never
  gates, and dismissing it records nothing about progress.
- `heroForDate()` picks from the date itself, so everyone on a given date
  sees the same picture, and the set advances one image per day rather than
  repeating at random.
- `parseQuote()` splits `“<quote>” ~ <Author>` into text and byline. Don't
  replace it with a naive trim of the end characters — the closing smart
  quote sits *mid-string*, before the attribution. Quotes with a byline are
  set in quote marks; the 26 unattributed ones are the app's own first-person
  affirmations and are deliberately set plain and upright.
- `lib/brand.ts` owns the logo lockups. Taglines come in white and black cuts
  — pick by what the logo sits on (`onDark`/`onLight`), not by app theme; the
  mark itself is gold in every variant.
- `lib/heroImages.generated.ts` is auto-generated by
  `scripts/generate-heroes.js` (`npm run sync-heroes`) — never hand-edit.

## Bundled image sizes
`npm run optimise-assets` (dry run) / `-- --write` (apply). The source images
are camera originals and print-resolution exports; the app ships them inside
the bundle, where nothing is visible above phone resolution. The one run so
far took the asset folder from 95MB to 19MB (export payload 102MB → 27MB) with
no visible quality loss.
- Originals are copied to `../Ithrive30-original-assets` — **outside** the
  project, so Metro never crawls or bundles them — before anything is
  overwritten. Every run re-optimises from that backup, never from an
  already-compressed file, so it's safe to re-run without generation loss.
- App icons and splash assets are in a `PROTECTED` list and never touched:
  resizing them breaks the native icon pipeline.
- Run it after dropping new images into `assets/`, then `npx expo start -c`.

## Working conventions
- Andrew is a non-developer. Prefer direct, complete edits over long
  explanations. Make a sensible assumption and proceed rather than stalling
  on a clarifying question — unless the ambiguity is genuinely
  architecture-defining (e.g. bundling files vs. linking them), in which case
  ask before building.
- After any change touching `package.json`, `metro.config.js`, or adding a
  native-ish dependency, remind Andrew to run `npx expo start -c`.
- Investor/stakeholder materials (SVGs, Excel exports, HTML prototypes,
  onboarding scripts) are a recurring, separate deliverable track alongside
  app code — not every request is about the app's source itself.

## Orientation
`app.json` sets `"orientation": "portrait"` — the app is **locked to portrait** and cannot
rotate. Before unlocking it, check: the Wins/Progress segment rows and stat cards (fixed
flex ratios), the Today 5-day strip, and the DailyHero full-bleed layout. Anything reading
screen size must use `useWindowDimensions()`, never a module-scope `Dimensions.get()` —
the latter is captured before first render and never updates (this bit `Fireworks.tsx`).

## Known constraints
- **Never import `@react-navigation/*` in app code.** Since SDK 56 Metro hard-
  errors on it. Use `expo-router` for theming (`ThemeProvider`, `DarkTheme`,
  `DefaultTheme`, `useTheme`), `expo-router/js-tabs` for bottom-tab types, and
  `expo-router/react-navigation` for the remaining shims (that last one is
  itself deprecated — prefer `expo-router` where the symbol exists there).
- Expo Go on Android can't get full media-library permissions (platform
  limitation, not a bug) — the "Due to changes in Android's permission
  requirements…" warning is expected and harmless pre-dev-build.
- `expo-sensors`' Pedometer only gives a live reading for the current day —
  there's no historical backfill.
