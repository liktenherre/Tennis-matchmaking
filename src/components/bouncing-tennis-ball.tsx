// Infinite bouncing tennis ball for the Free tab hero title.

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

const BOUNCE_UP_MS = 340;
const BOUNCE_DOWN_MS = 300;
const BOUNCE_HEIGHT = -16;

type Props = {
  size?: number;
};

export function BouncingTennisBall({ size = 34 }: Props) {
  const translateY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Loops a bounce + light squash/spin on the UI thread.
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(BOUNCE_HEIGHT, {
          duration: BOUNCE_UP_MS,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {
          duration: BOUNCE_DOWN_MS,
          easing: Easing.in(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    scaleY.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: BOUNCE_UP_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0.88, { duration: 70, easing: Easing.linear }),
        withTiming(1, {
          duration: BOUNCE_DOWN_MS - 70,
          easing: Easing.out(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    scaleX.value = withRepeat(
      withSequence(
        withTiming(0.96, { duration: BOUNCE_UP_MS, easing: Easing.out(Easing.quad) }),
        withTiming(1.1, { duration: 70, easing: Easing.linear }),
        withTiming(1, {
          duration: BOUNCE_DOWN_MS - 70,
          easing: Easing.out(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    rotate.value = withRepeat(
      withTiming(360, {
        duration: BOUNCE_UP_MS + BOUNCE_DOWN_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [rotate, scaleX, scaleY, translateY]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Shadow widens/fades in the air and tightens/darkens on contact.
  const shadowStyle = useAnimatedStyle(() => {
    const lift = interpolate(translateY.value, [BOUNCE_HEIGHT, 0], [0, 1]);
    return {
      opacity: interpolate(lift, [0, 1], [0.12, 0.28]),
      transform: [
        { scaleX: interpolate(lift, [0, 1], [1.45, 0.8]) },
        { scaleY: interpolate(lift, [0, 1], [1.15, 0.65]) },
      ],
    };
  });

  const shadowWidth = size * 0.72;
  const shadowHeight = size * 0.2;

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={{ width: size, height: size + shadowHeight, alignItems: 'center' }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: shadowHeight * 0.35,
            width: size,
            height: size,
          },
          ballStyle,
        ]}
      >
        <Ionicons name="tennisball" size={size} color={colors.lime} />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            width: shadowWidth,
            height: shadowHeight,
            borderRadius: 999,
            backgroundColor: colors.ink,
          },
          shadowStyle,
        ]}
      />
    </View>
  );
}
