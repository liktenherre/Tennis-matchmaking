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
        tabBarActiveTintColor: colors.court,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
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
