# BUILD: iTHRIVE30 Foundation Challenge, weeks one and two (Days 1 to 14)
_Last updated: 4 October 2026 · Owner: Code · Built, awaiting device test in Expo Go_
**Brand: iTHRIVE30**, matches PROJECT.md

## Stack (unchanged)
React Native + Expo SDK 57, expo-router, TypeScript strict. Local-only: AsyncStorage, no backend.
Day content: `lib/challengeStore/level1-foundation.ts`. Day screen: `app/(tabs)/challenges.tsx`.
Tokens: `constants/theme.ts` (there is no `constants/brand.ts`; logged in CHANGES.md).

## How week two got in
Generated from `foundation-week2.json` by script, never retyped, into the same file and format
as week one. Each day and question carries its copy id (`foundation.d08.q1`) in a comment.
A check confirmed every title, quote, attribution, content line, affirmation, prompt, option,
action and proof matches the JSON character for character. Andrew's direction (4 Oct): app
integrity first, so no new runtime import path; one content format for the whole challenge.

## Field mapping (JSON → app)
| JSON | App field | Notes |
|---|---|---|
| `day` | `id: 'l1-dNN'`, `day` | Existing day ids kept. |
| `title` | `title` | |
| `quote` + `quote_attribution` | `quote` as `“quote” ~ attribution` | Full attribution shown, both weeks. |
| `quote_note` | `quoteNote` (new) | Under the attribution, 12px, `secondaryDim`. **Only on a person's first day in the app** (Andrew, 4 Oct). |
| `content[]` | `lesson` | One line per item. |
| `affirmation` | `affirmation` | |
| `affirmation_prompt` | fixed UI line "~ say that again…" | Identical on every day, so not stored per day. The build stops if a day's prompt ever differs. |
| `journal` / `select_one` / `select_all` | `textarea` / `dropdown` / `multiselect` | `allow_custom` → "+ add your own". |
| `scale_1_10` | `rating10`, or `scale10` with `items` | Day 13 rates three items. |
| `action` | `doThis`, labelled ACTION | |
| actions saying "tick it off" | `actionCheck: Done` | Days 8, 11, 13 (and 3, 5 in week one). |
| `action_proof` | `actionProof` + `actionProofSource` | WHY IT WORKS, under the action. |
| reflection `framing[]` + `show_day1_vision` | `lesson` + `echoes` (Day 1 question 2) | Same as Day 7. |
| `pending_approval` | comment on the day | Shipped in the test build (Andrew, 4 Oct). |

## Who-they-are notes: where each sits
| Person | First day | Note source |
|---|---|---|
| Sharyn Brown | 1 | Code draft, needs confirming |
| Angela Duckworth | 3 | Code draft, needs confirming |
| Simon Sinek | 4 | Code draft, needs confirming |
| Nedd Brockmann | 6 | Chat (moved from Day 11) |
| Clare Boothe Luce | 8 | Chat |
| James Clear | 9 | Chat |
| Tony Robbins | 12 | Code draft, needs confirming |
| Albert Einstein | 13 | Code draft, needs confirming |

`npm run check-content` warns when a first quote has no note, or a later one repeats it.

## Stored answers (CHANGES item 2)
No conflict. The one-time reset (`lib/contentReset.ts`) erases every device on first launch of
this build, so nobody holds old answers under `l1-d8`…`l1-d14`. Weeks one and two ship as one
fresh start.

## Verified
- `npx tsc --noEmit` passes. ESLint clean on every touched file.
- `npm run check-content`: no problems; planted mistakes are caught.
- Content check against the JSON: all strings exact.
- Not yet run on a device: Andrew tests in Expo Go.

## Acceptance criteria (for the device test)
- Days 8 to 14 open one per calendar day after Day 7; Days 15 to 30 show "Coming soon".
- Notes show on Days 1, 3, 4, 6, 8, 9, 12, 13 only.
- Day 14: framing lines, then the Day 1 three words, then the three journal questions.
- Answering Day 7 or Day 14 celebrates nothing; only Day 30 finishes the challenge.
