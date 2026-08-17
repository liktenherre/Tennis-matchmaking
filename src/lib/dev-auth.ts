// Email/password helpers for local __DEV__ and the personal web preview.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const DEV_PASSWORD = 'cote-tennis-dev';
export const DEV_EMAIL_DOMAIN = 'cotetennis.local';

export const isPreviewAuthEnabled =
  Boolean(__DEV__) || process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH === 'true';

const storageKey = 'cote-tennis/dev-users';

export type DevUser = {
  email: string;
  label: string;
};

const isDevEmail = (email: string) =>
  email.toLowerCase().endsWith(`@${DEV_EMAIL_DOMAIN}`);

const labelFromEmail = (email: string) => {
  const local = email.split('@')[0] ?? email;
  if (local === 'dev') return 'Dev (legacy)';

  const stamped = /^dev-(\d+)$/i.exec(local);
  if (stamped) {
    const createdAt = Number(stamped[1]);
    if (createdAt > 1e12) {
      const time = new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return `Dev ${time}`;
    }
  }

  return local;
};

async function readStoredDevUsers(): Promise<DevUser[]> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as DevUser[];
    return parsed.filter((user) => user?.email && isDevEmail(user.email));
  } catch {
    return [];
  }
}

export async function loadDevUsers(): Promise<DevUser[]> {
  const byEmail = new Map<string, DevUser>();

  for (const user of await readStoredDevUsers()) {
    byEmail.set(user.email.toLowerCase(), {
      email: user.email,
      label: user.label || labelFromEmail(user.email),
    });
  }

  // Seeded local RPC lists auth.users with @cotetennis.local (anon-callable).
  const { data } = await supabase.rpc('list_local_dev_users');
  if (Array.isArray(data)) {
    for (const row of data as { email?: string; label?: string }[]) {
      if (!row.email || !isDevEmail(row.email)) continue;
      const key = row.email.toLowerCase();
      byEmail.set(key, {
        email: row.email,
        label: row.label || byEmail.get(key)?.label || labelFromEmail(row.email),
      });
    }
  }

  return [...byEmail.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function rememberDevUser(user: DevUser): Promise<void> {
  const existing = await readStoredDevUsers();
  const next = [
    ...existing.filter((item) => item.email.toLowerCase() !== user.email.toLowerCase()),
    { email: user.email, label: user.label || labelFromEmail(user.email) },
  ];
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

export function nextDevEmail(): string {
  return `dev-${Date.now()}@${DEV_EMAIL_DOMAIN}`;
}

export async function signInDevUser(email: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });
  return error ? { error: error.message } : {};
}

export async function createDevUser(): Promise<{ email?: string; error?: string }> {
  const email = nextDevEmail();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: DEV_PASSWORD,
  });

  if (error) return { error: error.message };

  // Local email confirmations are off, but fall back if GoTrue omitted a session.
  if (!data.session) {
    const signedIn = await signInDevUser(email);
    if (signedIn.error) return { error: signedIn.error };
  }

  const user: DevUser = { email, label: labelFromEmail(email) };
  await rememberDevUser(user);
  return { email };
}
