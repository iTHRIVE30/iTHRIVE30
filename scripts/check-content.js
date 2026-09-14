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
const FILES = ['level1-foundation.ts', 'level2-awareness.ts', 'level3-discovery.ts'];

// Levels 2 and 3 are placeholder content awaiting a rewrite, and they produce pages of
// style notes that bury the file actually being edited. Anything that would BREAK the app
// is still reported for every level - only the softer notes are held back. Use --all to
// see them.
const PLACEHOLDER_LEVELS = ['level2-awareness.ts', 'level3-discovery.ts'];
const showAllWarnings = process.argv.includes('--all');

const problems = [];
const allWarnings = [];
let warnings = allWarnings;

/** Strips the editing-guide block comment so its examples aren't checked as content. */
function withoutBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

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

    // 4. A prompt ending in a full stop reads oddly above an input box.
    if (key === 'prompt' && /\.$/.test(value.trim()) && !/\?$/.test(value.trim())) {
      warnings.push(`${at}: prompt ends in a full stop — most others don't.`);
    }

    // 5. Smart quotes inside body copy are fine, but a lone “ or ” is usually a slip.
    if (key !== 'quote') {
      const open = (value.match(/“/g) || []).length;
      const close = (value.match(/”/g) || []).length;
      if (open !== close) {
        warnings.push(`${at}: ${key} has unbalanced curly quotes (${open} “ and ${close} ”).`);
      }
    }
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
