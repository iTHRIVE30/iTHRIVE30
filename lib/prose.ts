/**
 * Splitting programme prose into readable lines.
 *
 * Level 1's lessons are written as runs of short declaratives - "You're not here by
 * accident. You're here because you're ready. Let's go." - which is the brand's voice, but
 * set as one dense block it reads like a paragraph of admin. One sentence per line gives
 * each of those statements the weight it was written with.
 *
 * This changes presentation only. No word is altered, added or dropped: joining the result
 * back with a space reproduces the input, give or take collapsed whitespace.
 */

/** Abbreviations whose full stop must not be read as the end of a sentence. */
const ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st',
  'e.g', 'i.e', 'etc', 'vs', 'approx', 'no', 'fig',
];

/**
 * Splits a paragraph into sentences.
 *
 * Deliberately conservative - anything it isn't sure about stays joined, because a
 * wrongly-split sentence is far more jarring than an un-split one.
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const out: string[] = [];
  let current = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    current += char;

    if (char !== '.' && char !== '!' && char !== '?') continue;

    // Run on through "..." and "?!" so they close as one sentence.
    let j = i;
    while (j + 1 < trimmed.length && '.!?'.includes(trimmed[j + 1])) {
      current += trimmed[j + 1];
      j++;
    }
    i = j;

    // A closing quote or bracket belongs to the sentence that just ended.
    while (j + 1 < trimmed.length && '”"’\')]'.includes(trimmed[j + 1])) {
      current += trimmed[j + 1];
      j++;
      i = j;
    }

    const next = trimmed[i + 1];
    // Mid-word or mid-number - "3.5", "example.com" - so not a sentence end.
    if (next && next !== ' ' && next !== '\n') continue;

    const words = current.trim().split(/\s+/);
    const lastWord = (words[words.length - 1] || '').toLowerCase().replace(/[^a-z.]/g, '');
    const withoutStop = lastWord.replace(/\.$/, '');
    if (ABBREVIATIONS.includes(withoutStop)) continue;

    // A single initial - "J." in "J. Clear" - is not a sentence either.
    if (/^[a-z]\.$/.test(lastWord)) continue;

    out.push(current.trim());
    current = '';
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Turns a block of prose into the lines to render.
 *
 * **The writer's own line breaks always win.** If the text contains any line break at all,
 * it is rendered exactly as written, one line per line, and nothing is split automatically.
 * Only text written as a single unbroken block gets the sentence-per-line treatment.
 *
 * That rule is what makes the content files editable without touching this code: type the
 * lines where you want them and you get them, leave it as a paragraph and the app lays it
 * out sensibly. (Level 1 now comes line by line from its JSON, so this matters for Levels 2-3.)
 */
export function toReadableLines(text: string | undefined | null): string[] {
  if (!text) return [];

  const authored = text.split('\n').map((line) => line.trim());
  const hasAuthoredBreaks = authored.filter(Boolean).length > 1;

  if (hasAuthoredBreaks) return authored.filter(Boolean);

  return splitSentences(text).filter(Boolean);
}
