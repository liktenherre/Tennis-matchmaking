/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'clip',
  name: 'clip',
  displayName: 'Côte Tennis',
  bundleIdentifier: '.clip',
  deploymentTarget: '17.0',
  // Native Swift Clip — do not embed the React Native JS bundle.
  exportJs: false,
  frameworks: ['SwiftUI', 'AppClip', 'StoreKit'],
  icon: 'https://github.com/expo.png',
  colors: {
    $accent: { color: '#C8F031', darkColor: '#C8F031' },
  },
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [
        'group.com.cotetennis.app',
      ],
    'com.apple.developer.associated-domains': [
      'applinks:app.cotetennis.com',
      'appclips:app.cotetennis.com',
    ],
  },
});
