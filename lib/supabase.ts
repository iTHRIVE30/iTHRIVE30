import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/**
 * The one Supabase client. URL and anon key come from .env (EXPO_PUBLIC_*), which is fine to
 * ship in the app: the anon key can only do what row level security allows, and every table
 * only lets a Thriver touch their own rows. The service role key must NEVER be in the app.
 *
 * The session is kept under a key deliberately OUTSIDE the `ithrive30_` prefix, so a backup
 * file never carries a sign-in token, and restoring or "Delete everything" doesn't sign
 * anyone out.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False until .env is filled in. Sign-in shows why instead of failing silently. */
export const isSupabaseConfigured = !!url && !!anonKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'ithrive30-device:supabase-auth',
        autoRefreshToken: true,
        persistSession: true,
        // No URL on a phone to read a session from.
        detectSessionInUrl: false,
      },
    })
  : null;

// Refresh the session only while the app is in the foreground (Supabase's recommendation).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
