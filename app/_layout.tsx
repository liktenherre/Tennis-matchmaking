// Owns global providers and protects authentication, onboarding, and app routes.

import '@/lib/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { use } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import i18n from '@/lib/i18n';
import { SessionContext, SessionProvider } from '@/providers/session-provider';
import { colors } from '@/theme';

function RootNavigator() {
  const { t } = useTranslation();
  const { session, isLoading, isOnboarded, profileError, refreshProfile } =
    use(SessionContext);

  if (isLoading) return null;
  if (session && profileError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          backgroundColor: colors.canvas,
        }}
      >
        <Text selectable accessibilityRole="alert" style={{ color: colors.danger }}>
          {t('common.sessionError')}
        </Text>
        <Button label={t('common.retry')} onPress={() => void refreshProfile()} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !isOnboarded}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && isOnboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[matchId]" options={{ title: t('chat.title') }} />
          <Stack.Screen
            name="filters"
            options={{
              title: t('discover.filters'),
              presentation: 'formSheet',
              sheetGrabberVisible: true,
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </I18nextProvider>
  );
}
