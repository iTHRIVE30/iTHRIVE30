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


/* LEVEL 1: YOUR NEXT BEST SELF AWAITS - the full 30 days, from
   iTHRIVE30_Level1_YourNextBestSelfAwaits_v5_1.docx (draft v5).

   Six cycles of five days - Start, Own, Face, Choose, Prove, Become - with every fifth
   day a reflection. Each day carries, in order:

     voice        the iTHRIVE30 line, the app speaking straight to the Thriver
     quote        a sourced quote, verbatim, with its author after the ~
     lesson       the body, one sentence per line
     affirmation  the Thriver's own first-person line
     fact         only on days 2, 16 and 27

   The day ids (l1-d1 ... l1-d30) are deliberately unchanged from the previous version:
   answers are stored against them, so renaming them to the doc's l1.d01 style would wipe
   what existing testers have already written. */
export const LEVEL_1_DAYS: ChallengeDayDef[] = [
  {
    id: 'l1-d1', day: 1, title: `Start With a Bang`,
    theme: `One step today. One step every day.`,
    voice: `The whole point of this challenge is to take one step, every day, toward your Next Best Self. Be better than yesterday.`,
    quote: `“Becoming is better than being.” ~ Carol Dweck`,
    lesson: `Your Next Best Self already exists, waiting on the other side of these 30 days.
Today, you take your first step toward them.
Pick one action they'd take, and take it before the day ends.
That's your first win. Momentum starts here.`,
    affirmation: `“I start strong, and I start today.”`,
    worksheetTitle: `Day One Win`,
    fields: [
      { prompt: `Who is my Next Best Self?`, type: 'text', placeholder: `Calm, clear, backs themselves…` },
      { prompt: `How committed am I, right now?`, type: 'rating10' },
      { prompt: `Theme words I'm carrying through these 30 days`, type: 'multiselect', options: ['Accountability', 'Balance', 'Consistency', 'Courage', 'Discipline', 'Focus', 'Growth', 'Happiness', 'Honesty', 'Inner harmony', 'Joy', 'Kindness', 'Persistence', 'Resilience', 'Self-trust'] },
      { prompt: `The one action they'd take today`, type: 'textarea', placeholder: `Book the 6am class for tomorrow` },
      { prompt: `Did I take it?`, type: 'dropdown', options: ['Done', 'Underway'] },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d2', day: 2, title: `One Habit, Upgraded`,
    theme: `Your days are made of habits. Upgrade one today.`,
    voice: `Your habits are your life on repeat. Let's upgrade one today.`,
    quote: `“What you do every day matters more than what you do once in a while.” ~ Gretchen Rubin`,
    lesson: `Your life right now is a mirror of your habits.
Pick the one that costs you most.
Swap it for one that lifts you, starting today.
Small swap. Big direction.`,
    affirmation: `“I choose the habits that build me.”`,
    fact: `Research led by psychologist Wendy Wood found that around 43% of everyday actions are done out of habit, often while your mind is somewhere else.`,
    worksheetTitle: `Habit Swap`,
    fields: [
      { prompt: `The habit that costs me most`, type: 'textarea', placeholder: `Scrolling in bed` },
      { prompt: `What I'm swapping it for`, type: 'textarea', placeholder: `Reading ten pages` },
      { prompt: `When the swap happens today`, type: 'text', placeholder: `9:30pm, phone on the kitchen bench` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d3', day: 3, title: `Energy Is the Currency`,
    theme: `Spend it like it matters.`,
    voice: `Everything you're building runs on your energy. Top it up today.`,
    quote: `“Energy, not time, is the fundamental currency of high performance.” ~ Jim Loehr & Tony Schwartz`,
    lesson: `Your energy carries everything you're building.
Sleep, water, movement, food. Pick one.
Give it your full attention today and feel the difference by tonight.
More energy, more momentum.`,
    affirmation: `“I fuel the life I'm building.”`,
    worksheetTitle: `Energy Boost`,
    fields: [
      { prompt: `How's my energy right now?`, type: 'rating10' },
      { prompt: `The basic I'm levelling up today`, type: 'dropdown', options: ['Sleep', 'Water', 'Movement', 'Food'] },
      { prompt: `Exactly what I'll do`, type: 'textarea', placeholder: `Two litres of water before 3pm` },
      { prompt: `Tonight: how's my energy now?`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d4', day: 4, title: `Honest Eyes`,
    theme: `The truth is the starting line.`,
    voice: `The truth moves you faster than any plan. Say it straight today, then act on it.`,
    quote: `“The first principle is that you must not fool yourself—and you are the easiest person to fool.” ~ Richard Feynman`,
    lesson: `Pick one part of your life and tell the truth about it.
Plain and clear.
Then take the one step the truth asks of you.
Honesty plus action is where change gets real.`,
    affirmation: `“I see my life clearly, and I act on what I see.”`,
    worksheetTitle: `The Honest Step`,
    fields: [
      { prompt: `One area I've been going easy on`, type: 'textarea', placeholder: `My sleep` },
      { prompt: `The truth about it`, type: 'textarea', placeholder: `Five hours most nights` },
      { prompt: `The step I'm taking today`, type: 'textarea', placeholder: `Lights out by 10:30 tonight` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d5', day: 5, title: `Reflection I: Five Days of Momentum`,
    theme: `Five days. Five moves. Look at them.`,
    voice: `Five days, five moves. That's momentum, and it's yours.`,
    quote: `“How we spend our days is, of course, how we spend our lives.” ~ Annie Dillard`,
    lesson: `A win, a swap, a boost, a truth.
That's momentum, and it's already building.
Today, look at what moved.
Then carry it into the next five.`,
    affirmation: `“Every day I move, I build.”`,
    worksheetTitle: `Reflection I`,
    fields: [
      { prompt: `The moment this week I felt the momentum`, type: 'textarea' },
      { prompt: `What it showed me I'm capable of`, type: 'textarea' },
      { prompt: `What I'm carrying into the next five days`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d6', day: 6, title: `Your Defaults, Your Call`,
    theme: `Every setting in your life is yours to change.`,
    voice: `You hold the pen on every default in your life. Today, rewrite one.`,
    quote: `“We can be blind to the obvious, and we are also blind to our blindness.” ~ Daniel Kahneman`,
    lesson: `Habits you picked up. Rules you were handed. Reactions you learned early.
Every one of them is yours to keep or change.
Today, catch one in the act and make the call.
You're the one holding the settings.`,
    affirmation: `“I own my responsibility, and that's where my power starts.”`,
    worksheetTitle: `Own the Default`,
    fields: [
      { prompt: `One thing I do on autopilot`, type: 'textarea', placeholder: `Saying yes before checking my calendar` },
      { prompt: `Where I picked it up`, type: 'textarea', placeholder: `Watching Mum say yes to everyone` },
      { prompt: `My call`, type: 'dropdown', options: ['Keep it', 'Change it', 'Upgrade it'] },
      { prompt: `What I'm doing about it today`, type: 'textarea', placeholder: `Checking my calendar before every yes` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d7', day: 7, title: `What You Reach For`,
    theme: `Own the reach and you own the choice.`,
    voice: `When things get uncomfortable, your hand moves. Today, you decide where it goes.`,
    quote: `“Discomfort is the price of admission to a meaningful life.” ~ Susan David`,
    lesson: `The phone. The fridge. The next episode. Everyone has one.
Today, catch the reach and swap it.
Five minutes with the feeling first. Then choose.
Your hand, your choice.`,
    affirmation: `“I choose where my hand goes.”`,
    worksheetTitle: `Own the Reach`,
    fields: [
      { prompt: `What I reach for when things get uncomfortable`, type: 'textarea', placeholder: `My phone` },
      { prompt: `What I'm stepping around when I reach`, type: 'textarea', placeholder: `A conversation with my boss` },
      { prompt: `My swap for next time`, type: 'textarea', placeholder: `Five minutes with the feeling, then a glass of water` },
      { prompt: `Times I caught it today`, type: 'text', placeholder: `3` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d8', day: 8, title: `Spend Your Hours on Purpose`,
    theme: `Every hour is a choice. Make today's count.`,
    voice: `You spend your hours the way you spend money. Today, spend them on what matters.`,
    quote: `“There is nothing so useless as doing efficiently that which should not be done at all.” ~ Peter Drucker`,
    lesson: `Make today's busy move you forward.
Today, count your hours honestly.
Then take one back and give it to what matters.
Your time, your call.`,
    affirmation: `“My time goes to what matters to me.”`,
    worksheetTitle: `Own the Hours`,
    fields: [
      { prompt: `Where my hours actually went today`, type: 'textarea', placeholder: `Two hours on messages, one on socials…` },
      { prompt: `One hour I'm taking back`, type: 'textarea', placeholder: `The hour I spent reorganising a folder` },
      { prompt: `What matters that gets that hour`, type: 'textarea', placeholder: `Calling my sister` },
      { prompt: `When I'm doing it`, type: 'text', placeholder: `Tomorrow, 6pm` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d9', day: 9, title: `You Built This Room`,
    theme: `Your space is doing exactly what you set it up to do.`,
    voice: `Your space shapes your day. Set it up to back you.`,
    quote: `“The question of what you want to own is actually the question of how you want to live your life.” ~ Marie Kondo`,
    lesson: `Your space is always nudging you somewhere.
Toward the couch, the phone, or the life you want.
Today, change one thing so the good choice is the easy one.
Set it once. It works for you every day after.`,
    affirmation: `“I set up my world to back me.”`,
    worksheetTitle: `Own the Room`,
    fields: [
      { prompt: `One thing in my space that makes a good habit easy`, type: 'textarea', placeholder: `Running shoes by the door` },
      { prompt: `One thing that makes an unhelpful habit easy`, type: 'textarea', placeholder: `Phone charger by my pillow` },
      { prompt: `The change I made today`, type: 'textarea', placeholder: `Charger moved to the kitchen` },
      { prompt: `Status`, type: 'dropdown', options: ['Done', 'Doing it tonight'] },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d10', day: 10, title: `Reflection II: Owning It`,
    theme: `You took the wheel this week.`,
    voice: `Five days of full ownership. Feel how much more of your life is yours now.`,
    quote: `“Pain + Reflection = Progress” ~ Ray Dalio`,
    lesson: `This cycle you owned your defaults, your reach, your hours and your space.
Ownership feels heavy at first. Then it feels like freedom.
Everything you own, you can change.
Ten days in, you're driving.`,
    affirmation: `“What I own, I can change.”`,
    worksheetTitle: `Reflection II`,
    fields: [
      { prompt: `The moment this week I took full ownership`, type: 'textarea' },
      { prompt: `What changed once I owned it`, type: 'textarea' },
      { prompt: `The next thing I'm ready to own`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d11', day: 11, title: `Name It`,
    theme: `A feeling with a name is easier to hold.`,
    voice: `Give every feeling its real name today. Named feelings lose their grip.`,
    quote: `“Name it to tame it.” ~ Dr Dan Siegel`,
    lesson: `Frustrated. Disappointed. Lonely. Excited. Get specific.
The more precisely you name it, the more you run it.
Name it, then choose your next move.
Clarity is power.`,
    affirmation: `“I name what I feel, and I choose what I do.”`,
    worksheetTitle: `Name It to Tame It`,
    fields: [
      { prompt: `How am I feeling right now?`, type: 'multiselect', options: ['Anxious', 'Calm', 'Content', 'Disappointed', 'Excited', 'Frustrated', 'Grateful', 'Hopeful', 'Lonely', 'Overwhelmed', 'Proud', 'Restless', 'Tired'] },
      { prompt: `Where do I feel it in my body?`, type: 'text', placeholder: `Tight chest` },
      { prompt: `What it's telling me`, type: 'textarea', placeholder: `I've taken on too much this week` },
      { prompt: `My next move`, type: 'textarea', placeholder: `Hand one task back` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d12', day: 12, title: `Fear and Desire`,
    theme: `They always turn up together.`,
    voice: `Fear shows up because this matters. Let desire lead today.`,
    quote: `“Stress is what arises when something you care about is at stake.” ~ Kelly McGonigal`,
    lesson: `Want something that matters and fear arrives right beside it.
That's proof you care.
Today, let desire take the lead and take one step toward what you want.
Fear can come along for the ride.`,
    affirmation: `“Desire leads. I move.”`,
    worksheetTitle: `The Dance`,
    fields: [
      { prompt: `Something I really want`, type: 'textarea', placeholder: `To start swimming again` },
      { prompt: `The fear that turns up with it`, type: 'textarea', placeholder: `Feeling self-conscious at the pool` },
      { prompt: `The step desire takes today`, type: 'textarea', placeholder: `Book the first swim` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d13', day: 13, title: `Pressure Is a Privilege`,
    theme: `The weight means you're in the game.`,
    voice: `Heavy means it matters. Carry it like the privilege it is.`,
    quote: `“Pressure is a privilege.” ~ Billie Jean King`,
    lesson: `Pressure shows up where something worth having is at stake.
It means you're in the game.
Today, pick one pressure and carry it with pride.
Same weight. Stronger you.`,
    affirmation: `“I carry pressure because I show up for things that matter.”`,
    worksheetTitle: `Carry the Pressure`,
    fields: [
      { prompt: `One pressure I'm feeling right now`, type: 'textarea', placeholder: `Hosting the family for Christmas` },
      { prompt: `What it says about what I care about`, type: 'textarea', placeholder: `I want the people I love to feel welcome` },
      { prompt: `How I'm carrying it today`, type: 'textarea', placeholder: `Enjoying the planning, one list at a time` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d14', day: 14, title: `Kind to the Beginner`,
    theme: `Kindness is fuel.`,
    voice: `Kindness is the fastest fuel there is. Back yourself today.`,
    quote: `“The curious paradox is that when I accept myself just as I am, then I can change.” ~ Carl Rogers`,
    lesson: `Change grows fastest in kind soil.
Today, talk to yourself like a great coach talks to someone two weeks into something new.
Back yourself on the bits that feel slow.
Encouraged people go further.`,
    affirmation: `“I back myself while I grow.”`,
    worksheetTitle: `Kind Words`,
    fields: [
      { prompt: `Something about myself I've been hard on lately`, type: 'textarea', placeholder: `How slowly this feels` },
      { prompt: `What a great coach would say`, type: 'textarea', placeholder: `Two weeks in and showing up. Keep going.` },
      { prompt: `One kind thing I'm doing for myself today`, type: 'textarea', placeholder: `Leaving work on time` },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d15', day: 15, title: `Reflection III: Halfway`,
    theme: `Fifteen days. Look how far you've come.`,
    voice: `Halfway. You started, you owned it, you faced it. The second half builds on all of it.`,
    quote: `“Not everything that is faced can be changed, but nothing can be changed until it is faced.” ~ James Baldwin`,
    lesson: `This cycle you named feelings, led with desire, carried pressure and backed yourself.
That takes real courage.
Fifteen days in, you face things head on.
Halfway. Celebrate it.`,
    affirmation: `“I face things, and I move through them.”`,
    worksheetTitle: `Reflection III`,
    fields: [
      { prompt: `A feeling I faced head on this cycle`, type: 'textarea' },
      { prompt: `What facing it made possible`, type: 'textarea' },
      { prompt: `What I'm taking into the second half`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d16', day: 16, title: `Choose Your Circle`,
    theme: `Your people shape your path.`,
    voice: `Your people shape your path. Today, spend time with someone who lifts you.`,
    quote: `“The quality of your relationships determines the quality of your life.” ~ Esther Perel`,
    lesson: `Some people leave you lighter. Spend more time with them.
Today, find the people who lift you and lean in.
Choose where your best energy goes.
Your circle, your call.`,
    affirmation: `“I give my best energy to people who lift me.”`,
    fact: `The Harvard Study of Adult Development has followed people since 1938. One of its clearest findings: close, warm relationships are among the strongest predictors of a healthy, happy life.`,
    worksheetTitle: `Circle Check`,
    fields: [
      { prompt: `Someone who leaves me feeling lighter`, type: 'text' },
      { prompt: `A relationship that drains me`, type: 'textarea' },
      { prompt: `Who I'm spending 15 minutes with today`, type: 'text' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d17', day: 17, title: `Give to Grow`,
    theme: `The fastest way out of your own head.`,
    voice: `Stuck in your head? Be useful to someone. It lifts you both.`,
    quote: `“What you do makes a difference, and you have to decide what kind of difference you want to make.” ~ Jane Goodall`,
    lesson: `Helping someone else shifts everything, fast.
A message. An hour. A hand.
Today, make one person's day better.
Then feel what it does to yours.`,
    affirmation: `“I make a difference today, on purpose.”`,
    worksheetTitle: `Give to Grow`,
    fields: [
      { prompt: `How I'm giving today`, type: 'dropdown', options: ['Time', 'Encouragement', 'Support', 'Something else'] },
      { prompt: `In my own words`, type: 'textarea', placeholder: `Checking in on a friend who's been quiet` },
      { prompt: `Who I'm giving it to`, type: 'text' },
      { prompt: `Tonight: how did giving shift my energy?`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d18', day: 18, title: `Legacy Over Likes`,
    theme: `Applause fades. What matters stays.`,
    voice: `Do one thing today that matters for its own sake.`,
    quote: `“I think everybody should get rich and famous and do everything they ever dreamed of so they can see that it's not the answer.” ~ Jim Carrey`,
    lesson: `Likes feel good for a minute.
What matters to you feels good for years.
Today, do one thing that matters to you, for its own sake.
That's the stuff that lasts.`,
    affirmation: `“I build what lasts.”`,
    worksheetTitle: `Temporary vs. Lasting`,
    fields: [
      { prompt: `One thing I did today for approval`, type: 'textarea', placeholder: `Checking how my post went, five times` },
      { prompt: `One thing I did today that truly mattered`, type: 'textarea', placeholder: `Helped my neighbour with her shopping` },
      { prompt: `What I'd do more of, for its own sake`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d19', day: 19, title: `Gratitude Is a Lens`,
    theme: `Even hard days hold something good.`,
    voice: `Gratitude sits right beside the hard stuff. Let it be the louder voice.`,
    quote: `“I cannot pretend I am without fear. But my predominant feeling is one of gratitude.” ~ Oliver Sacks`,
    lesson: `Gratitude sits right alongside the worry, the tired and the hard.
Both can be true.
Today, find the good inside something hard.
Let gratitude be the louder one.`,
    affirmation: `“I hold what's hard and I see what's good.”`,
    worksheetTitle: `Gratitude Lens`,
    fields: [
      { prompt: `Three things I'm grateful for right now (1 of 3)`, type: 'text', placeholder: `A good coffee` },
      { prompt: `Three things I'm grateful for right now (2 of 3)`, type: 'text', placeholder: `a friend who checked in` },
      { prompt: `Three things I'm grateful for right now (3 of 3)`, type: 'text', placeholder: `a warm bed` },
      { prompt: `Something hard I'm facing`, type: 'textarea' },
      { prompt: `The good I can find inside it`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d20', day: 20, title: `Reflection IV: Chosen on Purpose`,
    theme: `Your people, your giving, your standard, your lens.`,
    voice: `You chose your people, your giving, your standard and your lens this week. All on purpose.`,
    quote: `“It is good to have an end to journey toward; but it is the journey that matters, in the end.” ~ Ursula K. Le Guin`,
    lesson: `This cycle you chose your people, your giving, your standard and your lens.
Every choice built something.
Twenty days in, you're choosing on purpose.
Enjoy the ride you're on.`,
    affirmation: `“I choose on purpose, every day.”`,
    worksheetTitle: `Reflection IV`,
    fields: [
      { prompt: `A choice this cycle that lifted me`, type: 'textarea' },
      { prompt: `What it showed me about what I need`, type: 'textarea' },
      { prompt: `One way I'll shape my world in the final ten days`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d21', day: 21, title: `Keep One Promise`,
    theme: `Momentum is kept promises.`,
    voice: `Day 21. This is where momentum gets built for good. Keep one promise today.`,
    quote: `“Enthusiasm is common. Endurance is rare.” ~ Angela Duckworth`,
    lesson: `Three weeks in, this is where momentum locks in.
Today, make one small promise to yourself.
Small enough to be certain.
Kept all the way.`,
    affirmation: `“I keep the promises I make to myself.”`,
    worksheetTitle: `One Kept Promise`,
    fields: [
      { prompt: `One small promise I'm making myself today`, type: 'textarea', placeholder: `A 10-minute walk after dinner` },
      { prompt: `What might get in the way`, type: 'textarea', placeholder: `Being tired` },
      { prompt: `Tonight: did I keep it?`, type: 'dropdown', options: ['Kept it', 'Partly', 'Back on it tomorrow'] },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d22', day: 22, title: `Before You're Ready`,
    theme: `Ready shows up once you've started.`,
    voice: `Ready shows up once you've started. So start.`,
    quote: `“Great people do things before they're ready.” ~ Amy Poehler`,
    lesson: `Readiness arrives after the first step.
Today, take the step you've been holding.
A little early. A little scared.
Moving is how ready feels.`,
    affirmation: `“I move first, and ready catches up.”`,
    worksheetTitle: `Step In Early`,
    fields: [
      { prompt: `One thing I've been waiting to feel ready for`, type: 'textarea', placeholder: `Signing up for that class` },
      { prompt: `The first step I'm taking today`, type: 'textarea', placeholder: `Look up the timetable and book` },
      { prompt: `How it felt once I'd taken it`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d23', day: 23, title: `Messy Is Allowed`,
    theme: `Everything great starts rough.`,
    voice: `Rough and finished is how every great thing begins. Ship it.`,
    quote: `“Early on, all of our movies suck.” ~ Ed Catmull`,
    lesson: `Every great thing has an awkward first version.
Today, let something be rough and finish it anyway.
Finished gets better. Every time.
Done is where improvement starts.`,
    affirmation: `“I'm a beginner out loud, and proud of it.”`,
    worksheetTitle: `Rough but Done`,
    fields: [
      { prompt: `Something I've been polishing for too long`, type: 'textarea', placeholder: `Rewriting the same message five times` },
      { prompt: `What finished looks like today`, type: 'textarea', placeholder: `Send the first draft` },
      { prompt: `Whose standard am I actually meeting?`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d24', day: 24, title: `The Team of Me`,
    theme: `Past, present and future, all on the same side.`,
    voice: `Your past self got you here. Your future self is counting on today. Back them both.`,
    quote: `“I wish I'd had the courage to live a life true to myself, not the life others expected of me.” ~ Bronnie Ware`,
    lesson: `You're a team: the you who got you here, the you reading this, and the you who's waiting.
Your past self did their best. Your future self is counting on today.
Make one choice they'll both thank you for.
That's how the team builds trust.`,
    affirmation: `“I'm building trust with who I'm becoming.”`,
    worksheetTitle: `Team Meeting`,
    fields: [
      { prompt: `Something my past self did that I'm grateful for`, type: 'textarea', placeholder: `Kept going when it was hard` },
      { prompt: `What my future self is asking of me today`, type: 'textarea', placeholder: `Book the appointment` },
      { prompt: `The choice I'm making today that they'll thank me for`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d25', day: 25, title: `Reflection V: The Evidence Is In`,
    theme: `You've been building proof all week.`,
    voice: `Confidence is kept promises, stacked up. Look how high yours are.`,
    quote: `“Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying, ‘I will try again tomorrow.’” ~ Mary Anne Radmacher`,
    lesson: `This cycle you kept promises, started early, finished rough and backed your future self.
Every one of those is evidence.
Twenty-five days in, you trust yourself more than ever.
Write the proof down. You'll use it.`,
    affirmation: `“I have proof that I follow through.”`,
    worksheetTitle: `Reflection V`,
    fields: [
      { prompt: `One piece of proof from this cycle that I follow through`, type: 'textarea' },
      { prompt: `What it tells me about who I'm becoming`, type: 'textarea' },
      { prompt: `The courage I'm keeping`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d26', day: 26, title: `Think From Your Future`,
    theme: `Let the vision pull you forward.`,
    voice: `Step into your Next Best Self today and look at your life from where they stand.`,
    quote: `“No human is limited.” ~ Eliud Kipchoge`,
    lesson: `Four days out, your Next Best Self is close enough to see.
Today, think from where they stand.
Borrow their eyes and make today's decisions with them.
What do they do first? Do that.`,
    affirmation: `“I think and act as my Next Best Self.”`,
    worksheetTitle: `Borrow Their Eyes`,
    fields: [
      { prompt: `One limit I've been treating as permanent`, type: 'textarea', placeholder: `I'm a night person` },
      { prompt: `How my Next Best Self sees it`, type: 'textarea' },
      { prompt: `One thing I'm doing today as them`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d27', day: 27, title: `The Inner Coach`,
    theme: `Change the voice, change the day.`,
    voice: `You talk to yourself more than anyone else does. Make it a great coach.`,
    quote: `“Don't let what you cannot do interfere with what you can do.” ~ John Wooden`,
    lesson: `The voice in your head talks to you more than anyone.
Today, give it a coach's voice.
Honest, direct, and firmly on your side.
Talk to yourself like someone you believe in.`,
    affirmation: `“I talk to myself like someone I believe in.”`,
    fact: `Psychologist Ethan Kross found that talking to yourself by your own name, the way a coach would, can help you stay calmer and think more clearly under stress.`,
    worksheetTitle: `Upgrade the Voice`,
    fields: [
      { prompt: `Something my inner critic says often`, type: 'textarea', placeholder: `“You always mess this up”` },
      { prompt: `What a great coach says`, type: 'textarea', placeholder: `“You're learning this. Go again.”` },
      { prompt: `One thing I can do today`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d28', day: 28, title: `Hero of Your Own Story`,
    theme: `Set down what you've been carrying.`,
    voice: `Your story is proof of what you've come through. Today, you write the next chapter.`,
    quote: `“Above all, be the heroine of your life, not the victim.” ~ Nora Ephron`,
    lesson: `Your story is part of you. You're the one writing what comes next.
Today, set one old weight down.
Lighter hands carry more.
Hero, from here.`,
    affirmation: `“My story is proof of what I've come through, and I write what comes next.”`,
    worksheetTitle: `Set It Down`,
    fields: [
      { prompt: `One thing I'm ready to put down`, type: 'textarea', placeholder: `Guilt about a slow start this month` },
      { prompt: `Who or what I'm forgiving, myself included`, type: 'textarea' },
      { prompt: `How I write myself as the hero from here`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d29', day: 29, title: `Keep Showing Up`,
    theme: `Day 30 is a launch point.`,
    voice: `Tomorrow is a floor you build on. Decide what you're taking with you.`,
    quote: `“Be so good they can't ignore you.” ~ Steve Martin`,
    lesson: `The goal was to become someone who keeps showing up.
You are.
Tomorrow is a launch point.
Today, choose what you're taking with you.`,
    affirmation: `“I keep going, with more of me.”`,
    worksheetTitle: `What Comes With Me`,
    fields: [
      { prompt: `The habit from this month I'm keeping`, type: 'textarea' },
      { prompt: `The thing I'm leaving behind`, type: 'textarea' },
      { prompt: `What I want to get really good at next`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l1-d30', day: 30, title: `Celebration & Reflection VI: I Am the Creator`,
    theme: `Thirty days. Look who showed up.`,
    voice: `Thirty days. Look at who's standing here.`,
    quote: `“Find out who you are and do it on purpose.” ~ Dolly Parton`,
    lesson: `Thirty days ago you started. Today, look at what you've built.
You started. You owned it. You faced it. You chose. You proved it.
That's the foundation, and it's yours.
This is a milestone. Celebrate it properly.`,
    affirmation: `“I know who I am, and I live it on purpose.”`,
    worksheetTitle: `Own Your Pen`,
    fields: [
      { prompt: `Read what I wrote on Day 1. What's changed?`, type: 'textarea' },
      { prompt: `How committed am I now?`, type: 'rating10' },
      { prompt: `One sentence I want to remember from these 30 days`, type: 'textarea' },
      { prompt: `How I'm celebrating today`, type: 'dropdown', options: ['Telling someone', 'Doing something I love', 'Writing it somewhere permanent', 'My own way'] },
      { prompt: `In my own words`, type: 'textarea' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },];
