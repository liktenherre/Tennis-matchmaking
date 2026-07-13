// Verifies the SMS code and hands routing back to the authenticated root stack.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DisplayTitle, Field, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Text } from '@/tw';

export default function VerifyScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async () => {
    if (!phone || !/^\d{6}$/.test(code)) {
      setError(t('auth.invalidCode'));
      return;
    }

    setIsVerifying(true);
    const { error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setIsVerifying(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace('/onboarding');
  };

  return (
    <Screen>
      <DisplayTitle>{t('auth.verifyTitle')}</DisplayTitle>
      <Text selectable className="font-sans text-[17px] text-muted">
        {t('auth.codeSent', { phone })}
      </Text>
      <Field
        label={t('auth.code')}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        error={error}
      />
      <Button label={t('auth.verify')} variant="lime" onPress={verify} loading={isVerifying} />
    </Screen>
  );
}
