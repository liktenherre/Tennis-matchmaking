// Resolves private profile photos through the authorization-aware Edge Function.

import { supabase } from './supabase';

export const getProfilePhotoUrls = async (profileIds: string[]) => {
  if (profileIds.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase.functions.invoke('profile-photos', {
    body: { profileIds },
  });
  if (error) throw error;

  return (data?.urls ?? {}) as Record<string, string>;
};
