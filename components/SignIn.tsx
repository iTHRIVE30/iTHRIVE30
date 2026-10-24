import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { LOGO_IS_HERE } from '../lib/brand';
import { ensureProfile } from '../lib/lifecycle';
import { supabase } from '../lib/supabase';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

/**
 * Email sign-in, required before the app opens (Andrew and Sharyn, 24 Oct 2026). Shown once
 * per device: the session is kept on the phone and refreshes itself.
 *
 * A 6-digit code is emailed and typed in here - no password to forget, no magic link
 * (a link would have to deep-link back into the app, which Expo Go can't do reliably).
 *
 * If Google sign-in is ever added, Sign in with Apple must be added alongside it - Apple
 * rejects apps that offer one third-party sign-in without theirs.
 *
 * Rendered as an overlay from app/_layout.tsx, never a route, like Onboarding.
 *
 * Copy here is Code's working draft, for Sharyn's sign-off.
 */
export default function SignIn({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const cleanEmail = email.trim().toLowerCase();
  const emailLooksRight = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const sendCode = async () => {
    if (!supabase || !emailLooksRight || busy) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setMessage("That didn't send. Check your connection and try again.");
      return;
    }
    setStep('code');
  };

  const verify = async () => {
    if (!supabase || code.trim().length < 6 || busy) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'email' });
    if (error) {
      setBusy(false);
      setMessage("That code didn't match. Check the latest email and try again.");
      return;
    }
    await ensureProfile();
    setBusy(false);
    onDone();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={LOGO_IS_HERE[theme.logoTone]} style={styles.logo} resizeMode="contain" />

        {step === 'email' ? (
          <>
            <Text style={styles.title}>Sign in with your email</Text>
            <Text style={styles.body}>{"We'll send you a 6-digit code. No password needed."}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
            <Pressable
              style={[styles.button, (!emailLooksRight || busy) && styles.buttonDisabled]}
              onPress={sendCode}
              disabled={!emailLooksRight || busy}
            >
              {busy ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.buttonText}>Send my code</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.body}>Your code is on its way to {cleanEmail}.</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.faint}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={verify}
            />
            <Pressable
              style={[styles.button, (code.length < 6 || busy) && styles.buttonDisabled]}
              onPress={verify}
              disabled={code.length < 6 || busy}
            >
              {busy ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>
            <Pressable
              style={styles.link}
              onPress={() => {
                setStep('email');
                setCode('');
                setMessage('');
              }}
            >
              <Text style={styles.linkText}>Use a different email</Text>
            </Pressable>
          </>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}

        <Text style={styles.footnote}>
          Your account shares your progress through the challenges with Bondi Project Global, so the next ones can be
          shaped by how people actually use them. What you write stays on your phone.
        </Text>
      </ScrollView>
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
      zIndex: 96,
    },
    content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
    logo: { width: 180, height: 70, marginBottom: 36 },
    title: { color: t.primary, fontSize: 25, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    body: { color: t.body, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 320 },
    input: {
      marginTop: 28,
      width: '100%',
      maxWidth: 320,
      borderWidth: 1,
      borderColor: t.borderStrong,
      backgroundColor: t.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: t.ink,
      fontSize: 16,
    },
    codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
    button: {
      marginTop: 16,
      width: '100%',
      maxWidth: 320,
      backgroundColor: t.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.45 },
    buttonText: { color: t.onPrimary, fontSize: 16, fontWeight: '700' },
    link: { marginTop: 16, padding: 6 },
    linkText: { color: t.muted, fontSize: 14, fontWeight: '600' },
    message: { marginTop: 16, color: t.danger, fontSize: 14, textAlign: 'center', maxWidth: 320 },
    footnote: { marginTop: 40, color: t.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 320 },
  });
