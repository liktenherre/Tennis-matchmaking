// Emits allowlisted product events without message content or precise location.

import { supabase } from './supabase';

export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'discovery_loaded'
  | 'match_created'
  | 'first_message_sent'
  | 'user_blocked'
  | 'user_reported'
  | 'operation_failed';

const forbiddenKeys = new Set([
  'message',
  'phone',
  'latitude',
  'longitude',
  'exact_location',
]);

export const track = async (
  name: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
) => {
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([key]) => !forbiddenKeys.has(key)),
  );

  await supabase.from('analytics_events').insert({ name, properties: safeProperties });
};
