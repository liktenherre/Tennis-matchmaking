// Renders the filter-aware swipe deck as broadcast lower-thirds.

import * as Haptics from 'expo-haptics';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, DisplayTitle, Eyebrow, Screen } from '@/components/ui';
import type { DiscoveryPreferences, DiscoveryProfile } from '@/features/matching/matching';
import { fetchCandidates, recordSwipe } from '@/features/matching/matching-service';
import { track } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';
import { Image } from '@/tw/image';
import { Pressable, Text, View } from '@/tw';

const defaultPreferences: DiscoveryPreferences = {
  maximumDistanceKm: 25,
  minimumAge: 18,
  maximumAge: 70,
  levels: ['beginner', 'intermediate', 'advanced', 'competition'],
  format: 'either',
  availability: [],
  genderPreference: 'everyone',
};

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [lastPassed, setLastPassed] = useState<DiscoveryProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const position = useRef(new Animated.ValueXY()).current;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await supabase.from('discovery_preferences').select('*').maybeSingle();
      const nextPreferences = data
        ? {
            maximumDistanceKm: data.maximum_distance_km,
            minimumAge: data.minimum_age,
            maximumAge: data.maximum_age,
            levels: data.levels,
            format: data.preferred_format,
            availability: data.availability,
            genderPreference: data.gender_preference,
          }
        : defaultPreferences;
      setPreferences(nextPreferences);
      const candidates = await fetchCandidates(nextPreferences);
      setProfiles(candidates);
      void track('discovery_loaded', { candidateCount: candidates.length });
    } catch (loadError) {
      setError(getErrorMessage(loadError, t('discover.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Refreshes the deck after the filters sheet closes or the tab becomes active.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const current = profiles[0];
  const cardWidth = Math.min(width - spacing.lg * 2, 440);

  const decide = async (liked: boolean) => {
    if (!current) return;
    if (process.env.EXPO_OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setProfiles((items) => items.slice(1));
    if (!liked) setLastPassed(current);

    try {
      const result = await recordSwipe(current.id, liked);
      if (result.matched) {
        void track('match_created');
        Alert.alert(
          t('discover.matchTitle'),
          t('discover.matchBody', { name: current.firstName }),
        );
      }
    } catch {
      setProfiles((items) => [current, ...items]);
      setError(t('discover.saveError'));
    }
  };

  const animateDecision = (liked: boolean) => {
    Animated.timing(position, {
      toValue: { x: liked ? width : -width, y: 0 },
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      void decide(liked);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 12,
        onPanResponderMove: Animated.event([null, { dx: position.x }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) > width * 0.25) {
            animateDecision(gesture.dx > 0);
            return;
          }
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        },
      }),
    [current?.id, width],
  );

  const undoPass = async () => {
    if (!lastPassed) return;
    const restored = lastPassed;
    setLastPassed(null);
    setProfiles((items) => [restored, ...items]);
    const { data: user } = await supabase.auth.getUser();
    await supabase
      .from('swipes')
      .delete()
      .eq('swiper_id', user.user?.id)
      .eq('target_id', restored.id)
      .eq('liked', false);
  };

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.lime} size="large" />
        </View>
      </Screen>
    );
  }

  const levelLabel = current
    ? t(
        {
          beginner: 'onboarding.beginner',
          intermediate: 'onboarding.intermediate',
          advanced: 'onboarding.advanced',
          competition: 'onboarding.competition',
        }[current.level],
      )
    : '';

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Eyebrow>
          {t('discover.radius', { distance: preferences.maximumDistanceKm })}
        </Eyebrow>
        <Link href="/filters" asChild>
          <Pressable accessibilityRole="button">
            <Text className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue">
              {t('discover.filters')}
            </Text>
          </Pressable>
        </Link>
      </View>

      {error ? (
        <View className="gap-4">
          <Text selectable accessibilityRole="alert" className="font-sans text-danger">
            {error}
          </Text>
          <Button label={t('common.retry')} variant="secondary" onPress={load} />
        </View>
      ) : null}

      {current ? (
        <>
          <Animated.View
            {...panResponder.panHandlers}
            style={{
              width: cardWidth,
              alignSelf: 'center',
              transform: [
                { translateX: position.x },
                {
                  rotate: position.x.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: ['-8deg', '0deg', '8deg'],
                  }),
                },
              ],
            }}
          >
            <View className="overflow-hidden rounded-md bg-ink">
              <Image
                source={
                  current.photoUrl ??
                  'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'
                }
                className="aspect-[0.88] w-full bg-ink object-cover"
                transition={180}
              />
              <View className="gap-2 bg-ink px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <Eyebrow tone="lime">{levelLabel}</Eyebrow>
                  <Text className="font-score text-[22px] text-lime">
                    {current.distanceKm.toFixed(1)} km
                  </Text>
                </View>
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text className="flex-1 font-display text-[34px] leading-[0.95] tracking-[0.02em] text-canvas">
                    {current.firstName}, {current.age}
                  </Text>
                  <Text className="font-sans-medium text-[14px] text-muted">{current.city}</Text>
                </View>
                <Text selectable className="font-sans text-[15px] leading-5 text-muted">
                  {current.bio}
                </Text>
                {current.courtNames[0] ? (
                  <Text selectable className="font-mono text-[11px] uppercase tracking-[0.1em] text-blue">
                    {t('discover.playsAt', {
                      courts: current.courtNames.slice(0, 2).join(' · '),
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
          </Animated.View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label={t('discover.pass')}
                variant="secondary"
                onPress={() => animateDecision(false)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('discover.like')}
                variant="lime"
                onPress={() => animateDecision(true)}
              />
            </View>
          </View>
        </>
      ) : (
        <View className="flex-1 justify-center gap-4">
          <DisplayTitle className="text-center">{t('discover.emptyTitle')}</DisplayTitle>
          <Text className="text-center font-sans text-[17px] leading-6 text-muted">
            {t('discover.empty')}
          </Text>
          <Link href="/filters" asChild>
            <Pressable>
              <Text className="text-center font-mono text-[12px] uppercase tracking-[0.12em] text-blue">
                {t('discover.widen')}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      {lastPassed ? (
        <Pressable accessibilityRole="button" onPress={undoPass}>
          <Text className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {t('discover.undo')}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
