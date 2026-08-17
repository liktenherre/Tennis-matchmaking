<!-- How to ship the Free-window App Clip and WhatsApp invite links. -->

# App Clip + WhatsApp Free invites

Native Swift App Clip at `targets/clip/` opens `https://app.cotetennis.com/f/{windowId}` for quick OTP → short onboarding → Express Interest.

## Prerequisites

1. Register `cotetennis.com` and point `app.cotetennis.com` at the Cloudflare Pages project that serves [`web-invite/public`](../web-invite/public).
2. Replace `APPLE_TEAM_ID` in both AASA files under `web-invite/public/`.
3. After the App Store listing exists, replace `APP_STORE_ID` in `web-invite/public/f.html`.
4. Apple Developer team membership with App Clip capability.

## Local / EAS build

```sh
pnpm clip:sync-env          # writes Supabase URL + anon key into targets/clip/Info.plist
pnpm prebuild:ios           # sync-env + expo prebuild -p ios --clean
# Xcode: select the `clip` scheme
# Scheme → Run → Arguments → Environment Variables:
#   _XCAppClipURL = https://app.cotetennis.com/f/<active-window-uuid>
```

EAS runs `eas-build-post-install` → `clip:sync-env` automatically. Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set as EAS secrets/env for the profile.

## App Store Connect

1. Open the iOS app → **App Clip**.
2. Create a **default** experience (header image, subtitle, action: « Voir la dispo »).
3. Add an **advanced** experience:
   - URL: `https://app.cotetennis.com/f`
   - Allow path matching for `/f/*`
4. Submit with a build that includes the `com.cotetennis.app.clip` target.
5. Local device testing without ASC: Settings → Developer → Local Experiences → register the same URL prefix + Clip bundle id.

## WhatsApp validation checklist

- [ ] Landing `https://app.cotetennis.com/f/<uuid>` loads in Safari
- [ ] AASA returns `Content-Type: application/json` (no redirect)
- [ ] Tapping the link on iOS shows the App Clip card (or opens the full app if installed)
- [ ] Clip: card → SMS OTP → short onboarding → interest success → App Store overlay
- [ ] Installing/opening the full app imports the Clip session (App Group) and can open `/f/{windowId}`
- [ ] Poster Share on Free tab produces the same HTTPS URL

## Size / scope

Clip is native Swift (`exportJs: false`). Keep chat, Accept, Discover, and full onboarding out of the Clip.
