// Defines the three primary destinations after onboarding.

import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.canvas,
        headerTitleStyle: {
          fontFamily: 'BebasNeue_400Regular',
          fontSize: 28,
          letterSpacing: 0.5,
          color: colors.canvas,
        },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: '#1F2228',
        },
        tabBarLabelStyle: {
          fontFamily: 'AzeretMono_400Regular',
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: t('tabs.discover'), tabBarLabel: t('tabs.discover') }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: t('tabs.matches'), tabBarLabel: t('tabs.matches') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarLabel: t('tabs.profile') }}
      />
    </Tabs>
  );
}
