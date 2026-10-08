import { ChallengeDayDef } from './types';

/* ============================================================================
   EDITING THE WORDING — a guide for Andrew, not for a developer

   This file is the actual words of Level 1. You can change any of them yourself
   and see it on your phone within a second or two.

   HOW
   1. Have `npx expo start` running.
   2. Change the text between the ` backticks ` below.
   3. Save. Expo reloads on its own — no rebuild, no restart.
   4. Before you commit, run:  npm run check-content
      That checks every day for the mistakes listed below and tells you in plain
      English if something is wrong. It is much faster than finding out from a
      blank screen on your phone.

   THE THREE RULES

   1. Only ever type BETWEEN the backticks. Leave everything else alone —
      the `id:`, `day:`, `type:`, the commas, the brackets.

          title: `Avoid-Less`,
                 ^          ^   change what's in here, not the marks themselves

   2. Never type a backtick ` inside your text, and never type  ${  .
      Those two are the only characters that break the app. Apostrophes are
      completely fine — don't it's you're all work normally.

   3. Curly quotes “ ” around quotations, and  ~ Author  after the closing one:

          quote: `“The success you seek is in the work you are avoiding.” ~ Sharyn Brown`,

      The app splits that itself and puts the author on its own line, centred.
      Don't add the line break yourself.

   SPACING — you are in charge

   The app only lays text out for you when you haven't. Write a lesson as one
   paragraph and it puts each sentence on its own line automatically:

          lesson: `Avoidance is rarely laziness. It points at what matters.`

              ->  Avoidance is rarely laziness.
                  It points at what matters.

   The moment you put in your own line breaks, the app stops interfering and
   gives you exactly the lines you typed:

          lesson: `Avoidance is rarely laziness.
   It points at what matters most.
   Today, just notice it.`

      Leading spaces on your lines are ignored, so indent however looks tidy.
      Two short sentences you want kept together? Put them on one line.

   USING SOMEONE'S FIRST NAME

   Type {name} and the app puts in their first name. Lower case, curly brackets:

          voice: `{name}, you showed up. That's the whole game today.`

   Giving a name is optional, so write it at the start or end of a sentence,
   set off by a comma. With no name it disappears cleanly:
   "{name}, you showed up."  ->  "You showed up."
   Once a day at most - a name in every line reads like a sales email.
   Never inside a quote. Talk to people as "you", never "she" or "he".

   WHAT NOT TO CHANGE WITHOUT ASKING
   - `id:` — the day's responses are stored against it. Change it and anyone who
     has already answered that day loses their answer.
   - `day:` — the day number. It controls the order and the unlock date.
   - `type:` — what kind of input the question is (textarea, rating10, and so on).
   ============================================================================ */


/* LEVEL 1: THE FOUNDATION CHALLENGE (shown as "Your Next Best Self Awaits"), arc A.
   Week one: revision 22 (28 September 2026). Week two: draft 4 (4 October 2026), taken
   word for word from handoff/foundation-week2.json - each day and question carries its
   copy id in a comment. Weeks three and four are not written yet, so Days 15-30 show as
   "Coming soon" until they are added here.

   Each day carries, in order, and the app shows them in this order:

     title        the day's one idea, lower case, as Sharyn writes headings
     quote        the anchor: an approved voice, verbatim, with the author after the ~.
                  Empty on Day 5, whose anchor is plain logic and opens the lesson instead.
     quoteNote    who the quoted person is, one short line under the byline. ONLY on the
                  first day that person is quoted (Brockmann: Day 6, not Day 11).
                  npm run check-content warns if a note is missing or repeated.
     lesson       the content block, at most five lines, kept exactly as written
     affirmation  the carry-line, in the Thriver's own words. The app adds
                  "~ say that again…" under it, so don't type that here.
     fields       the practice questions (see QUESTION TYPES below)
     doThis       the action, which always closes the day
     actionCheck  a "Done" tick under the action, on days that say to tick it off here
     actionProof  "Why it works", under the action, with actionProofSource beneath it

   QUESTION TYPES - what each tag in Sharyn's draft becomes
     JOURNAL        type: 'textarea'
     SELECT ONE     type: 'dropdown'
     SELECT THREE   type: 'multiselect', max: 3
     SELECT ALL     type: 'multiselect'
     SCALE 1 TO 10  type: 'scale10', with the things being rated listed in items
     "+ add your own" at the end of a list   ->   allowCustom: true
                                                  (don't put it in the options list)

   Internal roles ("meet the mentor") and the source notes stay in the draft. They never
   show in the app.

   The day ids (l1-d1 ... l1-d30) never change: answers are stored against them. */
