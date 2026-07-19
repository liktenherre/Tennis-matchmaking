// Encapsulates match-list and realtime conversation access.

import { supabase } from '@/lib/supabase';
import { getProfilePhotoUrls } from '@/lib/profile-photos';

export type MatchSummary = {
  id: string;
  otherUserId: string;
  firstName: string;
  photoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export const fetchMatches = async (): Promise<MatchSummary[]> => {
  const { data, error } = await supabase.rpc('list_my_matches');
  if (error) throw error;

  const photoUrls = await getProfilePhotoUrls(
    (data ?? []).map((match: Record<string, unknown>) => String(match.other_user_id)),
  );

  return (data ?? []).map((match: Record<string, unknown>) => {
    return {
      id: String(match.id),
      otherUserId: String(match.other_user_id),
      firstName: String(match.first_name),
      photoUrl: photoUrls[String(match.other_user_id)] ?? null,
      lastMessage: match.last_message ? String(match.last_message) : null,
      lastMessageAt: match.last_message_at ? String(match.last_message_at) : null,
    };
  });
};

export const fetchMessages = async (matchId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, match_id, sender_id, body, created_at')
    .eq('match_id', matchId)
    .order('created_at');
  if (error) throw error;

  return (data ?? []).map((message) => ({
    id: message.id,
    matchId: message.match_id,
    senderId: message.sender_id,
    body: message.body,
    createdAt: message.created_at,
  }));
};

// Hermes on iOS has no Web Crypto; client_id only needs a unique 8–100 char string.
const createClientId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const nibble = (Math.random() * 16) | 0;
    const value = char === 'x' ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });

export const sendMessage = async (matchId: string, body: string) => {
  const clientId = createClientId();
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, body: body.trim(), client_id: clientId })
    .select('id, match_id, sender_id, body, created_at')
    .single();
  if (error) throw error;

  return {
    id: data.id,
    matchId: data.match_id,
    senderId: data.sender_id,
    body: data.body,
    createdAt: data.created_at,
  } satisfies ChatMessage;
};
