import { ChallengeDayDef } from './types';

// LEVEL 2: AWARENESS - the original 10 written days, migrated to the fields[] format.
// theme/lesson/doThis are blank until that content gets written in the fuller format.
export const LEVEL_2_DAYS: ChallengeDayDef[] = [
  {
    id: 'l2-d1', day: 1, title: `Know My Why`, theme: ``,
    quote: `I am taking the first step toward my next best self.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What is important to me today?`, type: 'textarea' },
      { prompt: `How motivated do I feel right now?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d3', day: 3, title: `I Unplug To Recharge`, theme: ``,
    quote: `Tonight, I choose stillness over screens in my last hour before bed.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What did I do instead of scrolling?`, type: 'textarea' },
      { prompt: `How well did I sleep?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d5', day: 5, title: `I Embrace The Cold`, theme: ``,
    quote: `I finish today’s shower with 30 seconds of cold water, and I feel alive.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What did this challenge teach me?`, type: 'textarea' },
      { prompt: `How energized do I feel right now?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d7', day: 7, title: `I Celebrate My First Week`, theme: ``,
    quote: `One week in, and I am already becoming who I am meant to be.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What surprised me most this week?`, type: 'textarea' },
      { prompt: `How proud am I of this week?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d10', day: 10, title: `I Give Without Expecting`, theme: ``,
    quote: `Today, I let my light shine on someone else.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What kind thing did I do today?`, type: 'textarea' },
      { prompt: `How did it make me feel?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d14', day: 14, title: `I Reset My Intention`, theme: ``,
    quote: `Halfway there. I pause, and I choose my path forward with clarity.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `Has my why changed? How?`, type: 'textarea' },
      { prompt: `How committed do I feel right now?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d18', day: 18, title: `I Move In New Ways`, theme: ``,
    quote: `I explore movement I have never tried, and I trust my body.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What new movement did I try?`, type: 'textarea' },
      { prompt: `How much did I enjoy it?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d21', day: 21, title: `I Own My Streak`, theme: ``,
    quote: `Three weeks of showing up. I am proof that I follow through.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What has been hardest to keep up, and why do I keep going?`, type: 'textarea' },
      { prompt: `How proud am I of my consistency?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d25', day: 25, title: `I Share My Light`, theme: ``,
    quote: `What I have learned is meant to be shared. I pass it on today.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What did I share, and with whom?`, type: 'textarea' },
      { prompt: `How did it feel to share?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: ``,
  },
  {
    id: 'l2-d30', day: 30, title: `I Cross My Finish Line`, theme: ``,
    quote: `30 days ago I started. Today, I am my next best self.`, lesson: ``,
    worksheetTitle: ``,
    fields: [
      { prompt: `What has changed in me over these 30 days?`, type: 'textarea' },
      { prompt: `How satisfied am I with my journey?`, type: 'rating5' },
    ],
    doThisLabel: ``, doThis: ``, goDeeper: `What is my next 30-day goal?`,
  },
];
