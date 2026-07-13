// Starts secure phone authentication with a Broadcast Scoreboard welcome.

import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, DisplayTitle, Eyebrow, Field, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Text, View } from '@/tw';

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);

/** Local-only credentials — email auth avoids the SMS provider requirement entirely. */
const DEV_EMAIL = 'dev@cotetennis.local';
const DEV_PASSWORD = 'cote-tennis-dev';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('+33');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  // Bypasses phone OTP entirely — GoTrue rejects SMS without a configured provider,
  // even when auth.sms.test_otp is set.
  const signInAsDeveloper = async () => {
    setError('');
    setIsSending(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });

    if (!signInError) {
      setIsSending(false);
      router.replace('/');
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    setIsSending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.replace('/');
  };

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
        <Button
          label="Dev sign-in (email)"
          onPress={signInAsDeveloper}
          loading={isSending}
          variant="secondary"
        />
      ) : null}
      <Text selectable className="text-center font-sans text-[14px] leading-5 text-muted">
        {t('auth.ageConsent')}
      </Text>
    </Screen>
  );
}
