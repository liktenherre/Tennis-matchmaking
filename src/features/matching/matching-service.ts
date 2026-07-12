// Connects discovery, swipes, and match safety actions to Supabase.

import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getProfilePhotoUrls } from '@/lib/profile-photos';
import type { DiscoveryPreferences, DiscoveryProfile } from './matching';

export const fetchCandidates = async (
  preferences: DiscoveryPreferences,
): Promise<DiscoveryProfile[]> => {
  const { data, error } = await supabase.rpc('discover_profiles', {
    maximum_distance_km: preferences.maximumDistanceKm,
    minimum_age: preferences.minimumAge,
    maximum_age: preferences.maximumAge,
    preferred_levels: preferences.levels,
    preferred_format: preferences.format,
    preferred_availability: preferences.availability,
    preferred_gender: preferences.genderPreference,
  });

  if (error) throw error;

  const photoUrls = await getProfilePhotoUrls(
    (data ?? []).map((profile: Record<string, unknown>) => String(profile.id)),
  );

  return (data ?? []).map((profile: Record<string, unknown>) => {
    return {
      id: String(profile.id),
      firstName: String(profile.first_name),
      age: Number(profile.age),
      city: String(profile.city),
      distanceKm: Number(profile.distance_km),
      level: profile.level as DiscoveryProfile['level'],
      gender: profile.gender as DiscoveryProfile['gender'],
      formats: profile.formats as DiscoveryProfile['formats'],
      availability: profile.availability as string[],
      courtNames: profile.court_names as string[],
      bio: String(profile.bio ?? ''),
      photoUrl: photoUrls[String(profile.id)] ?? null,
    };
  });
};

export const recordSwipe = async (targetUserId: string, liked: boolean) => {
  const { data, error } = await supabase.rpc('record_swipe', {
    target_user_id: targetUserId,
    liked,
  });

  if (error) throw error;
  return data as { matched: boolean; match_id: string | null };
};

export const blockUser = async (blockedUserId: string) => {
  const { error } = await supabase.from('blocks').insert({ blocked_user_id: blockedUserId });
  if (error) throw error;
  void track('user_blocked');
};

export const reportUser = async (
  reportedUserId: string,
  reason: string,
  details?: string,
) => {
  const { error } = await supabase.from('reports').insert({
    reported_user_id: reportedUserId,
    reason,
    details: details?.trim() || null,
  });
  if (error) throw error;
  void track('user_reported', { reason });
};
