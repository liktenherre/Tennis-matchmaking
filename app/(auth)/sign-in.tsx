// Starts secure phone authentication with a Broadcast Scoreboard welcome.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, DisplayTitle, Eyebrow, Field, Screen } from '@/components/ui';
import {
  createDevUser,
  loadDevUsers,
  rememberDevUser,
  signInDevUser,
  type DevUser,
} from '@/lib/dev-auth';
import { supabase } from '@/lib/supabase';
import { Pressable, Text, View } from '@/tw';

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);

const NEW_USER = 'new' as const;

export default function SignInScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('+33');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [selected, setSelected] = useState<string>(NEW_USER);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load previously created / seeded local email users for the multi-user picker.
  useEffect(() => {
    void loadDevUsers().then(setDevUsers);
  }, []);

  const sendCode = async () => {
    const parsed = phoneSchema.safeParse(phone.replaceAll(' ', ''));
    if (!parsed.success) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setError('');
    setIsSending(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: parsed.data });
    setIsSending(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push({ pathname: '/verify', params: { phone: parsed.data } });
  };

  // Creates a fresh @cotetennis.local user, or signs into one from the picker.
  const signInAsDeveloper = async () => {
    setError('');
    setIsSending(true);
    setPickerOpen(false);

    if (selected === NEW_USER) {
      const result = await createDevUser();
      setIsSending(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDevUsers(await loadDevUsers());
      router.replace('/');
      return;
    }

    const existing = devUsers.find((user) => user.email === selected);
    const result = await signInDevUser(selected);
    setIsSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (existing) await rememberDevUser(existing);
    router.replace('/');
  };

  const selectedLabel =
    selected === NEW_USER
      ? 'New user'
      : (devUsers.find((user) => user.email === selected)?.label ?? selected);

  return (
    <Screen>
      <View className="-mx-6 -mt-6 mb-2 bg-ink px-6 pb-8 pt-14">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="rounded-sm bg-lime px-2.5 py-1">
            <Text className="font-mono text-[11px] text-ink">LIVE</Text>
          </View>
          <Eyebrow tone="lime">Broadcast</Eyebrow>
        </View>
        <Text className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-lime">
          Côte Tennis
        </Text>
        <DisplayTitle className="text-[56px] text-canvas">{t('auth.title')}</DisplayTitle>
        <Text className="mt-3 font-sans text-[17px] leading-6 text-muted">
          {t('auth.subtitle')}
        </Text>
      </View>

      <Field
        label={t('auth.phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        error={error}
      />
      <Button label={t('auth.sendCode')} variant="lime" onPress={sendCode} loading={isSending} />
      {__DEV__ ? (
        <View className="gap-2">
          <Text className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Dev account
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose dev account"
            onPress={() => setPickerOpen((open) => !open)}
            className="min-h-[52px] flex-row items-center justify-between rounded-sm border border-border bg-surface px-4 active:opacity-80"
          >
            <View className="flex-1 pr-3">
              <Text className="font-sans text-[17px] text-ink">{selectedLabel}</Text>
              {selected !== NEW_USER ? (
                <Text className="mt-0.5 font-mono text-[12px] text-muted">{selected}</Text>
              ) : (
                <Text className="mt-0.5 font-sans text-[13px] text-muted">
                  Creates a fresh local email user
                </Text>
              )}
            </View>
            <Text className="font-mono text-[12px] text-muted">{pickerOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {pickerOpen ? (
            <View className="overflow-hidden rounded-sm border border-border bg-surface">
              <DevOption
                label="New user"
                detail="Create & sign in"
                selected={selected === NEW_USER}
                onPress={() => {
                  setSelected(NEW_USER);
                  setPickerOpen(false);
                }}
              />
              {devUsers.map((user) => (
                <DevOption
                  key={user.email}
                  label={user.label}
                  detail={user.email}
                  selected={selected === user.email}
                  onPress={() => {
                    setSelected(user.email);
                    setPickerOpen(false);
                  }}
                />
              ))}
            </View>
          ) : null}
          <Button
            label={
              selected === NEW_USER
                ? 'Dev sign-in (new user)'
                : `Dev sign-in as ${selectedLabel}`
            }
            onPress={signInAsDeveloper}
            loading={isSending}
            variant="secondary"
          />
        </View>
      ) : null}
      <Text selectable className="text-center font-sans text-[14px] leading-5 text-muted">
        {t('auth.ageConsent')}
      </Text>
    </Screen>
  );
}

function DevOption({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`border-b border-border px-4 py-3 active:opacity-80 ${selected ? 'bg-ink' : 'bg-surface'}`}
    >
      <Text className={`font-sans text-[16px] ${selected ? 'text-lime' : 'text-ink'}`}>{label}</Text>
      <Text className="mt-0.5 font-mono text-[12px] text-muted">{detail}</Text>
    </Pressable>
  );
}
