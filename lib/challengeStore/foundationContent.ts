// Level 1, the foundation challenge, read straight from Chat's JSON.
//
// content/foundation-challenge.json is the source: every word in it is Chat's (and
// Sharyn's), so it is loaded and mapped here, never retyped. A new version from Chat
// replaces the file. `npm run check-content` validates it.
//
// What the JSON says that never reaches the screen: review_notes, status, role,
// anchor_type, pending_approval, notes_for_build.
//
// Day ids stay l1-d1 ... l1-d30 - answers are stored against them, by position.

import content from './content/foundation-challenge.json';
import type { ChallengeDayDef, ChallengeField, ChallengePanel, OptionAction } from './types';

type RawField = {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  items?: string[];
  allow_custom?: boolean;
  options_order?: string;
  options_source?: string;
  option_actions?: Record<string, string>;
  default_from?: string;
  show_if?: { field: string; equals: string };
  saves?: string;
  source?: string;
};

type RawPanel = {
  kind: string;
  text?: string;
  title?: string;
  prompt?: string;
  label?: string;
  source?: string;
  summary?: string;
  options?: string[];
  saves?: string;
};

type RawDay = {
  day: number;
  copy_id: string;
  type: 'content' | 'reflection';
  title: string;
  quote?: string;
  quote_attribution?: string;
  quote_note?: string | null;
  content?: string[];
  framing?: string[];
  affirmation?: string;
  affirmation_prompt?: string;
  panels?: RawPanel[];
  fields: RawField[];
  action?: string;
  action_proof?: { text: string; source: string } | null;
  show_day2_vision?: boolean;
  vision_source?: string;
};

const RAW_DAYS = content.days as unknown as RawDay[];

/**
 * Who-they-are notes the JSON leaves out at a person's first appearance. Drafted in Code,
 * awaiting Sharyn (handoff/CHANGES.md item 7). A note Chat supplies always wins.
 */
const DRAFT_NOTES: Record<string, string> = {
  'Sharyn Brown': 'Founder of Bondi Project Global and iTHRIVE30.',
  'Angela Duckworth': 'American psychologist and author of Grit. Born 1970.',
  'Simon Sinek': 'British-born American author and speaker, known for Start With Why. Born 1973.',
  'Tony Robbins': 'American author, coach and motivational speaker. Born 1960.',
  'Albert Einstein': 'German-born physicist, best known for his theory of relativity. 1879–1955.',
};

/** Not offered until the app is in the store (Andrew, 8 Oct). */
const HIDDEN_OPTIONS = ['A review in the App Store'];

const ACTIONS: Record<string, OptionAction> = {
  'Share my progress': 'share_progress',
  'Keep it in my Wins': 'save_to_wins',
};

/** "Sharyn Brown, Be Inspired: Bondi (2021)" -> "Sharyn Brown". */
function personOf(attribution: string): string {
  return attribution.split(',')[0].trim();
}

/** `wheel_snapshot(kind=benchmark)` names the Day 1 wheel; anything else is a field id. */
function resolveSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  if (source.startsWith('wheel_snapshot(kind=benchmark)')) return 'foundation.d01.q1';
  return source;
}

function mapField(f: RawField): ChallengeField {
  const base: ChallengeField = {
    id: f.id,
    prompt: f.prompt,
    type: 'textarea',
    saves: f.saves,
    source: resolveSource(f.source),
  };
  if (f.default_from === 'focus_area') base.defaultFrom = 'focus_area';
  if (f.options_order === 'lowest_score_first') base.optionsOrder = 'lowest_score_first';
  if (f.options_source) base.optionsSource = f.options_source;
  if (f.show_if) base.showIf = f.show_if;
  if (f.allow_custom) base.allowCustom = true;

  const options = (f.options || []).filter((o) => !HIDDEN_OPTIONS.includes(o));
  if (f.option_actions) {
    const actions: Record<string, OptionAction> = {};
    for (const key of Object.keys(f.option_actions)) if (ACTIONS[key]) actions[key] = ACTIONS[key];
    base.optionActions = actions;
  }

  switch (f.type) {
    case 'journal':
      return { ...base, type: 'textarea' };
    case 'select_one':
      return { ...base, type: 'dropdown', options };
    case 'select_all':
      return { ...base, type: 'multiselect', options };
    case 'select_three':
      return { ...base, type: 'multiselect', max: 3, options };
    case 'scale_1_10':
      return f.items && f.items.length
        ? { ...base, type: 'scale10', items: f.items }
        : { ...base, type: 'rating10' };
    case 'life_wheel':
      return { ...base, type: 'wheel' };
    case 'second_look':
      return { ...base, type: 'second_look' };
    default:
      // check-content rejects unknown types, so this only guards a hand-edited file.
      return base;
  }
}

