// Self-acknowledgements: things the user decides are worth saying about themselves.
//
// Nothing in here is derived, scored, or checked against a rule. A badge is the app
// noticing something; an acknowledgement is the user noticing it, in their own words. That
// distinction is the whole point - it's the one place in Wins where the app has no opinion.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ithrive30_acknowledgements_v1';

export type Acknowledgement = {
  id: string;
  /** The user's own words. Required - an empty acknowledgement is not saved. */
  text: string;
  /** Optional short label for what it was about, e.g. "90 days alcohol-free". */
  occasion: string;
  createdAt: string;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getAcknowledgements(): Promise<Acknowledgement[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Acknowledgement[];
    // Newest first - the most recent thing you said about yourself is the one you want to see.
    return [...parsed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function addAcknowledgement(text: string, occasion: string): Promise<Acknowledgement[]> {
  const trimmed = text.trim();
  if (!trimmed) return getAcknowledgements();

  const existing = await getAcknowledgements();
  const next: Acknowledgement[] = [
    { id: generateId(), text: trimmed, occasion: occasion.trim(), createdAt: new Date().toISOString() },
    ...existing,
  ];
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Non-fatal - the caller still gets the updated list for this session.
  }
  return next;
}

export async function deleteAcknowledgement(id: string): Promise<Acknowledgement[]> {
  const existing = await getAcknowledgements();
  const next = existing.filter((a) => a.id !== id);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Non-fatal.
  }
  return next;
}

/** "11 September 2026" - the date the acknowledgement was made, for the shareable tile. */
export function formatAcknowledgementDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
