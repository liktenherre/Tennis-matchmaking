// Injects the environment-specific EAS project identifier into Expo configuration.
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
});
