// Resolves private profile photos through the authorization-aware Edge Function.

import { supabase } from './supabase';

export const getProfilePhotoUrls = async (profileIds: string[]) => {
  if (profileIds.length === 0) return {} as Record<string, string>;

  try {
    const { data, error } = await supabase.functions.invoke('profile-photos', {
      body: { profileIds },
    });
    // Soft-fail when the function is down (local/dev) so Deck/Matches still load.
    if (error) return {} as Record<string, string>;
    return (data?.urls ?? {}) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
};
