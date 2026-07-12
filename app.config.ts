// Injects the environment-specific EAS project identifier into Expo configuration.

import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ...(appJson.expo as ExpoConfig),
  extra: {
    ...config.extra,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
});
