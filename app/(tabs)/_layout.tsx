// Defines the four primary destinations after onboarding — Free is the default home.

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  focused,
  outline,
  solid,
  color,
  size,
}: {
  focused: boolean;
  outline: IoniconName;
  solid: IoniconName;
  color: ColorValue;
  size: number;
}) {
  return (
    <Ionicons
      name={focused ? solid : outline}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

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
        name="free"
        options={{
          title: t('tabs.free'),
          tabBarLabel: t('tabs.free'),
          tabBarAccessibilityLabel: t('tabs.free'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              outline="radio-outline"
              solid="radio"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabs.matches'),
          tabBarLabel: t('tabs.matches'),
          tabBarAccessibilityLabel: t('tabs.matches'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              outline="tennisball-outline"
              solid="tennisball"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarLabel: t('tabs.discover'),
          tabBarAccessibilityLabel: t('tabs.discover'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              outline="layers-outline"
              solid="layers"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              focused={focused}
              outline="person-outline"
              solid="person"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
