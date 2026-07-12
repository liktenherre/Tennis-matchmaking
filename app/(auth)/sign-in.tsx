// Starts secure phone authentication with a Côte d’Azur-first welcome screen.

import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, Field, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);

/** Local-only phone + OTP mapped in supabase/config.toml [auth.sms.test_otp]. */
const DEV_PHONE = '+33699999999';
const DEV_OTP = '123456';

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

  // Skips SMS in Expo Go / simulators by verifying the fixed local test OTP immediately.
  const signInAsDeveloper = async () => {
    setError('');
    setIsSending(true);

    const { error: sendError } = await supabase.auth.signInWithOtp({ phone: DEV_PHONE });
    if (sendError) {
      setIsSending(false);
      setError(sendError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: DEV_PHONE,
      token: DEV_OTP,
      type: 'sms',
    });
    setIsSending(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.clay, fontSize: 18, fontWeight: '800' }}>
            CÔTE TENNIS
          </Text>
          <Text
            style={{ color: colors.ink, fontSize: 38, fontWeight: '800', lineHeight: 42 }}
          >
            {t('auth.title')}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 26 }}>
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
        <Button label={t('auth.sendCode')} onPress={sendCode} loading={isSending} />
        {__DEV__ ? (
          <Button
            label="Dev sign-in (skip SMS)"
            onPress={signInAsDeveloper}
            loading={isSending}
            variant="secondary"
          />
        ) : null}
        <Text selectable style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
          {t('auth.ageConsent')}
        </Text>
      </View>
    </Screen>
  );
}
