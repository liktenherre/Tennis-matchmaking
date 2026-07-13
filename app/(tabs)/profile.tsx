// Lets players maintain their profile, notifications, language, and account safety.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Eyebrow, Field, Screen } from '@/components/ui';
import i18n, { languageStorageKey } from '@/lib/i18n';
import { registerPushToken, revokePushToken } from '@/lib/notifications';
import { getProfilePhotoUrls } from '@/lib/profile-photos';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { Switch, Text, View } from '@/tw';
import { Image } from '@/tw/image';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([
      supabase.from('profiles').select('first_name, bio, notifications_enabled').maybeSingle(),
      supabase.auth.getUser(),
    ]).then(async ([{ data }, { data: user }]) => {
      if (!data || !user.user) return;
      setFirstName(data.first_name);
      setBio(data.bio ?? '');
      setNotificationsEnabled(data.notifications_enabled);
      const urls = await getProfilePhotoUrls([user.user.id]);
      setPhotoUrl(urls[user.user.id] ?? null);
    });
  }, []);

  const save = async () => {
    setIsSaving(true);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim(), bio: bio.trim() })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);
    setIsSaving(false);
    setError(saveError?.message ?? '');
  };

  const setNotifications = async (enabled: boolean) => {
    const previousValue = notificationsEnabled;
    setNotificationsEnabled(enabled);
    try {
      if (enabled) {
        const token = await registerPushToken();
        if (!token) throw new Error(t('profile.notificationDenied'));
      }
      const { data: user } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', user.user?.id);
      if (updateError) throw updateError;
      if (!enabled) {
        const { error: tokenError } = await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', user.user?.id);
        if (tokenError) throw tokenError;
        await revokePushToken();
      }
    } catch (notificationError) {
      setNotificationsEnabled(previousValue);
      setError(
        notificationError instanceof Error
          ? notificationError.message
          : 'Notifications indisponibles.',
      );
    }
  };

  const changeLanguage = async (language: 'fr' | 'en') => {
    await AsyncStorage.setItem(languageStorageKey, language);
    await i18n.changeLanguage(language);
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase.from('profiles').update({ locale: language }).eq('id', user.user.id);
    }
  };

  const signOut = async () => {
    try {
      await revokePushToken();
      await supabase.auth.signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : t('profile.signOutError'));
    }
  };

  const deleteAccount = () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void revokePushToken()
            .then(() => supabase.rpc('delete_my_account'))
            .then(async ({ error: deleteError }) => {
              if (deleteError) throw deleteError;
              await supabase.auth.signOut();
            })
            .catch((deleteError: Error) => setError(deleteError.message));
        },
      },
    ]);
  };

  return (
    <Screen>
      <View className="items-center gap-3">
        <Image
          source={photoUrl ?? 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'}
          className="h-28 w-28 rounded-sm bg-ink object-cover"
        />
        <Eyebrow tone="lime">Player card</Eyebrow>
        <Text className="font-display text-[36px] leading-none tracking-[0.02em] text-ink">
          {firstName || '—'}
        </Text>
      </View>

      <Field label={t('onboarding.firstName')} value={firstName} onChangeText={setFirstName} />
      <Field
        label={t('profile.about')}
        value={bio}
        onChangeText={(value) => setBio(value.slice(0, 180))}
        multiline
      />
      <Button label={t('profile.save')} variant="lime" onPress={save} loading={isSaving} />

      <View className="flex-row items-center justify-between border border-border bg-surface px-4 py-4">
        <View className="mr-4 flex-1 gap-1">
          <Text className="font-sans-bold text-[17px] text-ink">{t('profile.notifications')}</Text>
          <Text className="font-sans text-[14px] text-muted">{t('profile.notificationsHint')}</Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotifications}
          trackColor={{ false: colors.border, true: colors.lime }}
          thumbColor={colors.surface}
        />
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label="Français"
            variant={i18n.language === 'fr' ? 'primary' : 'secondary'}
            onPress={() => void changeLanguage('fr')}
          />
        </View>
        <View className="flex-1">
          <Button
            label="English"
            variant={i18n.language === 'en' ? 'primary' : 'secondary'}
            onPress={() => void changeLanguage('en')}
          />
        </View>
      </View>

      {error ? (
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
          {error}
        </Text>
      ) : null}

      <Button label={t('profile.signOut')} variant="secondary" onPress={() => void signOut()} />
      <Button label={t('profile.delete')} variant="danger" onPress={deleteAccount} />
    </Screen>
  );
}
