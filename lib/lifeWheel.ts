// The life wheel: eight areas of life, each rated 1 to 10, and the three zones a score
// lands in. Every word here comes from the challenge JSON (life_areas, zones) - Chat owns
// it, so it is read, never retyped.
//
// A wheel is stored as a string array in area order, one score per area, '' for an area
// not rated yet. That is the same shape as any other multi-part challenge answer, so it
// saves, backs up and restores with no special handling.

import content from './challengeStore/content/foundation-challenge.json';

export type LifeArea = { id: string; name: string; a1: string; a5: string; a10: string };
export type Zone = { id: 'comfort' | 'growth' | 'thrive'; name: string; min: number; max: number };
export type WheelScores = (number | null)[];

export const LIFE_AREAS: LifeArea[] = content.life_areas;
export const ZONES: Zone[] = content.zones as Zone[];

export function zoneOf(score: number | null | undefined): Zone | null {
  if (!score) return null;
  return ZONES.find((z) => score >= z.min && score <= z.max) ?? null;
}

/** A stored wheel answer (strings, area order) as numbers, null where unrated. */
export function toScores(answer: unknown): WheelScores {
  const arr = Array.isArray(answer) ? answer : [];
  return LIFE_AREAS.map((_, i) => {
    const n = Number(arr[i]);
    return n >= 1 && n <= 10 ? n : null;
  });
}

export function hasAnyScore(answer: unknown): boolean {
  return toScores(answer).some((s) => s !== null);
}

/** Sets one area's score on a stored wheel answer, keeping it the full eight long. */
export function withScore(answer: unknown, areaIndex: number, score: number): string[] {
  const next = LIFE_AREAS.map((_, i) => (Array.isArray(answer) ? String(answer[i] ?? '') : ''));
  next[areaIndex] = String(score);
  return next;
}

export function areaByName(name: string): LifeArea | undefined {
  return LIFE_AREAS.find((a) => a.name === name);
}

export function areaIndexByName(name: string): number {
  return LIFE_AREAS.findIndex((a) => a.name === name);
}

/**
 * The Day 30 reveal's three numbers, the Thriver against themselves only.
 * - moved: areas scored higher now than at the baseline.
 * - toGrowth: areas that crossed from comfort into growth.
 * - toThrive: areas that crossed into thrive (from either lower zone).
 * Areas missing a score on either side are left out rather than guessed.
 */
export function revealCounts(baseline: WheelScores, now: WheelScores) {
  let moved = 0;
  let toGrowth = 0;
  let toThrive = 0;
  LIFE_AREAS.forEach((_, i) => {
    const before = baseline[i];
    const after = now[i];
    if (before == null || after == null) return;
    if (after > before) moved += 1;
    const zb = zoneOf(before)?.id;
    const za = zoneOf(after)?.id;
    if (zb === 'comfort' && za === 'growth') toGrowth += 1;
    if (za === 'thrive' && zb !== 'thrive') toThrive += 1;
  });
  return { moved, toGrowth, toThrive };
}

/** Fills {moved}, {to_growth} and {to_thrive} in the reveal summary from the JSON. */
export function fillRevealSummary(template: string, counts: ReturnType<typeof revealCounts>): string {
  return template
    .replace('{moved}', String(counts.moved))
    .replace('{to_growth}', String(counts.toGrowth))
    .replace('{to_thrive}', String(counts.toThrive));
}
