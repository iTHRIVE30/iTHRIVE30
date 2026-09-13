// The once-a-day welcome screen: which picture, which quote, and whether it's been seen
// today yet.
//
// Deliberately decoupled from the habit log — this shows on the first open of a calendar
// day whether or not anything has been logged, and dismissing it records nothing about the
// user's progress. It's a greeting, not a gate.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from './habitStore';
import { getTodayChallengeInfo } from './challengeStore';
import { HERO_IMAGES } from './heroImages.generated';

const LAST_SEEN_KEY = 'ithrive30_daily_hero_last_seen';

export type DailyHeroContent = {
  image: number | null;
  /** The quote itself, without its wrapping smart quotes - the UI draws its own. */
  quote: string;
  /** Who said it, without the leading "~". Empty when the quote is unattributed. */
  attribution: string;
  levelName: string;
  levelDay: number;
  challengeTitle: string;
  theme: string;
};

/**
 * True if today's welcome hasn't been shown yet. Any storage failure returns false — a
 * broken read should mean "don't interrupt", never "show it again every launch".
 */
export async function shouldShowDailyHero(): Promise<boolean> {
  try {
    const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
    return lastSeen !== getTodayKey();
  } catch {
    return false;
  }
}

export async function markDailyHeroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY, getTodayKey());
  } catch {
    // Non-fatal: worst case the welcome shows once more later today.
  }
}

/**
 * Picks the day's hero from the date itself, so it's the same picture all day for everyone
 * on that date, and walks through the set one day at a time rather than repeating at random.
 */
export function heroForDate(dateKey: string = getTodayKey()): number | null {
  if (HERO_IMAGES.length === 0) return null;
  const daysSinceEpoch = Math.floor(new Date(dateKey + 'T00:00:00').getTime() / 86400000);
  const index = ((daysSinceEpoch % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length;
  return HERO_IMAGES[index];
}

/**
 * Challenge quotes are written as: “<the quote>” ~ <Author>
 *
 * Splitting the two apart lets the hero set them differently, and - more importantly -
 * stops the closing smart quote stranding itself mid-sentence. Naively trimming quote marks
 * off each end leaves `...your systems.” ~ James Clear`, because the closing mark isn't at
 * the end of the string at all.
 *
 * Anything that doesn't match the house format is returned whole, unattributed, rather than
 * being mangled by a guess.
 */
export function parseQuote(raw: string): { quote: string; attribution: string } {
  const text = raw.trim();
  if (!text) return { quote: '', attribution: '' };

  const closing = Math.max(text.lastIndexOf('”'), text.lastIndexOf('"'));
  const opens = /^[“"]/.test(text);

  if (opens && closing > 0) {
    return {
      quote: text.slice(1, closing).trim(),
      // Drop the separator (~, em/en dash or hyphen) that introduces the author.
      attribution: text.slice(closing + 1).replace(/^[\s~—–-]+/, '').trim(),
    };
  }

  // No quote marks, but still "something ~ Author".
  const tilde = text.indexOf('~');
  if (tilde > 0) {
    return {
      quote: text.slice(0, tilde).trim().replace(/^[“"]/, '').replace(/[”"]$/, ''),
      attribution: text.slice(tilde + 1).trim(),
    };
  }

  return { quote: text.replace(/^[“"]/, '').replace(/[”"]$/, '').trim(), attribution: '' };
}

export async function getDailyHeroContent(): Promise<DailyHeroContent> {
  const base: DailyHeroContent = {
    image: heroForDate(),
    quote: '',
    attribution: '',
    levelName: '',
    levelDay: 0,
    challengeTitle: '',
    theme: '',
  };

  try {
    const info = await getTodayChallengeInfo();
    const parsed = info.challenge ? parseQuote(info.challenge.quote) : { quote: '', attribution: '' };
    return {
      ...base,
      quote: parsed.quote,
      attribution: parsed.attribution,
      levelName: info.level.name,
      levelDay: info.levelDay || 1,
      challengeTitle: info.challenge ? info.challenge.title : '',
      theme: info.challenge ? info.challenge.theme : '',
    };
  } catch {
    // A missing or half-written challenge day must never stop the app opening - the hero
    // just falls back to the picture and the brand line.
    return base;
  }
}
