// Owns global providers, fonts, and protects authentication routes.

import '@/global.css';
import '@/lib/i18n';
import { AzeretMono_400Regular, AzeretMono_500Medium } from '@expo-google-fonts/azeret-mono';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import {
  Saira_400Regular,
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
} from '@expo-google-fonts/saira';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { use, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import i18n from '@/lib/i18n';
import { subscribeNotificationResponses } from '@/lib/notifications';
import { SessionContext, SessionProvider } from '@/providers/session-provider';
import { colors } from '@/theme';
import { Text, View } from '@/tw';

function RootNavigator() {
  const { t } = useTranslation();
  const { session, isLoading, isOnboarded, profileError, refreshProfile } =
    use(SessionContext);

  // Opens chat when the player taps a match/message push while signed in.
  useEffect(() => {
    if (!session || !isOnboarded) return;
    return subscribeNotificationResponses();
  }, [session, isOnboarded]);

  if (isLoading) return null;
  if (session && profileError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-canvas p-6">
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
          {t('common.sessionError')}
        </Text>
        <Button label={t('common.retry')} onPress={() => void refreshProfile()} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.canvas,
          headerTitleStyle: {
            fontFamily: 'Saira_600SemiBold',
            color: colors.canvas,
          },
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
              headerStyle: { backgroundColor: colors.canvas },
              headerTintColor: colors.ink,
              headerTitleStyle: {
                fontFamily: 'Saira_600SemiBold',
                color: colors.ink,
              },
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Saira_400Regular,
    Saira_500Medium,
    Saira_600SemiBold,
    Saira_700Bold,
    ChakraPetch_700Bold,
    AzeretMono_400Regular,
    AzeretMono_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </I18nextProvider>
  );
}
