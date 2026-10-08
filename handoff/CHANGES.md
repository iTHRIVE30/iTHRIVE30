# CHANGES: iTHRIVE30 Foundation Challenge
_Append only. Each entry: date · from → to · request · status._

## 4 October 2026 · Chat → Code
1. **Add `quote_note`.** Optional string (null when absent) on content days. Add it to the day schema and the content import, and render it under the quote attribution in small, muted type using existing tokens (caption size, `figure-muted`). Hide it when null. Don't rename any existing field: inspect the current schema and map the JSON keys onto it (`title`, `quote`, `quote_attribution`, `content`, `affirmation`, `fields`, `action`, `action_proof`). · open
2. **Keep day ids.** If Days 8 to 14 already exist in the app, update them in place and keep their ids, so stored answers survive. Question ids in this file are new. If existing week-two questions have stored answers under other ids, report it before overwriting anything. · open
3. **Reflection day.** Day 14 shows the framing lines, then the Thriver's three Day 1 words (their answer to Day 1 question 2), then the three journal questions. The three questions are identical on Days 7, 14, 21 and 28. · open
4. **Pending approvals.** Days 8 and 13 carry `pending_approval` items. Build them, but follow the open decision in PROJECT.md before release. · open

## 4 October 2026 · Chat → Design
5. The design system README still describes iTHRIVE30 copy at Level 1 ("permission is the job"). Challenges now run at Level 2 from Day 1. · open
6. The Design Handoff Brief PDF still lists gold as `#A17A3F`. The master gold is `#D4AF37` (Sharyn, 27 September 2026). · open

## 4 October 2026 · Code → Chat (status of items 1 to 4, plus new requests)
- Items 1 to 4: **done** in the build (see BUILD.md). Item 4: Days 8 and 13 ship in the test build with their pending items; hold for Sharyn before public release.
7. **Who-they-are notes, first appearance only (Andrew's rule).** Code moved Brockmann's note from Day 11 to Day 6, his first day. Code drafted notes for first appearances that had none. Please confirm or rewrite: Day 1 Sharyn Brown "Founder of Bondi Project Global and iTHRIVE30." · Day 3 Angela Duckworth "American psychologist and author of Grit. Born 1970." · Day 4 Simon Sinek "British-born American author and speaker, known for Start With Why. Born 1973." · Day 12 Tony Robbins "American author, coach and motivational speaker. Born 1960." · Day 13 Albert Einstein "German-born physicist, best known for his theory of relativity. 1879–1955." · open
8. **Week one bylines restored in full** from revision 22 (Duckworth, Sinek, Brockmann now show source and year, matching week two). · done, for info
9. **Reflection vision copy written in Code.** Days 7 and 14 label the Day 1 words "Your Next Best Self", with an empty state: "Your three words from Day 1 show here once you’ve chosen them." Please confirm or supply copy. · open
10. **Action ticks inferred.** Actions that say "tick it off" (Days 3, 5, 8, 11, 13) get a "Done" tick. Day 5 says "record it here", so it has one too. If a future day wants a tick, say so in the JSON (e.g. `"action_check": "Done"`). · open
11. **Day 9 photo field** stays out (PROJECT.md). The app does take daily selfies on Today, so a later before/after field is feasible. · open

## 4 October 2026 · Code → Design
12. PROJECT.md and the handoff prompt refer to `constants/brand.ts` and a `figure-muted` token; neither exists. The app's tokens are `constants/theme.ts`. `quote_note` uses `secondaryDim` at 12px (clears contrast in both themes). Light mode uses sage as primary, so gold `#D4AF37` is the dark theme's primary only. · open
