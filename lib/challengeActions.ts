// What some challenge options do besides being chosen. Day 24's "Keep it in my Wins" saves
// the note to Day 1 into In Your Own Words on the Wins tab.
//
// It is kept in step with the answer, never duplicated: one Wins entry per day, replaced if
// the note changes, removed if the option is unticked. The entry's id is remembered here.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { addAcknowledgement, deleteAcknowledgement, getAcknowledgements } from './acknowledgementStore';
import type { ChallengeAnswer, ChallengeDayDef } from './challengeStore';

const KEY = 'ithrive30_challenge_wins_v1';

type Saved = Record<string, { ackId: string; text: string }>;

async function read(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Best-effort, never throws: a Wins entry failing to save must not lose the day's answers. */
export async function syncChallengeWins(day: ChallengeDayDef, answers: ChallengeAnswer[]): Promise<void> {
  try {
    const actionIndex = day.fields.findIndex((f) => f.optionActions && Object.values(f.optionActions).includes('save_to_wins'));
    if (actionIndex < 0) return;
    const field = day.fields[actionIndex];
    const chosen = answers[actionIndex];
    const wants = typeof chosen === 'string' && field.optionActions?.[chosen] === 'save_to_wins';
    // The note it saves is the day's first written answer (Day 24: the note to Day 1).
    const noteIndex = day.fields.findIndex((f) => f.type === 'textarea');
    const note = noteIndex >= 0 && typeof answers[noteIndex] === 'string' ? (answers[noteIndex] as string).trim() : '';

    const saved = await read();
    const existing = saved[day.id];

    if (existing && (!wants || existing.text !== note)) {
      await deleteAcknowledgement(existing.ackId);
      delete saved[day.id];
    }
    if (wants && note && (!existing || existing.text !== note)) {
      await addAcknowledgement(note, '');
      const newest = (await getAcknowledgements())[0];
      if (newest) saved[day.id] = { ackId: newest.id, text: note };
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Non-fatal by design.
  }
}

export async function clearChallengeWins(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
