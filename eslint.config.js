// Applies Expo's flat ESLint defaults to application and test source.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'coverage/**', '.expo/**', 'supabase/**'],
  },
  expoConfig,
  {
    rules: {
      // RN Animated.Value refs are read during render by design.
      'react-hooks/refs': 'off',
      // Data-fetch effects commonly call setState after async work.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
