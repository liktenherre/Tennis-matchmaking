// Injects EAS project id and optional GitHub Pages baseUrl into Expo config.
// Plain CommonJS so EAS/Expo never need to transpile TypeScript for app config.

const appJson = require('./app.json');

/** @param {{ config: Record<string, unknown> }} ctx */
module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...(config.extra ?? {}),
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
  experiments: {
    ...appJson.expo.experiments,
    ...(process.env.EXPO_PUBLIC_BASE_URL
      ? { baseUrl: process.env.EXPO_PUBLIC_BASE_URL }
      : {}),
  },
});
