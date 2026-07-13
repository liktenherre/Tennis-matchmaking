// Reanimated wrappers around CSS-enabled View.

import * as TW from './index';
import RNAnimated from 'react-native-reanimated';

export const Animated = {
  ...RNAnimated,
  View: RNAnimated.createAnimatedComponent(TW.View),
};
