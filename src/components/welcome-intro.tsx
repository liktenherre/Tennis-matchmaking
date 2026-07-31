// Broadcast Scoreboard animated tennis intro shown before sign-in.

import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { BouncingTennisBall } from '@/components/bouncing-tennis-ball';
import { Button, DisplayTitle, Eyebrow } from '@/components/ui';
import { colors } from '@/theme';
import { Text, View } from '@/tw';

const INTRO_MS = 3200;

type Props = {
  onContinue: () => void;
};

export function WelcomeIntro({ onContinue }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pulse = useSharedValue(1);
  const scan = useSharedValue(0);
  const courtReveal = useSharedValue(0);
  const scoreTick = useSharedValue(0);

  const courtWidth = Math.min(width - 64, 320);
  const courtHeight = Math.min(height * 0.34, 280);

  // Entrance loops: LIVE pulse, scoreboard scan, court lines, score flip.
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    scan.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );

    courtReveal.value = withDelay(
      200,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );

    scoreTick.value = withDelay(
      600,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
        withDelay(500, withTiming(2, { duration: 450, easing: Easing.out(Easing.quad) })),
      ),
    );
  }, [courtReveal, pulse, scan, scoreTick]);

  // Soft auto-advance so cold launch still feels intentional without trapping.
  useEffect(() => {
    const timer = setTimeout(onContinue, INTRO_MS);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const liveStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-40, height]) }],
    opacity: interpolate(scan.value, [0, 0.12, 0.88, 1], [0, 0.14, 0.14, 0]),
  }));

  const baselineStyle = useAnimatedStyle(() => ({
    width: interpolate(courtReveal.value, [0, 1], [0, courtWidth]),
    opacity: courtReveal.value,
  }));

  const netStyle = useAnimatedStyle(() => ({
    height: interpolate(courtReveal.value, [0, 1], [0, courtHeight]),
    opacity: courtReveal.value,
  }));

  const scoreLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scoreTick.value, [0, 1, 1.2], [0.25, 1, 1]),
    transform: [{ translateY: interpolate(scoreTick.value, [0, 1], [12, 0]) }],
  }));

  const scoreRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scoreTick.value, [0, 1, 2], [0.25, 0.25, 1]),
    transform: [{ translateY: interpolate(scoreTick.value, [1, 2], [12, 0]) }],
  }));

  return (
    <View
      className="flex-1 bg-ink"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
        <Animated.View style={[styles.scan, scanStyle]} />
        <View style={[styles.courtWrap, { width: courtWidth, height: courtHeight }]}>
          <View style={[styles.courtBorder, { width: courtWidth, height: courtHeight }]} />
          <Animated.View style={[styles.baseline, baselineStyle]} />
          <Animated.View style={[styles.net, netStyle]} />
        </View>
      </View>

      <View className="flex-1 justify-between px-6">
        <Animated.View entering={FadeIn.duration(500)} style={styles.topRow}>
          <Animated.View style={[styles.liveBadge, liveStyle]}>
            <Text className="font-mono text-[11px] text-ink">LIVE</Text>
          </Animated.View>
          <Eyebrow tone="lime">{t('welcome.eyebrow')}</Eyebrow>
        </Animated.View>

        <View className="items-center gap-6">
          <Animated.View entering={FadeInDown.delay(180).duration(650)} style={styles.hero}>
            <BouncingTennisBall size={72} />
            <Text className="font-mono text-[12px] uppercase tracking-[0.18em] text-lime">
              Côte Tennis
            </Text>
            <DisplayTitle className="text-center text-[64px] text-canvas">
              {t('welcome.title')}
            </DisplayTitle>
            <Text className="max-w-[300px] text-center font-sans text-[17px] leading-6 text-muted">
              {t('welcome.subtitle')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(450).duration(500)} style={styles.scoreboard}>
            <View className="items-center gap-1">
              <Text className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {t('welcome.games')}
              </Text>
              <Animated.Text style={[styles.scoreDigit, { color: colors.lime }, scoreLeftStyle]}>
                0
              </Animated.Text>
            </View>
            <Text className="mb-2 font-mono text-[14px] text-muted">—</Text>
            <View className="items-center gap-1">
              <Text className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {t('welcome.set')}
              </Text>
              <Animated.Text style={[styles.scoreDigit, { color: colors.canvas }, scoreRightStyle]}>
                0
              </Animated.Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.footer}>
          <Button label={t('welcome.cta')} variant="lime" onPress={onContinue} />
          <Text className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {t('welcome.hint')}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: colors.lime,
  },
  courtWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtBorder: {
    borderWidth: 1,
    borderColor: 'rgba(180, 206, 56, 0.25)',
  },
  baseline: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.lime,
  },
  net: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.lime,
    opacity: 0.55,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    borderRadius: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  scoreboard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 24,
    borderWidth: 1,
    borderColor: 'rgba(180, 206, 56, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  scoreDigit: {
    fontFamily: 'ChakraPetch_700Bold',
    fontSize: 48,
    lineHeight: 52,
  },
  footer: {
    gap: 12,
  },
});
