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
      projectId: '98bea5d7-e35d-491b-aac2-e08c5d026ce6',
    },
  },
  experiments: {
    ...appJson.expo.experiments,
    ...(process.env.EXPO_PUBLIC_BASE_URL
      ? { baseUrl: process.env.EXPO_PUBLIC_BASE_URL }
      : {}),
  },
});
