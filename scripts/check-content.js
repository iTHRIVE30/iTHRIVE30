// Checks the challenge content files for the mistakes that are easy to make when editing
// wording, and reports them in plain English.
//
//   npm run check-content
//
// This is for Andrew, not for CI. The point is that a typo is caught here, with a message
// saying which day and what to do, rather than as a blank screen on a phone.

const fs = require('fs');
const path = require('path');

const LEVEL_DIR = path.join(__dirname, '..', 'lib', 'challengeStore');
// Level 1 is the JSON below (checked by checkFoundationJson); these are the hand-written levels.
const FILES = ['level2-awareness.ts', 'level3-discovery.ts'];
const FOUNDATION_JSON = path.join(LEVEL_DIR, 'content', 'foundation-challenge.json');

// Levels 2 and 3 are placeholder content awaiting a rewrite, and they produce pages of
// style notes that bury the file actually being edited. Anything that would BREAK the app
// is still reported for every level - only the softer notes are held back. Use --all to
// see them.
const PLACEHOLDER_LEVELS = ['level2-awareness.ts', 'level3-discovery.ts'];
const showAllWarnings = process.argv.includes('--all');

const problems = [];
const allWarnings = [];
let warnings = allWarnings;

/**
 * Blanks out the editing-guide block comment so its examples aren't checked as content.
 * Its line breaks are kept, so every line number reported still matches the file.
 */
function withoutBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''));
}

const KNOWN_TYPES = ['text', 'textarea', 'rating5', 'rating10', 'scale10', 'multiselect', 'dropdown'];

