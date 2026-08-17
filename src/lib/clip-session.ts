// Imports Supabase session tokens written by the native App Clip into the App Group.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import {
  APP_GROUP_ID,
  CLIP_PENDING_WINDOW_ID_KEY,
  CLIP_SESSION_ACCESS_TOKEN_KEY,
  CLIP_SESSION_REFRESH_TOKEN_KEY,
} from '@/lib/invite';
import { supabase } from '@/lib/supabase';

const PENDING_ROUTE_KEY = 'cote-tennis:pending-free-invite';

export type ClipHandoff = {
  imported: boolean;
  pendingWindowId: string | null;
};

export const importClipSessionIfNeeded = async (): Promise<ClipHandoff> => {
  if (Platform.OS !== 'ios') {
    return { imported: false, pendingWindowId: null };
  }

  const storage = new ExtensionStorage(APP_GROUP_ID);
  const accessToken = storage.get(CLIP_SESSION_ACCESS_TOKEN_KEY);
  const refreshToken = storage.get(CLIP_SESSION_REFRESH_TOKEN_KEY);
  const pendingWindowId = storage.get(CLIP_PENDING_WINDOW_ID_KEY);

  if (pendingWindowId) {
    await AsyncStorage.setItem(PENDING_ROUTE_KEY, pendingWindowId);
  }

  if (!accessToken || !refreshToken) {
    return { imported: false, pendingWindowId: pendingWindowId || null };
  }

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    storage.remove(CLIP_SESSION_ACCESS_TOKEN_KEY);
    storage.remove(CLIP_SESSION_REFRESH_TOKEN_KEY);
    return { imported: false, pendingWindowId: pendingWindowId || null };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  storage.remove(CLIP_SESSION_ACCESS_TOKEN_KEY);
  storage.remove(CLIP_SESSION_REFRESH_TOKEN_KEY);

  if (error) {
    return { imported: false, pendingWindowId: pendingWindowId || null };
  }

  return { imported: true, pendingWindowId: pendingWindowId || null };
};

export const consumePendingFreeInviteRoute = async () => {
  const windowId = await AsyncStorage.getItem(PENDING_ROUTE_KEY);
  if (windowId) await AsyncStorage.removeItem(PENDING_ROUTE_KEY);
  return windowId;
};

export const clearPendingClipWindowId = () => {
  if (Platform.OS !== 'ios') return;
  new ExtensionStorage(APP_GROUP_ID).remove(CLIP_PENDING_WINDOW_ID_KEY);
  void AsyncStorage.removeItem(PENDING_ROUTE_KEY);
};
