// Registers device push tokens and routes match/message notification taps into chat.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const pushTokenStorageKey = 'cote-tennis:push-token';
const supportsNativeNotifications = Platform.OS !== 'web';

if (supportsNativeNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const matchIdFromNotificationData = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const matchId = (data as { matchId?: unknown }).matchId;
  return typeof matchId === 'string' && matchId.length > 0 ? matchId : null;
};

const openMatchFromNotification = (data: unknown) => {
  const matchId = matchIdFromNotificationData(data);
  if (!matchId) return;
  router.push({ pathname: '/chat/[matchId]', params: { matchId } });
};

let handledLaunchResponse = false;

/** Subscribes to cold-start and foreground notification taps that target a match. */
export const subscribeNotificationResponses = () => {
  if (!supportsNativeNotifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    openMatchFromNotification(response.notification.request.content.data);
  });

  if (!handledLaunchResponse) {
    handledLaunchResponse = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      openMatchFromNotification(response.notification.request.content.data);
      void Notifications.clearLastNotificationResponseAsync();
    });
  }

  return () => subscription.remove();
};

export const registerPushToken = async () => {
  if (!supportsNativeNotifications) return null;
  if (!Device.isDevice) throw new Error('Les notifications nécessitent un appareil physique.');

  const existing = await Notifications.getPermissionsAsync();
  const permission =
    existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('Configurez le projectId EAS avant les notifications.');
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_push_token', {
    token_input: token,
    platform_input: process.env.EXPO_OS,
  });
  if (error) throw error;
  await AsyncStorage.setItem(pushTokenStorageKey, token);

  return token;
};

export const revokePushToken = async () => {
  const token = await AsyncStorage.getItem(pushTokenStorageKey);
  if (!token) return;

  await supabase.rpc('revoke_push_token', { token_input: token });
  await AsyncStorage.removeItem(pushTokenStorageKey);
};