/** Every `field: \`value\`` pair in the file, with the line it starts on. */
function readFields(src) {
  const found = [];
  const re = /(\w+): `([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    found.push({
      key: m[1],
      value: m[2],
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return found;
}

function dayLabel(src, index) {
  const before = src.slice(0, index);
  const ids = [...before.matchAll(/id: '([^']+)'/g)];
  return ids.length ? ids[ids.length - 1][1] : 'unknown day';
}

for (const file of FILES) {
  const full = path.join(LEVEL_DIR, file);
  if (!fs.existsSync(full)) continue;

  const raw = fs.readFileSync(full, 'utf8');
  const src = withoutBlockComments(raw);

  const quiet = PLACEHOLDER_LEVELS.includes(file) && !showAllWarnings;
  const held = [];
  warnings = quiet ? held : allWarnings;

  // 1. Backticks must be balanced, or everything after the stray one is broken.
  const backticks = (src.match(/`/g) || []).length;
  if (backticks % 2 !== 0) {
    problems.push(
      `${file}: there is an odd number of backticks (${backticks}).\n` +
        `   One is missing or one too many, and everything after it will break.\n` +
        `   Look for a line where the text isn't closed with a matching \``
    );
  }

  // 2. ${ inside a template string is code, not text.
  const interp = [...src.matchAll(/\$\{/g)];
  for (const m of interp) {
    problems.push(
      `${file}, ${dayLabel(src, m.index)}: found \${ in the text.\n` +
        `   That means "insert code here" and will crash the app. Remove the $ or the {.`
    );
  }

  const fields = readFields(src);

  for (const { key, value, line } of fields) {
    const at = `${file}:${line}`;

    // 3. Quotes should carry an attribution in the format the app can split.
    if (key === 'quote' && value.trim()) {
      const hasCurly = value.includes('“') && value.includes('”');
      const hasTilde = value.includes('~');
      if (!hasTilde) {
        warnings.push(
          `${at}: this quote has no "~ Author" after it, so no name will show.`
        );
      }
      if (!hasCurly && hasTilde) {
        warnings.push(
          `${at}: this quote uses straight quotes or none. Curly “ ” are the standard.`
        );
      }
      if (/”\s*~\s*$/.test(value)) {
        problems.push(`${at}: there is a ~ with no author name after it.`);
      }
    }

    // 5. Smart quotes inside body copy are fine, but a lone “ or ” is usually a slip.
    if (key !== 'quote') {
      const open = (value.match(/“/g) || []).length;
      const close = (value.match(/”/g) || []).length;
      if (open !== close) {
        warnings.push(`${at}: ${key} has unbalanced curly quotes (${open} “ and ${close} ”).`);
      }
    }

    // 6. {name} is the only tag the app understands. Anything else in curly brackets would
    //    show up on screen exactly as typed. See lib/personalise.ts.
    for (const tag of value.match(/\{[^}]*\}/g) || []) {
      if (tag !== '{name}') {
        problems.push(
          `${at}: "${tag}" isn't a tag the app knows, so it will show on screen as typed.\n` +
            `   The only one is {name} - lower case, no spaces.`
        );
      }
    }
    if (key === 'quote' && value.includes('{name}')) {
      problems.push(`${at}: {name} can't go in a quote - those are someone else's words.`);
    }
  }

  // Question types: an unknown type shows nothing at all, so the question has no answer box.
  for (const m of src.matchAll(/type: '([^']+)'/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    if (!KNOWN_TYPES.includes(m[1])) {
      problems.push(
        `${file}:${line}: "${m[1]}" isn't a question type the app knows, so no answer box will show.\n` +
          `   Use one of: ${KNOWN_TYPES.join(', ')}.`
      );
    }
  }

  // "+ add your own" is a switch (allowCustom: true), not an option. Typed into the list it
  // would show as an ordinary chip that just says "+ add your own".
  for (const m of src.matchAll(/options: \[[^\]]*add your own[^\]]*\]/gi)) {
    const line = src.slice(0, m.index).split('\n').length;
    problems.push(
      `${file}:${line}: "+ add your own" is in an options list.\n` +
        `   Take it out of the list and put  allowCustom: true  on the question instead.`
    );
  }

  // "Who they are" notes: on the first day a person is quoted, and never again after.
  if (!PLACEHOLDER_LEVELS.includes(file)) {
    const seenPeople = new Set();
    const blocks = src.split(/(?=id: ')/).slice(1);
    let offset = src.indexOf("id: '");
    for (const block of blocks) {
      const line = src.slice(0, offset).split('\n').length;
      offset += block.length;
      const quote = /quote: `[^`]*~\s*([^,`]+)/.exec(block);
      if (!quote) continue;
      const person = quote[1].trim();
      const hasNote = /quoteNote: `[^`]+`/.test(block);
      const where = `${file}:${line} (${dayLabel(src, offset - 1)})`;
      if (!seenPeople.has(person) && !hasNote) {
        warnings.push(`${where}: first quote from ${person}, but no quoteNote saying who they are.`);
      }
      if (seenPeople.has(person) && hasNote) {
        warnings.push(`${where}: ${person} has been quoted before, so this quoteNote shouldn't be here.`);
      }
      seenPeople.add(person);
    }
  }

  // A 1-10 scale of several things needs the things.
  for (const m of src.matchAll(/type: 'scale10'(?![^}]*items: \[)/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    problems.push(`${file}:${line}: a scale10 question has no items: ['...'] list, so there is nothing to rate.`);
  }

  // 6. Day numbers should be unique and in order.
  const days = [...src.matchAll(/day: (\d+)/g)].map((m) => Number(m[1]));
  const seen = new Set();
  for (const d of days) {
    if (seen.has(d)) problems.push(`${file}: day ${d} appears more than once.`);
    seen.add(d);
  }

  // 7. Ids should be unique - responses are stored against them.
  const ids = [...src.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  const seenIds = new Set();
  for (const id of ids) {
    if (seenIds.has(id)) {
      problems.push(
        `${file}: the id "${id}" is used twice. Two days sharing an id means they share ` +
          `an answer — the second overwrites the first.`
      );
    }
    seenIds.add(id);
  }

  const hidden = quiet && held.length ? ` — ${held.length} style notes hidden (placeholder level, use --all)` : '';
  console.log(`${file}: ${ids.length} days checked${hidden}`);
}

// ---------- Level 1: the foundation challenge JSON from Chat ----------
// Everything the app needs to find in it. A mistake here is a blank question or a panel
// pointing at nothing on someone's phone, so these are problems, not style notes.
function checkFoundationJson() {
  const file = 'content/foundation-challenge.json';
  let data;
  try {
    data = JSON.parse(fs.readFileSync(FOUNDATION_JSON, 'utf8'));
  } catch (e) {
    problems.push(`${file}: can't be read as JSON (${e.message}). A missing comma or quote is the usual cause.`);
    return;
  }
  warnings = allWarnings;

  const TYPES = ['journal', 'select_one', 'select_all', 'select_three', 'scale_1_10', 'life_wheel', 'second_look'];
  const PANELS = ['after_save', 'wheel_contrast', 'growth_pulse', 'said_and_did', 'witness_check', 'replay', 'wheel_reveal'];
  const SELECTS = ['select_one', 'select_all', 'select_three'];
  const days = Array.isArray(data.days) ? data.days : [];
  const allIds = new Set();
  days.forEach((d) => (d.fields || []).forEach((f) => allIds.add(f.id)));
  // Growth-record names the app derives itself, rather than questions.
  const RECORDS = ['focus_area', 'tracker_habits', 'action_log'];
  const known = (id) => allIds.has(id) || RECORDS.includes(id) || String(id).startsWith('wheel_snapshot(');

  if (days.length !== 30) problems.push(`${file}: has ${days.length} days, not 30.`);
  const seenDays = new Set();
  const seenIds = new Set();
  const pending = [];

  for (const d of days) {
    const at = `${file}, Day ${d.day}`;
    if (seenDays.has(d.day)) problems.push(`${at}: this day number appears twice.`);
    seenDays.add(d.day);
    if (!d.title) problems.push(`${at}: no title.`);
    if (d.type === 'content' && !(d.content || []).length) problems.push(`${at}: no content lines.`);
    if (d.type === 'reflection' && !(d.framing || []).length) problems.push(`${at}: no framing lines.`);
    if (d.vision_source && !known(d.vision_source)) problems.push(`${at}: vision_source "${d.vision_source}" isn't a question that exists.`);
    if ((d.pending_approval || []).length) pending.push(`Day ${d.day}: ${d.pending_approval.join('; ')}`);

    for (const p of d.panels || []) {
      if (!PANELS.includes(p.kind)) problems.push(`${at}: panel "${p.kind}" isn't one the app knows, so it won't show.`);
      if (p.source && !known(p.source)) problems.push(`${at}: the ${p.kind} panel reads "${p.source}", which doesn't exist.`);
      const tags = (p.summary || '').match(/\{[^}]*\}/g) || [];
      for (const tag of tags) {
        if (!['{moved}', '{to_growth}', '{to_thrive}'].includes(tag)) problems.push(`${at}: "${tag}" in the reveal summary isn't filled in by the app.`);
      }
    }

    for (const f of d.fields || []) {
      const fat = `${at}, ${f.id}`;
      if (seenIds.has(f.id)) problems.push(`${fat}: this question id is used twice.`);
      seenIds.add(f.id);
      if (!TYPES.includes(f.type)) problems.push(`${fat}: "${f.type}" isn't a question type the app knows, so no answer box will show.`);
      if (!f.prompt) problems.push(`${fat}: no prompt.`);
      if (SELECTS.includes(f.type) && !(f.options || []).length && !f.options_source) {
        problems.push(`${fat}: a select with no options and no options_source.`);
      }
      if ((f.options || []).some((o) => /add your own/i.test(o))) {
        problems.push(`${fat}: "+ add your own" is in the options. Use "allow_custom": true instead.`);
      }
      if (f.options_source && !known(f.options_source)) problems.push(`${fat}: options_source "${f.options_source}" doesn't exist.`);
      if (f.source && !known(f.source)) problems.push(`${fat}: source "${f.source}" doesn't exist.`);
      if (f.show_if) {
        const target = (d.fields || []).find((g) => g.id === f.show_if.field);
        if (!target) problems.push(`${fat}: show_if points at "${f.show_if.field}", which isn't on this day.`);
        else if (!(target.options || []).includes(f.show_if.equals)) {
          problems.push(`${fat}: show_if waits for "${f.show_if.equals}", which isn't one of that question's options - it would never appear.`);
        }
      }
    }

    const strings = JSON.stringify(d);
    for (const tag of strings.match(/\{[a-z_]+\}/g) || []) {
      if (!['{name}', '{moved}', '{to_growth}', '{to_thrive}'].includes(tag)) {
        problems.push(`${at}: "${tag}" isn't a tag the app knows, so it will show on screen as typed.`);
      }
    }
  }

  console.log(`${file}: ${days.length} days checked`);
  if (pending.length) {
    console.log(`\nAwaiting Sharyn's approval (builds and shows, but check before release):`);
    pending.forEach((p) => console.log('  · ' + p));
  }
}

checkFoundationJson();

// Working words Code wrote while Chat's copy is pending (lib/challengeCopy.ts).
try {
  const draftCount = (fs.readFileSync(path.join(__dirname, '..', 'lib', 'challengeCopy.ts'), 'utf8').match(/^\s+'[a-z_.]+':/gm) || []).length;
  console.log(`\n${draftCount} working lines in lib/challengeCopy.ts are drafts awaiting Chat (handoff/CHANGES.md).`);
} catch {
  // Not fatal - the file is optional to this check.
}

console.log('');

if (allWarnings.length) {
  console.log(`${allWarnings.length} thing${allWarnings.length === 1 ? '' : 's'} worth a look:\n`);
  allWarnings.forEach((w) => console.log('  - ' + w));
  console.log('');
}

if (problems.length) {
  console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'} that will break the app:\n`);
  problems.forEach((p) => console.log('  x ' + p + '\n'));
  process.exitCode = 1;
} else {
  console.log('No problems found. Safe to save and commit.');
}
