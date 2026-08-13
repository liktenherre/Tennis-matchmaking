// CSS-enabled React Native primitives for NativeWind className support.

import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from 'react-native-css';
import { Link as RouterLink } from 'expo-router';
import Animated from 'react-native-reanimated';
import React from 'react';
import {
  ActivityIndicator as RNActivityIndicator,
  FlatList as RNFlatList,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Switch as RNSwitch,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableHighlight as RNTouchableHighlight,
  View as RNView,
  StyleSheet,
} from 'react-native';
import type { ColorValue, FlatListProps, ViewStyle } from 'react-native';

export { Image } from './image';

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
): React.ReactElement => {
  return useCssBox(RouterLink, props, { className: 'style' });
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS !== 'web'
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

// react-native-css infers a huge generic union from each wrapped component's
// prop type, which trips TS2589/TS2590 ("too deep"/"too complex") for larger
// components. Routing every wrapper through this single boundary erases that
// inference (component typed as ComponentType<any>) without changing runtime.
function useCssBox(
  component: React.ComponentType<any>,
  props: Record<string, any> | null | undefined,
  mapping: Record<string, unknown>,
): React.ReactElement {
  return useCssElement(component, props, mapping as never);
}

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps): React.ReactElement => {
  return useCssBox(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string },
): React.ReactElement => {
  return useCssBox(RNText, props, { className: 'style' });
};
Text.displayName = 'CSS(Text)';

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
): React.ReactElement => {
  return useCssBox(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
ScrollView.displayName = 'CSS(ScrollView)';

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
): React.ReactElement => {
  return useCssBox(RNPressable, props, { className: 'style' });
};
Pressable.displayName = 'CSS(Pressable)';

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
): React.ReactElement => {
  return useCssBox(RNTextInput, props, { className: 'style' });
};
TextInput.displayName = 'CSS(TextInput)';

export const FlatList = <ItemT,>(
  props: FlatListProps<ItemT> & {
    className?: string;
    contentContainerClassName?: string;
  },
): React.ReactElement => {
  return useCssBox(RNFlatList, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
FlatList.displayName = 'CSS(FlatList)';

export const ActivityIndicator = (
  props: React.ComponentProps<typeof RNActivityIndicator> & {
    className?: string;
  },
): React.ReactElement => {
  return useCssBox(RNActivityIndicator, props, {
    className: {
      target: 'style',
      nativeStyleMapping: { color: 'color' },
    },
  });
};
ActivityIndicator.displayName = 'CSS(ActivityIndicator)';

export const Switch = (
  props: React.ComponentProps<typeof RNSwitch> & { className?: string },
): React.ReactElement => {
  return useCssBox(RNSwitch, props, { className: 'style' });
};
Switch.displayName = 'CSS(Switch)';

export const KeyboardAvoidingView = (
  props: React.ComponentProps<typeof RNKeyboardAvoidingView> & {
    className?: string;
  },
): React.ReactElement => {
  return useCssBox(RNKeyboardAvoidingView, props, { className: 'style' });
};
KeyboardAvoidingView.displayName = 'CSS(KeyboardAvoidingView)';

export const AnimatedScrollView = (
  props: React.ComponentProps<typeof Animated.ScrollView> & {
    className?: string;
    contentClassName?: string;
    contentContainerClassName?: string;
  },
): React.ReactElement => {
  return useCssBox(Animated.ScrollView, props, {
    className: 'style',
    contentClassName: 'contentContainerStyle',
    contentContainerClassName: 'contentContainerStyle',
  });
};

function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>,
) {
  const { underlayColor, ...style } = (StyleSheet.flatten(props.style) ||
    {}) as ViewStyle & { underlayColor?: ColorValue };
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight>,
): React.ReactElement => {
  return useCssBox(XXTouchableHighlight, props, { className: 'style' });
};
TouchableHighlight.displayName = 'CSS(TouchableHighlight)';
