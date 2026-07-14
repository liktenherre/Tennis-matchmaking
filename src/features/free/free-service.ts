// Connects Free window post/list/interest/accept and played confirmation to Supabase RPCs.

import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type {
  FreeCard,
  FreePreset,
  MatchSessionState,
  MyFreeState,
} from './free';

const mapWindow = (raw: Record<string, unknown> | null) => {
  if (!raw) return null;
  return {
    id: String(raw.id),
    startsAt: String(raw.starts_at),
    endsAt: String(raw.ends_at),
    courtNames: (raw.court_names as string[]) ?? [],
    areaLabel: String(raw.area_label ?? ''),
    createdAt: String(raw.created_at),
  };
};

export const fetchMyFreeWindow = async (): Promise<MyFreeState> => {
  const { data, error } = await supabase.rpc('get_my_free_window');
  if (error) throw error;
  const payload = data as Record<string, unknown>;
  const inbound = ((payload.inbound as Record<string, unknown>[]) ?? []).map((row) => ({
    fromUserId: String(row.from_user_id),
    firstName: String(row.first_name),
    level: String(row.level),
    formats: (row.formats as string[]) ?? [],
    createdAt: String(row.created_at),
    accepted: Boolean(row.accepted),
  }));
  return {
    window: mapWindow((payload.window as Record<string, unknown>) ?? null),
    inbound,
  };
};

export const postFreeWindow = async (input: {
  preset: FreePreset;
  startsAt?: string;
  endsAt?: string;
  areaLabel?: string;
}) => {
  const { data, error } = await supabase.rpc('post_free_window', {
    preset: input.preset === 'custom' ? 'custom' : input.preset,
    starts_at_input: input.preset === 'custom' ? input.startsAt : null,
    ends_at_input: input.preset === 'custom' ? input.endsAt : null,
    area_label_input: input.areaLabel ?? '',
  });
  if (error) throw error;
  void track('free_posted', { preset: input.preset });
  return mapWindow(data as Record<string, unknown>);
};

export const cancelFreeWindow = async () => {
  const { error } = await supabase.rpc('cancel_free_window');
  if (error) throw error;
};

export const listFreeNearby = async (): Promise<FreeCard[]> => {
  const { data, error } = await supabase.rpc('list_free_nearby');
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    windowId: String(row.window_id),
    userId: String(row.user_id),
    firstName: String(row.first_name),
    distanceKm: Number(row.distance_km),
    level: String(row.level),
    formats: (row.formats as string[]) ?? [],
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    areaLabel: String(row.area_label ?? ''),
    courtNames: (row.court_names as string[]) ?? [],
    overlapMinutes: Number(row.overlap_minutes ?? 0),
    sharedCourtCount: Number(row.shared_court_count ?? 0),
    interested: Boolean(row.interested),
  }));
};

export const expressFreeInterest = async (windowId: string) => {
  const { error } = await supabase.rpc('express_free_interest', {
    window_id_input: windowId,
  });
  if (error) throw error;
  void track('interest_expressed');
};

export const acceptFreeInterest = async (windowId: string, fromUserId: string) => {
  const { data, error } = await supabase.rpc('accept_free_interest', {
    window_id_input: windowId,
    from_user_id_input: fromUserId,
  });
  if (error) throw error;
  void track('match_created', { source: 'free' });
  return data as { matched: boolean; match_id: string; other_first_name: string };
};

export const fetchMatchSession = async (matchId: string): Promise<MatchSessionState> => {
  const { data, error } = await supabase.rpc('get_match_session', {
    match_id_input: matchId,
  });
  if (error) throw error;
  const payload = data as Record<string, unknown>;
  return {
    matchId: String(payload.match_id),
    confirmedBy: (payload.confirmed_by as string[]) ?? [],
    playedAt: payload.played_at ? String(payload.played_at) : null,
    founderMediated: Boolean(payload.founder_mediated),
    iConfirmed: Boolean(payload.i_confirmed),
  };
};

export const confirmPlayed = async (matchId: string) => {
  const { data, error } = await supabase.rpc('confirm_played', {
    match_id_input: matchId,
  });
  if (error) throw error;
  const payload = data as Record<string, unknown>;
  void track('session_confirmed');
  if (payload.just_played) void track('played');
  return {
    matchId: String(payload.match_id),
    confirmedBy: (payload.confirmed_by as string[]) ?? [],
    playedAt: payload.played_at ? String(payload.played_at) : null,
    founderMediated: Boolean(payload.founder_mediated),
    iConfirmed: true,
  } satisfies MatchSessionState;
};