export const LEVEL_1_DAYS: ChallengeDayDef[] = [
  {
    id: 'l1-d1', day: 1, title: `meet your next best self`,
    theme: ``,
    quote: `“You are the Hero of your own story.” ~ Sharyn Brown`,
    quoteNote: `Founder of Bondi Project Global and iTHRIVE30.`,
    lesson: `The best version of yourself already exists within. Your Next Best Self awaits.
The space to THRIVE, a clear purpose and the ability to show up give every hero a standard to meet.
Heroes are made by decision: to act, to lead, to rise. Today you choose your direction.`,
    affirmation: `I decide who I become, and I start today.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Who are you, living as your best? What do you do differently? How does it feel?`, type: 'textarea' },
      { prompt: `Which words describe your Next Best Self?`, type: 'multiselect', max: 3, allowCustom: true, options: ['Confident', 'Calm', 'Focused', 'Energised', 'Disciplined', 'Generous', 'Courageous', 'Joyful', 'Free'] },
      { prompt: `Where will your Next Best Self show up first?`, type: 'dropdown', options: ['Health', 'Relationships', 'Work', 'Money', 'Mindset', 'Joy & fun'] },
    ],
    doThisLabel: `Action`,
    doThis: `Write your three words where you’ll see them first thing tomorrow. Do it before you sleep tonight.`,
    goDeeper: ``,
  },
  {
    id: 'l1-d2', day: 2, title: `the honest starting point`,
    theme: ``,
    quote: `“You do what you want, and for everything else you make excuses.” ~ Sharyn Brown`,
    lesson: `Honesty gives you a true starting point. Ownership turns it into ground you can build on.
Where you stand today is the sum of your choices.
Knowing each choice can be made again, or differently, is the key.
Like a map that has a “you are here” marker, so every journey has a beginning.
Yesterday you chose your direction. Today you mark your starting point.`,
    affirmation: `I own where I stand, and I own where I go.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Rate each of these today.`, type: 'scale10', items: ['Energy', 'Relationships', 'Work', 'Self-belief', 'Joy & fun'] },
      { prompt: `Which one area will you own this month?`, type: 'dropdown', options: ['Health', 'Relationships', 'Work', 'Money', 'Mindset', 'Joy & fun'] },
      { prompt: `Where have you been making an excuse? Name it plainly.`, type: 'textarea' },
    ],
    doThisLabel: `Action`,
    doThis: `Copy down your one area and write the excuse beside it, before you close the app today.`,
    goDeeper: ``,
  },
  {
    id: 'l1-d3', day: 3, title: `success is a skill`,
    theme: ``,
    quote: `“As much as talent counts, effort counts twice.” ~ Angela Duckworth, Grit (2016)`,
    quoteNote: `American psychologist and author of Grit. Born 1970.`,
    lesson: `Success is a skill. This month you start to learn it.
Talent gets the credit. Repetition does the work.
Every skill you admire in someone else was paid for in reps.
Long hours, revising, planning, choosing the vision. Trusting the process.
Today you do your first rep. This life is more than a read-through.`,
    affirmation: `Success is a skill, and I am practising it today.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Your first step, in one line.`, type: 'textarea' },
      { prompt: `How long will it take?`, type: 'dropdown', options: ['2 minutes', '5 minutes', '10 minutes'] },
      { prompt: `When will you do it today?`, type: 'dropdown', options: ['Morning', 'Midday', 'Afternoon', 'Evening'] },
    ],
    doThisLabel: `Action`,
    doThis: `Do your step today at the time you named, then tick it off here.`,
    actionCheck: `Done`,
    goDeeper: ``,
  },
  {
    id: 'l1-d4', day: 4, title: `your why`,
    theme: ``,
    quote: `“Every one of us has a WHY, a deep-seated purpose, cause or belief that is the source of our passion and inspiration.” ~ Simon Sinek, Find Your Why (2017)`,
    quoteNote: `British-born American author and speaker, known for Start With Why. Born 1973.`,
    lesson: `Your why is what gets you up on the days you’d rather stay down.
Motivation rises and falls. A strong reason holds steady.
When the why is vague, the excuses get specific.
Find a reason bigger than your excuses, and it will carry you on the days nothing else will.`,
    affirmation: `My why is bigger than my excuses.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `What sits underneath your why?`, type: 'multiselect', options: ['Family', 'Health', 'Freedom', 'Purpose', 'Self-respect', 'Security', 'Joy', 'Legacy'] },
      { prompt: `Why does this month matter to you? Write it, then ask “and why does that matter?” twice more.`, type: 'textarea' },
      { prompt: `Who gains when you become your Next Best Self?`, type: 'multiselect', options: ['Me', 'My partner', 'My children', 'My family', 'My friends', 'My team', 'My community'] },
    ],
    doThisLabel: `Action`,
    doThis: `Write your why in one sentence and read it aloud tonight, to yourself or to someone who will hold you to it.`,
    goDeeper: ``,
  },
  {
    id: 'l1-d5', day: 5, title: `discipline is a muscle`,
    theme: ``,
    // No quote: this day's anchor is plain logic, and it opens the lesson.
    quote: ``,
    lesson: `A muscle grows when you stretch it beyond the comfort zone, then give it time to rest. Repeatedly.
Discipline is built the same way:
the step done before the scroll,
the early night before the early start,
the promise kept when nobody is checking. These are gains.
Every time you bargain your way out, you train the part of you that bargains. The opposite is equally as true.
Today do the extra rep, because every rep compounds.`,
    affirmation: `Every rep makes me stronger.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `The slightly harder version of your step today.`, type: 'textarea' },
      { prompt: `Which excuses will try to talk you out of it?`, type: 'multiselect', allowCustom: true, options: ['I’m tired', 'No time', 'Tomorrow', 'Not in the mood', 'It won’t matter'] },
      { prompt: `What will you say back? One line.`, type: 'textarea' },
    ],
    doThisLabel: `Action`,
    doThis: `Do the harder version before 6pm today, and record it here once it’s done.`,
    actionCheck: `Done`,
    goDeeper: ``,
  },
  {
    id: 'l1-d6', day: 6, title: `the promise`,
    theme: ``,
    quote: `“If all you ever do is do what you say you’re going to do, you will get through the thing that’s uncomfortable.” ~ Nedd Brockmann, interview, Daily Advertiser (2026)`,
    quoteNote: `Australian ultramarathon runner and 2026 Young Australian of the Year, who ran 3,952 km across Australia in 47 days. Born 1999.`,
    lesson: `A promise kept to yourself is the foundation of self-trust.
You keep your word to everyone else. The person you let down most easily is you.
Writing it turns intention into commitment. Sharing it gives your word a witness.
From today, your word to yourself carries the same weight as your word to anyone else.`,
    affirmation: `I commit 100% to becoming my Next Best Self.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Complete this: For the rest of this month, I promise myself…`, type: 'textarea' },
      { prompt: `Who will you tell?`, type: 'dropdown', options: ['Partner', 'Friend', 'Family member', 'Colleague', 'The Wins tab'] },
      { prompt: `On the day you least feel like it, I will…`, type: 'dropdown', options: ['Do the two-minute version', 'Re-read my promise', 'Call my witness', 'Do it first thing'] },
    ],
    doThisLabel: `Action`,
    doThis: `Share your promise with one person today, and ask them to check in with you on Day 14.`,
    actionProof: `Across 138 studies, people reached their goals more often when their progress was written down or shared with someone.`,
    actionProofSource: `Harkin et al., Psychological Bulletin, 2016`,
    goDeeper: ``,
  },
  {
    id: 'l1-d7', day: 7, title: `reflection`,
    theme: ``,
    quote: ``,
    lesson: `Seven days in.
Look at what you said you would do, and at what you did.
Both are information, and both belong to you.`,
    // The Day 1 vision: the three words chosen on Day 1 (its second question).
    echoes: [
      { dayId: 'l1-d1', fieldIndex: 1, label: `Your Next Best Self`, empty: `Your three words from Day 1 show here once you’ve chosen them.` },
    ],
    worksheetTitle: ``,
    fields: [
      { prompt: `What did I learn?`, type: 'textarea' },
      { prompt: `What did I love?`, type: 'textarea' },
      { prompt: `What can I do better?`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    // foundation.d08 · awaiting Sharyn: Clare Boothe Luce as a new voice
    id: 'l1-d8', day: 8, title: `build your system`,
    theme: ``,
    quote: `“The height of sophistication is simplicity.” ~ Clare Boothe Luce, Stuffed Shirts (1931)`,
    quoteNote: `American writer, politician, diplomat and public intellectual. 1903–1987.`,
    lesson: `Anything complex is simplified by a system, broken into bite-sized pieces. That is how this challenge gets done.
Your system starts with one habit: small enough to keep on your hardest day, big enough to create daily momentum.
Open your tracker in the Progress tab: find the gaps, and close them.
Last week you made the promise. This week you build what sustains it.`,
    affirmation: `I keep it simple, and I keep it daily.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Pick the habit that starts your system.`, type: 'dropdown', allowCustom: true, options: ['Move for 10 minutes', 'Read 10 pages', 'Write three lines', 'Water before coffee', 'Phone away at dinner', 'Plan tomorrow tonight'] }, // foundation.d08.q1
      { prompt: `Your habit, in one line, small enough for your hardest day.`, type: 'textarea' }, // foundation.d08.q2
      { prompt: `How sure are you that you’ll do it on your worst day?`, type: 'rating10' }, // foundation.d08.q3
    ],
    doThisLabel: `Action`,
    doThis: `Under 8? Make it smaller. Then do it today and tick it off here before you sleep.`,
    actionCheck: `Done`,
    goDeeper: ``,
  },
  {
    // foundation.d09
    id: 'l1-d9', day: 9, title: `design your space`,
    theme: ``,
    quote: `“Environment is the invisible hand that shapes human behavior.” ~ James Clear, Atomic Habits (2018)`,
    quoteNote: `American writer on habits and author of Atomic Habits. Born 1986.`,
    lesson: `Your space makes more of your choices than you do.
The phone by the bed, the shoes by the door, the bowl on the bench: each is a decision already made.
Leave the room as it is, and it keeps choosing for you. Design it so your new habits become the easy choice.
On Day 1 you pictured the space to THRIVE. Today you start building it, one object at a time.`,
    affirmation: `I design my space, and my space carries me.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Which space shapes your habit most?`, type: 'dropdown', allowCustom: true, options: ['Bedroom', 'Kitchen', 'Desk', 'Car', 'Phone', 'Living room'] }, // foundation.d09.q1
      { prompt: `Which moves will you make?`, type: 'multiselect', allowCustom: true, options: ['Put it in sight', 'Put it within reach', 'Move a distraction out of sight', 'Set it out the night before', 'Phone in another room'] }, // foundation.d09.q2
      { prompt: `The one change you’ll make, in one line.`, type: 'textarea' }, // foundation.d09.q3
    ],
    doThisLabel: `Action`,
    doThis: `Pics or it didn’t happen. Tonight, take a before of every space in your sanctuary, make your change, then take at least one after as evidence for tomorrow’s habit.`,
    goDeeper: ``,
  },
  {
    // foundation.d10
    id: 'l1-d10', day: 10, title: `learn from every day`,
    theme: ``,
    quote: `“Success leaves clues.” ~ Sharyn Brown`,
    lesson: `Ten days in, every day has left you something: the days you kept show you what works, and any that slipped show you exactly where to build.
A missed day becomes a lesson the moment you review it to find why you avoided it.
How you respond is yours to choose. Read your days, and the road gets clearer with every one.`,
    affirmation: `When I learn, I build. What I build, I keep.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `What helped on your best days?`, type: 'multiselect', allowCustom: true, options: ['Did it early', 'Had it ready', 'Knew my why', 'Someone checked in', 'Kept it small'] }, // foundation.d10.q1
      { prompt: `What got in the way on the harder days?`, type: 'multiselect', allowCustom: true, options: ['Too tired', 'No time', 'Forgot', 'Plans changed', 'Lost my why'] }, // foundation.d10.q2
      { prompt: `Your lesson, in one line: next time I will…`, type: 'textarea' }, // foundation.d10.q3
    ],
    doThisLabel: `Action`,
    doThis: `Write your lesson where you’ll see it, and use it on tomorrow’s habit, whatever today held.`,
    actionProof: `In a study of new habits, missing one day made no real difference to how they formed.`,
    actionProofSource: `Lally et al., European Journal of Social Psychology, 2010`,
    goDeeper: ``,
  },
  {
    // foundation.d11
    id: 'l1-d11', day: 11, title: `momentum over motivation`,
    theme: ``,
    quote: `“If I only ran on the days I felt motivated to run, I wouldn’t run very much.” ~ Nedd Brockmann, interview, Daily Advertiser (2026)`,
    lesson: `Momentum over motivation: you build momentum, and momentum drives motivation.
Motivation arrives when it likes. Your system arrives every day: one habit, one cue, one tick.
Routine is built on the days you least feel like it, and rhythm grows from routine.
Keep the system running, and motivation catches up with you.`,
    affirmation: `I keep the system, and the system keeps me.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `How steady has your system been this week?`, type: 'rating10' }, // foundation.d11.q1
      { prompt: `What will your habit follow each day?`, type: 'dropdown', allowCustom: true, options: ['After I wake', 'After coffee', 'After the school run', 'After work', 'After dinner', 'Before bed'] }, // foundation.d11.q2
      { prompt: `Your cue, in one line: After I ___, I will ___.`, type: 'textarea' }, // foundation.d11.q3
    ],
    doThisLabel: `Action`,
    doThis: `Do your habit today straight after your cue, and tick it off the moment it’s done.`,
    actionCheck: `Done`,
    goDeeper: ``,
  },
  {
    // foundation.d12
    id: 'l1-d12', day: 12, title: `decide it in advance`,
    theme: ``,
    quote: `“It is in your moments of decision that your destiny is shaped.” ~ Tony Robbins, Awaken the Giant Within (1991)`,
    quoteNote: `American author, coach and motivational speaker. Born 1960.`,
    lesson: `The hardest moment to decide is the moment you’re in it: tired, rushed, tempted.
So decide now, while you’re clear. When the obstacle comes, your answer is already waiting.
An excuse needs a gap to grow in. A plan made in advance leaves it no room.
On Day 5 you named your excuses. Today you give each one its answer, before it speaks.`,
    affirmation: `I decide before the moment decides for me.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Which moment is most likely to stop you?`, type: 'dropdown', allowCustom: true, options: ['Running late', 'Too tired', 'Plans change', 'Low mood', 'Away from home'] }, // foundation.d12.q1
      { prompt: `Your plan, in one line: If ___, then I will ___.`, type: 'textarea' }, // foundation.d12.q2
      { prompt: `Where will your plan live?`, type: 'dropdown', options: ['Phone lock screen', 'On the fridge', 'Beside my habit', 'Here in the app'] }, // foundation.d12.q3
    ],
    doThisLabel: `Action`,
    doThis: `Put your plan in place today, and read it aloud twice before bed tonight.`,
    actionProof: `Across 94 studies, people who made if-then plans reached their goals more often.`,
    actionProofSource: `Gollwitzer & Sheeran, Advances in Experimental Social Psychology, 2006`,
    goDeeper: ``,
  },
  {
    // foundation.d13 · awaiting Sharyn: Einstein as a new voice; First-person rewording of Sharyn’s signature in the affirmation
    id: 'l1-d13', day: 13, title: `one notch up`,
    theme: ``,
    quote: `“Life is like riding a bicycle. To keep your balance you must keep moving.” ~ Albert Einstein, letter to his son Eduard (1930)`,
    quoteNote: `German-born physicist, best known for his theory of relativity. 1879–1955.`,
    lesson: `Twelve days of showing up have built something that carries you now: momentum.
Balance comes from moving. Every tick keeps you steady, and every kept promise makes the next one believable.
Today you add one notch to what you already do.
Tomorrow you look back at the road. Today you give it something worth looking at.`,
    affirmation: `I do better, I do more, I’m better than yesterday.`,
    worksheetTitle: ``,
    fields: [
      { prompt: `Rate each of these today.`, type: 'scale10', items: ['Energy', 'Consistency', 'Self-belief'] }, // foundation.d13.q1
      { prompt: `Your notch up today:`, type: 'dropdown', allowCustom: true, options: ['Two more minutes', 'Start earlier', 'The harder version', 'Bring someone with you'] }, // foundation.d13.q2
      { prompt: `One thing from these two weeks the Day 1 you would be proud of.`, type: 'textarea' }, // foundation.d13.q3
    ],
    doThisLabel: `Action`,
    doThis: `Do your notched-up habit today, and tick it off before dinner.`,
    actionCheck: `Done`,
    goDeeper: ``,
  },
  {
    // foundation.d14
    id: 'l1-d14', day: 14, title: `reflection`,
    theme: ``,
    quote: ``,
    lesson: `Fourteen days in, and your witness checks in today.
Tell them what you promised and what you did, plainly.
Every tool you picked up this week is still in your hands.`,
    // The Day 1 vision: the three words chosen on Day 1 (its second question).
    echoes: [
      { dayId: 'l1-d1', fieldIndex: 1, label: `Your Next Best Self`, empty: `Your three words from Day 1 show here once you’ve chosen them.` },
    ],
    worksheetTitle: ``,
    fields: [
      { prompt: `What did I learn?`, type: 'textarea' }, // foundation.d14.q1
      { prompt: `What did I love?`, type: 'textarea' }, // foundation.d14.q2
      { prompt: `What can I do better?`, type: 'textarea' }, // foundation.d14.q3
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
];