function mapDay(d: RawDay, notedPeople: Set<string>): ChallengeDayDef {
  const isReflection = d.type === 'reflection';
  const fields: ChallengeField[] = [];
  const panels: ChallengePanel[] = [];

  if (isReflection) {
    if (d.show_day2_vision && d.vision_source) panels.push({ kind: 'vision', source: d.vision_source });
    for (const p of d.panels || []) {
      if (p.kind === 'said_and_did') panels.push({ kind: 'said_and_did' });
      // The two panels you answer become questions, so they save like any other answer.
      if (p.kind === 'growth_pulse') {
        fields.push({ id: `${d.copy_id}.pulse`, prompt: p.prompt || '', type: 'pulse', saves: p.saves });
      }
      if (p.kind === 'witness_check') {
        fields.push({ id: `${d.copy_id}.witness`, prompt: p.prompt || '', type: 'dropdown', options: p.options || [], saves: p.saves });
      }
    }
  }

  d.fields.forEach((f) => fields.push(mapField(f)));

  if (!isReflection) {
    for (const p of d.panels || []) {
      if (p.kind === 'after_save') {
        const wheelIndex = fields.findIndex((f) => f.type === 'wheel');
        panels.push({ kind: 'after_save', text: p.text || '', afterField: Math.max(0, wheelIndex) });
      }
      if (p.kind === 'wheel_contrast') {
        const wordsIndex = fields.findIndex((f) => f.type === 'multiselect' && f.max === 3);
        panels.push({ kind: 'wheel_contrast', title: p.title || '', text: p.text || '', wordsField: wordsIndex });
      }
      if (p.kind === 'replay' && p.source) panels.push({ kind: 'replay', label: p.label || '', source: p.source });
      if (p.kind === 'wheel_reveal') panels.push({ kind: 'wheel_reveal', title: p.title || '', summary: p.summary || '' });
    }
  }

  // Who they are: on a person's first quote only (Andrew's rule), whatever the JSON says.
  let quote = '';
  let quoteNote: string | undefined;
  if (!isReflection && d.quote && d.quote_attribution) {
    quote = `“${d.quote}” ~ ${d.quote_attribution}`;
    const person = personOf(d.quote_attribution);
    if (!notedPeople.has(person)) {
      notedPeople.add(person);
      quoteNote = d.quote_note || DRAFT_NOTES[person];
    }
  }

  return {
    id: `l1-d${d.day}`,
    day: d.day,
    copyId: d.copy_id,
    kind: isReflection ? 'reflection' : 'content',
    title: d.title,
    theme: '',
    quote,
    quoteNote,
    lesson: (isReflection ? d.framing : d.content)?.join('\n') ?? '',
    affirmation: d.affirmation,
    affirmationPrompt: d.affirmation_prompt,
    panels,
    worksheetTitle: '',
    fields,
    doThisLabel: isReflection ? '' : 'Action',
    doThis: d.action ?? '',
    // Every content day's action can be ticked: it feeds "what you did" on reflection days.
    actionCheck: !isReflection && d.action ? 'Done' : undefined,
    actionProof: d.action_proof?.text,
    actionProofSource: d.action_proof?.source,
    goDeeper: '',
  };
}

function buildDays(): ChallengeDayDef[] {
  const notedPeople = new Set<string>();
  return [...RAW_DAYS].sort((a, b) => a.day - b.day).map((d) => mapDay(d, notedPeople));
}

export const LEVEL_1_DAYS: ChallengeDayDef[] = buildDays();

/** Every field across the level, by copy id - how one day finds another day's answer. */
export const FIELD_INDEX: Record<string, { dayId: string; index: number; field: ChallengeField }> = (() => {
  const map: Record<string, { dayId: string; index: number; field: ChallengeField }> = {};
  LEVEL_1_DAYS.forEach((day) =>
    day.fields.forEach((field, index) => {
      if (field.id) map[field.id] = { dayId: day.id, index, field };
    })
  );
  return map;
})();
