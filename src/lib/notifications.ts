// Registers device push tokens only after the player opts into match alerts.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const pushTokenStorageKey = 'cote-tennis:push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerPushToken = async () => {
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
