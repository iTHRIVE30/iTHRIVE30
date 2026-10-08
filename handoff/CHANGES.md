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

## 8 October 2026 · Code → Chat (review of foundation-challenge.json and the habit frequency brief)
Andrew accepted Code's recommendations on 8 Oct. These need words from Chat (and Sharyn where noted).
13. **Empty states** for every panel that reads an earlier day, shown when that day isn't done yet: Day 2 wheel panel (no Day 1 wheel) · Days 7/14/21/28 vision (no Day 2 words) and pulse (no focus area) · Day 20 replay (no Day 4 why) · Day 27 q2 (no Day 23 standard) · Day 29 second look (no benchmark) · Day 30 reveal (no Day 1 or no Day 29 wheel). · open
14. **Day 30 reveal**: wording for zero areas moved (today: "You moved 0 of 8 areas forward"). Baseline is the second look when one exists, else Day 1. · open
15. **"Said and did" becomes "what you did"**: the week's ticked actions only, never a missed count. Needs a panel label. Every content day now has a "Done" tick on its action. · open
16. **Who-they-are notes, first appearance only**: the JSON repeats Brockmann (Days 6 and 11) and Clear (Days 9 and 22); the repeats won't show. Code's five drafts (CHANGES item 7) show until confirmed. · open
17. **Actions pointing at missing features**: Day 23, a "make it a habit" button that fills an editable slot (needs button copy). Day 27, "Set your habit to carry on past Day 30 in the Progress tab" has no feature behind it (habits never stop): please reword. Day 24, "A review in the App Store" is hidden until the app is live. · open
18. **Still open in the JSON**: Day 9 "On Day 1 you pictured…" (Day 2 after the swap) · Day 10 credits "Success leaves clues" to Sharyn while Day 24's notes say it isn't hers · pending approvals on Days 8, 13, 15, 20, 23, 25 (Anne Frank wording), 26 · apostrophes are now straight ("you'll"); weeks one and two used curly. · open
19. **Foundations in My Journey** (Andrew's model): needs a section title, a label per foundation, and version wording (e.g. "first written Day 4", "updated Day 20"). · open
20. **My Journey goal areas become the wheel's eight**: the area intro copy may need updating. · open
21. **Habit frequency**: the MISSING copy from the brief (weekly reflection prompt, stretch win title and message), and confirmation of the DRAFT lines. · open

## 8 October 2026 · Code → Andrew
22. **Today tab is an old version.** `app/(tabs)/index.tsx` on disk is byte-identical to commit 02d6546 (27 Sept, before the tracker split); it was swapped back after the last commit. It's missing tracker-only mode, the rolling 30-day strip, the Day 30 next-level card and "Open on Today" from the Progress calendar. Kept out of the 8 Oct checkpoint commit. Andrew: restore it, without the loop. **Done:** restored, and the loop that stopped it opening is fixed (focus refresh rebuilt itself on every focus). · done
23. **Progress layout (Andrew, 8 Oct):** the top selector is Table and Wheel only; Graph, Goals and Milestones sit in a second selector beneath. The JSON calls the view "Growth"; Andrew's label is "Wheel". Day 1's after-save panel ("Saved to Growth in your Progress tab…") and Day 22's action ("Open Growth in your Progress tab…") need to say Wheel. · open
