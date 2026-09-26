/**
 * Putting the Thriver's first name into programme copy.
 *
 * The app speaks to people as "you" and, now and then, by name - never by gender. There is
 * deliberately no pronoun setting: the copy is written in the second person, so it reads
 * right for everyone without a question on setup and without three versions to maintain.
 *
 * In the content files, write {name} where the first name should go:
 *
 *     voice: `{name}, you showed up. That's the whole game today.`
 *     voice: `Well done, {name}.`
 *
 * The name is optional, so every {name} must read cleanly when there isn't one. Put it at
 * the start or end of a sentence, set off by a comma, and it drops out without a trace:
 *
 *     "{name}, you showed up."   ->  "You showed up."
 *     "Well done, {name}."       ->  "Well done."
 *
 * Use it sparingly - once in a day's copy at most. A name in every paragraph reads like a
 * marketing email, not like someone who knows you.
 *
 * Never used on quotes (those are someone else's words) or on the Thriver's own answers.
 */

import type { ChallengeDayDef } from './challengeStore/types';

const TOKEN = /\{name\}/gi;

export function withName(text: string, firstName: string | null | undefined): string;
export function withName(text: string | undefined, firstName: string | null | undefined): string | undefined;
export function withName(text: string | undefined, firstName: string | null | undefined) {
  if (!text || !/\{name\}/i.test(text)) return text;

  const name = (firstName ?? '').trim();
  if (name) return text.replace(TOKEN, name);

  return (
    text
      // "Well done, {name}." -> "Well done."
      .replace(/,\s*\{name\}/gi, '')
      // "{name}, you showed up." -> "You showed up." (capitalise what now starts the sentence)
      .replace(/(^|[.!?]\s+)\{name\}[,:]?\s*(\S)/gi, (_, before: string, first: string) => before + first.toUpperCase())
      // "Hey {name}!" -> "Hey!"
      .replace(/\s*\{name\}/gi, '')
  );
}

/**
 * A challenge day with {name} filled in, for display only - the stored content and the
 * saved answers are untouched. The quote is left alone: it is someone else's words.
 */
export function personaliseDay(day: ChallengeDayDef, firstName: string | null | undefined): ChallengeDayDef {
  return {
    ...day,
    title: withName(day.title, firstName),
    theme: withName(day.theme, firstName),
    voice: withName(day.voice, firstName),
    lesson: withName(day.lesson, firstName),
    affirmation: withName(day.affirmation, firstName),
    fact: withName(day.fact, firstName),
    worksheetTitle: withName(day.worksheetTitle, firstName),
    doThis: withName(day.doThis, firstName),
    goDeeper: withName(day.goDeeper, firstName),
    fields: day.fields.map((field) => ({
      ...field,
      prompt: withName(field.prompt, firstName),
      placeholder: withName(field.placeholder, firstName),
    })),
  };
}

/** "Good morning" / "Good afternoon" / "Good evening", by the phone's local clock. */
export function greeting(firstName: string | null | undefined, date: Date = new Date()): string {
  const hour = date.getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = (firstName ?? '').trim();
  return name ? `${part}, ${name}` : part;
}
