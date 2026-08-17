// Copies EXPO_PUBLIC Supabase values into targets/clip/Info.plist for App Clip builds.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plistPath = resolve(root, 'targets/clip/Info.plist');

const loadEnvFile = () => {
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env optional when EAS injects env
  }
};

loadEnvFile();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!url || !key) {
  console.error(
    'sync-clip-env: missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
  process.exit(1);
}

let plist = readFileSync(plistPath, 'utf8');
plist = plist.replace(
  /<key>CTSupabaseURL<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CTSupabaseURL</key>\n    <string>${escapeXml(url)}</string>`,
);
plist = plist.replace(
  /<key>CTSupabaseAnonKey<\/key>\s*<string>[^<]*<\/string>/,
  `<key>CTSupabaseAnonKey</key>\n    <string>${escapeXml(key)}</string>`,
);

writeFileSync(plistPath, plist);
console.log('sync-clip-env: wrote Supabase URL + anon key into targets/clip/Info.plist');

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
