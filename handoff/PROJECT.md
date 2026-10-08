# PROJECT: iTHRIVE30 Foundation Challenge, week two app update
_Last updated: 4 October 2026 · Owner: Chat_
**Brand: iTHRIVE30** (confirmed). Load only the iTHRIVE30 profile and design system.

## Goal
Load week two of the foundation challenge (Days 8 to 14, Arc A) into the app, and add one new content field, `quote_note`: a short reference line under a quote's attribution that tells the Thriver who the person is.

## Audience and primary action
Anyone choosing thirty days, often new to personal development. The one action each day drives: complete the day's action and tick it off.

## Scope
**In**
- Days 8 to 14 content, exactly as in `COPY.md` and `foundation-week2.json`.
- `quote_note`: optional string on a content day. Shown directly under the quote attribution in small, muted type, and hidden when it's empty. Days 8, 9 and 11 use it this week.

**Out**
- Any change to week one wording.
- Visual redesign. Use the existing iTHRIVE30 tokens (`constants/brand.ts`) and the existing day screen.
- A photo upload field for the Day 9 action (open decision below).

## Platform and sources
- The iTHRIVE30 app. Tokens are generated from the iTHRIVE30 design system into `constants/brand.ts`. One gold everywhere: `#D4AF37`.
- Visual reference for the day screen: the "Foundation Week Two" review page (claude.ai artifact), which shows each day as an app screen.
- Day anatomy, in order: title, quote, attribution, quote_note, content (max 5 lines), affirmation + "~ say that again…", practice fields (2 to 3), action (always last), action_proof (optional, under the action).

## Status
| Phase | Status |
|---|---|
| 0 Brief | Done |
| 1 Copy | Done, draft 4. Days 8 and 13 have items awaiting Sharyn's approval (listed per day in COPY.md and in `pending_approval` in the JSON) |
| 2 Design | No new screens. The existing day screen gains one text slot, `quote_note` |
| 3 Build | Done 4 Oct 2026 (Days 1 to 14). Awaiting Andrew's device test in Expo Go |

## Open decisions
- [Ship Days 8 and 13 before Sharyn approves the new voices, or hold them in draft until she does?]
- [Does the app support photo capture? If yes, Day 9 could add a photo field for the before and after shots in a later update.]
- [Add `quote_note` to week one's external voices too (Duckworth Day 3, Sinek Day 4, Brockmann Day 6)? Copy would come from chat first.]
