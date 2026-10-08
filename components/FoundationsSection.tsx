import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';
import LifeWheelChart from './LifeWheelChart';
import { copy } from '../lib/challengeCopy';
import { hasAnyScore, toScores } from '../lib/lifeWheel';
import {
  FOUNDATIONS,
  answerById,
  currentValue,
  getFoundations,
  growFoundation,
  type FoundationStore,
  type FoundationVersion,
} from '../lib/foundations';
import { getChallengeResponses, type ChallengeAnswer, type ChallengeResponses } from '../lib/challengeStore';

function asText(v: ChallengeAnswer | undefined): string {
  if (v === undefined) return '';
  return Array.isArray(v) ? v.filter(Boolean).join(' · ') : String(v).trim();
}

/** "Day 4 · 12 October", or "My Journey · 30 October". */
function versionLabel(v: FoundationVersion): string {
  const where = v.day > 0 ? `${copy('foundations.from.day')} ${v.day}` : copy('foundations.from.journey');
  const when = new Date(v.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  return `${where} · ${when}`;
}

/**
 * My Journey's safe space: each foundation's current version, when it last changed, and
 * every earlier version, dated. The ones meant to evolve (why, story, standard, what stays)
 * offer "it has grown", which adds a version to the same home record the challenge day uses.
 */
export default function FoundationsSection() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [store, setStore] = useState<FoundationStore>({});
  const [responses, setResponses] = useState<ChallengeResponses>({});
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [growing, setGrowing] = useState<string | null>(null);
  const [growText, setGrowText] = useState('');

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([getFoundations(), getChallengeResponses()]);
    setStore(s);
    setResponses(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const saveGrowth = async (key: string) => {
    const text = growText.trim();
    if (!text) return;
    setStore(await growFoundation(key, text));
    setResponses(await getChallengeResponses());
    setGrowing(null);
    setGrowText('');
  };

  const written = FOUNDATIONS.filter((f) => !f.hidden && currentValue(f.key, store, responses) !== undefined);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{copy('foundations.title')}</Text>
      <Text style={styles.subtitle}>{copy('foundations.subtitle')}</Text>

      {written.length === 0 && <Text style={styles.empty}>{copy('foundations.empty')}</Text>}

      {written.map((f) => {
        const value = currentValue(f.key, store, responses);
        const versions = store[f.key] ?? [];
        const latest = versions[versions.length - 1];
        const earlier = versions.slice(0, -1).reverse();
        const isWheel = f.key === 'wheel';
        const alongside = (f.alongside || []).map((id) => asText(answerById(id, store, responses))).filter(Boolean);

        return (
          <View key={f.key} style={styles.card}>
            <Text style={styles.label}>{f.label.toUpperCase()}</Text>
            {isWheel && hasAnyScore(value) ? (
              <LifeWheelChart series={[{ scores: toScores(value) }]} size={240} />
            ) : (
              <Text style={styles.value}>{asText(value)}</Text>
            )}
            {alongside.map((a) => (
              <Text key={a} style={styles.alongside}>
                {a}
              </Text>
            ))}
            {!!latest && <Text style={styles.meta}>{versionLabel(latest)}</Text>}

            {earlier.length > 0 && (
              <Pressable onPress={() => setOpenHistory(openHistory === f.key ? null : f.key)} hitSlop={6}>
                <Text style={styles.link}>
                  {openHistory === f.key ? copy('foundations.hide') : `${copy('foundations.earlier')} (${earlier.length})`}
                </Text>
              </Pressable>
            )}
            {openHistory === f.key &&
              earlier.map((v, i) => (
                <View key={i} style={styles.history}>
                  {isWheel ? (
                    <LifeWheelChart series={[{ scores: toScores(v.value), dashed: true }]} size={200} />
                  ) : (
                    <Text style={styles.historyText}>{asText(v.value)}</Text>
                  )}
                  <Text style={styles.meta}>{versionLabel(v)}</Text>
                </View>
              ))}

            {f.evolves && growing !== f.key && (
              <Pressable
                style={styles.button}
                onPress={() => {
                  setGrowing(f.key);
                  setGrowText(asText(value));
                }}
              >
                <Text style={styles.buttonText}>{copy('foundations.grown')}</Text>
              </Pressable>
            )}
            {growing === f.key && (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={styles.input}
                  value={growText}
                  onChangeText={setGrowText}
                  placeholder={copy('foundations.grown.placeholder')}
                  placeholderTextColor={t.muted}
                  multiline
                  autoFocus
                />
                <View style={styles.buttonRow}>
                  <Pressable style={styles.button} onPress={() => saveGrowth(f.key)}>
                    <Text style={styles.buttonText}>{copy('foundations.save')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setGrowing(null);
                      setGrowText('');
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.link}>{copy('foundations.cancel')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    section: { marginBottom: 24, gap: 10 },
    title: { color: t.ink, fontSize: 20, fontWeight: '700' },
    subtitle: { color: t.secondary, fontSize: 13, lineHeight: 19 },
    empty: { color: t.secondary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, gap: 8 },
    label: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    value: { color: t.ink, fontSize: 16, lineHeight: 24 },
    alongside: { color: t.body, fontSize: 14, lineHeight: 21 },
    meta: { color: t.secondaryDim, fontSize: 12 },
    link: { color: t.primary, fontSize: 13, fontWeight: '600' },
    history: { borderLeftWidth: 2, borderLeftColor: t.border, paddingLeft: 10, gap: 4 },
    historyText: { color: t.secondary, fontSize: 14, lineHeight: 21 },
    button: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: t.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    buttonText: { color: t.primary, fontWeight: '700', fontSize: 13 },
    buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    input: {
      color: t.ink,
      fontSize: 15,
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderStrong,
      padding: 12,
      minHeight: 70,
      textAlignVertical: 'top',
    },
  });
