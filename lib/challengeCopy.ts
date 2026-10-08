// Working words the app needs that Chat hasn't written yet - mostly empty states, for when a
// day is opened before the day it draws from (nothing ever blocks, so that always can
// happen). Every line here is a DRAFT from Code, logged in handoff/CHANGES.md items 13-15,
// 17 and 19 for Chat to replace. Replace them here, in one place; nothing else hardcodes
// these sentences.

export const CHALLENGE_COPY = {
  // CHANGES 13 - empty states
  'wheel.second_look.empty': 'Your Day 1 wheel shows here once you have rated it.',
  'wheel.contrast.empty': 'Rate your wheel on Day 1 and it shows here, beside your three words.',
  'vision.label': 'Your Next Best Self',
  'vision.empty': 'Your three words from Day 2 show here once you have chosen them.',
  'pulse.empty': 'Choose the one area you will own on Day 1, and you can rate it here.',
  'pulse.day1': 'Day 1:',
  'replay.empty': 'Your why from Day 4 shows here once you have written it.',
  'options.source.empty': 'Nothing to choose from yet. Add your own.',
  'reveal.empty': 'Your wheel shows here once you have rated it on Day 1 and on Day 29.',
  // CHANGES 14 - the reveal when nothing moved
  'reveal.none_moved': 'Your wheel holds where it started. Thirty days of showing up is its own result.',
  'reveal.label.baseline': 'Start',
  'reveal.label.now': 'Day 29',
  // CHANGES 15 - what you did
  'did.label': 'What you did',
  'did.empty': 'Tick an action done and it shows here.',
  // CHANGES 17 - Day 23
  'standard.make_habit': 'Make it a habit',
  'standard.pick_slot': 'Which of your own habits should it replace?',
  'standard.saved': 'Added to your habits on Today.',
  'standard.empty': 'Write your new standard first.',
  'wins.saved': 'Saved to your Wins.',
  // CHANGES 23 - the Wheel view in Progress
  'wheelview.title': 'Your wheel',
  'wheelview.subtitle': 'Where you started, and where you stand. Only ever you against you.',
  'wheelview.empty': 'Rate your wheel on Day 1 of the challenge and it appears here.',
  'wheelview.areas': 'Area by area',
  'wheelview.col.day1': 'Day 1',
  'wheelview.col.now': 'Day 29',
  'wheelview.focus': 'Your focus area',
  'wheelview.pulses': 'Each reflection day',
  'wheelview.did': 'Actions you ticked done',
  'wheelview.week': 'Week',
  'wheelview.second_look': 'Day 1 as you see it now (your second look)',
  // CHANGES 19 - foundations in My Journey
  'foundations.title': 'Your foundations',
  'foundations.subtitle': 'What you have built on. Every version kept, with its date.',
  'foundations.empty': 'As you work through the challenge, your starting point, your why and more gather here.',
  'foundations.grown': 'It has grown',
  'foundations.grown.placeholder': 'How it reads now',
  'foundations.save': 'Save',
  'foundations.cancel': 'Cancel',
  'foundations.earlier': 'Earlier versions',
  'foundations.hide': 'Hide earlier versions',
  'foundations.from.day': 'Day',
  'foundations.from.journey': 'My Journey',
  'journey.area.score': 'Wheel',
} as const;

export type ChallengeCopyId = keyof typeof CHALLENGE_COPY;

export function copy(id: ChallengeCopyId): string {
  return CHALLENGE_COPY[id];
}
