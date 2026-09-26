import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LOGO_IS_HERE } from '../lib/brand';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

/**
 * First run only. Four cards and a name, then straight into day one.
 *
 * A new user currently lands on thirteen habits, four tabs, Levels and 357 badges with no
 * explanation of what any of it is. This exists to answer four questions and then get out
 * of the way - it is not a tour, and it never appears again.
 *
 * The third card is the important one. "You cannot fall behind" is the single most
 * load-bearing thing about this programme and the least obvious from the interface: every
 * day unlocks on schedule whether or not you did the last one, and no day ever locks for
 * editing. Someone who believes they can fail on day three stops on day three.
 *
 * The last card asks for a first name - the one setting worth asking on day one, because
 * it lets the app speak to them from the first morning. It is optional, Skip keeps
 * whatever was typed, and nothing else from Settings is asked here: theme follows the
 * phone, reminders are offered later on Today (see ReminderOffer), and date of birth stays
 * in Settings so setup never feels like an age check.
 *
 * Rendered as an overlay from app/_layout.tsx, above the Stack, never as a route - the
 * router must not be able to navigate back into it.
 */

type Card = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const CARDS: Card[] = [
  {
    icon: 'calendar-outline',
    title: 'Thirty days at a time',
    body:
      'A Level is thirty days. Each one has a daily challenge and a set of habits to tick off. Finish it and the next Level opens.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Log the day as you live it',
    body:
      'Tick what you did, rate your mood, write a note if you want to. Everything saves the instant you touch it — there is no submit button anywhere in this app.',
  },
  {
    icon: 'lock-open-outline',
    title: 'You cannot fall behind',
    body:
      'Days unlock on the calendar, not on your streak. Miss one and nothing is taken away — every day stays open to fill in later, forever. Nothing here locks.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'It stays on your phone',
    body:
      'No account, no sign-up, nothing sent anywhere. That also means it is yours to look after — make a backup from Settings once you have a week behind you.',
  },
  {
    icon: 'person-outline',
    title: 'What should we call you?',
    body: 'Just your first name, if you like. You can change it any time in Settings.',
  },
];

/** The last card carries the name box. */
const NAME_CARD = CARDS.length - 1;

/**
 * `onDone` receives the first name as typed ('' if none). The caller saves it in the same
 * write as `onboardedAt`, so the two can never race each other into storage.
 */
export default function Onboarding({ onDone }: { onDone: (firstName: string) => void }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [firstName, setFirstName] = useState('');
  const finish = () => onDone(firstName.trim());
  const scrollRef = useRef<ScrollView>(null);

  const last = index === CARDS.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const advance = () => {
    if (last) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Image source={LOGO_IS_HERE[t.logoTone]} style={styles.logo} resizeMode="contain" />
        <Pressable onPress={finish} hitSlop={12} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyboardShouldPersistTaps="handled"
        style={styles.pager}
      >
        {CARDS.map((card, i) => (
          <View key={card.title} style={[styles.card, { width }]}>
            <View style={styles.iconRing}>
              <Ionicons name={card.icon} size={34} color={t.primary} />
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.body}</Text>
            {i === NAME_CARD && (
              <TextInput
                style={styles.nameInput}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={t.muted}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={40}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {CARDS.map((card, i) => (
            <View key={card.title} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        <Pressable style={styles.button} onPress={advance}>
          <Text style={styles.buttonText}>{last ? 'Start Day One' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={17} color={t.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.ground,
      zIndex: 95,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 68,
    },
    logo: { width: 150, height: 58 },
    skip: { paddingVertical: 8, paddingHorizontal: 4 },
    skipText: { color: t.muted, fontSize: 14, fontWeight: '600' },

    pager: { flex: 1 },
    card: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
    iconRing: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 1,
      borderColor: t.primaryDim,
      backgroundColor: t.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
    },
    cardTitle: {
      color: t.primary,
      fontSize: 25,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 16,
    },
    cardBody: {
      color: t.body,
      fontSize: 16,
      lineHeight: 25,
      textAlign: 'center',
      maxWidth: 340,
    },
    nameInput: {
      marginTop: 28,
      width: '100%',
      maxWidth: 300,
      borderWidth: 1,
      borderColor: t.borderStrong,
      backgroundColor: t.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: t.ink,
      fontSize: 17,
      textAlign: 'center',
    },

    footer: { paddingHorizontal: 28, paddingBottom: 54, gap: 26 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.borderStrong },
    dotOn: { backgroundColor: t.primary, width: 22 },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.primary,
      borderRadius: 14,
      paddingVertical: 16,
    },
    buttonText: { color: t.onPrimary, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  });
