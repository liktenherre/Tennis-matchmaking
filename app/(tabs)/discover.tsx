// Renders the filter-aware swipe deck and records private interest decisions.

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Screen } from '@/components/ui';
import type { DiscoveryPreferences, DiscoveryProfile } from '@/features/matching/matching';
import { fetchCandidates, recordSwipe } from '@/features/matching/matching-service';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme';

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
      setError(loadError instanceof Error ? loadError.message : t('discover.loadError'));
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.court} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted }}>
          {t('discover.radius', { distance: preferences.maximumDistanceKm })}
        </Text>
        <Link href="/filters" asChild>
          <Pressable accessibilityRole="button">
            <Text style={{ color: colors.court, fontWeight: '700' }}>
              {t('discover.filters')}
            </Text>
          </Pressable>
        </Link>
      </View>

      {error ? (
        <View style={{ gap: spacing.md }}>
          <Text selectable accessibilityRole="alert" style={{ color: colors.danger }}>
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
            <View
              style={{
                overflow: 'hidden',
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                backgroundColor: colors.surface,
                boxShadow: '0 12px 32px rgba(21, 33, 28, 0.14)',
              }}
            >
              <Image
                source={
                  current.photoUrl ??
                  'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'
                }
                style={{ width: '100%', aspectRatio: 0.88, backgroundColor: colors.courtLight }}
                contentFit="cover"
                transition={180}
              />
              <View style={{ gap: spacing.sm, padding: spacing.lg }}>
                <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>
                  {current.firstName}, {current.age}
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 16 }}>
                  {current.city} · {current.distanceKm.toFixed(1)} km ·{' '}
                  {t(
                    {
                      beginner: 'onboarding.beginner',
                      intermediate: 'onboarding.intermediate',
                      advanced: 'onboarding.advanced',
                      competition: 'onboarding.competition',
                    }[current.level],
                  )}
                </Text>
                <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 23 }}>
                  {current.bio}
                </Text>
                {current.courtNames[0] ? (
                  <Text selectable style={{ color: colors.court, fontWeight: '600' }}>
                    {t('discover.playsAt', {
                      courts: current.courtNames.slice(0, 2).join(' · '),
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('discover.pass')}
                variant="secondary"
                onPress={() => animateDecision(false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('discover.like')} onPress={() => animateDecision(true)} />
            </View>
          </View>
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            {t('discover.emptyTitle')}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 24, textAlign: 'center' }}>
            {t('discover.empty')}
          </Text>
          <Link href="/filters" asChild>
            <Pressable>
              <Text style={{ color: colors.court, fontWeight: '700', textAlign: 'center' }}>
                {t('discover.widen')}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      {lastPassed ? (
        <Pressable accessibilityRole="button" onPress={undoPass}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>
            {t('discover.undo')}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
