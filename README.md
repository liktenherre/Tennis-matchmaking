<!-- Explains how to configure, test, and release the Côte Tennis mobile app. -->

# Côte Tennis

Free iOS and Android matchmaking for adult tennis players around Côte d’Azur. Players verify a phone number, set their level, courts, availability, and preferences, then swipe to create mutual matches and chat.

## Stack

- Expo SDK 55, React Native, TypeScript, and Expo Router
- Supabase Auth, Postgres/PostGIS, Storage, Realtime, and Edge Functions
- Vitest for domain rules, pgTAP for database security, and Maestro for device flows

## Local setup

1. Install Node 22, Docker, the Supabase CLI, and Expo Go.
2. Copy `.env.example` to `.env`.
3. Run `pnpm install`.
4. Run `supabase start`, then `supabase db reset`.
5. Put the local Supabase URL and publishable key printed by the CLI into `.env`.
6. Run `pnpm start` and open the project in Expo Go.

SMS delivery requires a configured Supabase phone provider outside local development. Use a test phone/OTP pair configured in Supabase for Maestro.

## Backend setup

1. Create a Supabase project in an EU region.
2. Link the repository with `supabase link`.
3. Add `DATABASE_WEBHOOK_SECRET` to Edge Function secrets.
4. Deploy `push-event`, `report-alert`, and `profile-photos`.
5. Create signed database webhooks:
   - `matches` inserts/updates and `messages` inserts → `push-event`
   - `reports` inserts → `report-alert`
6. Configure an SMS provider, OTP rate limits, and the production deep link `cotetennis://`.
7. Set `EXPO_PUBLIC_EAS_PROJECT_ID` to the UUID from the linked EAS project.

All client access uses the publishable key. Never place the Supabase service-role key in Expo environment variables.

## Verification

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm test`
- `supabase db reset`
- `supabase test db`
- `TEST_PHONE=... TEST_OTP=... pnpm run test:e2e`

Push notifications require a physical device. Test denied location, denied notifications, offline recovery, empty discovery, duplicate swipes, block/report, and account deletion before each beta.

## Release

1. Verify French and English copy on small and large iPhones plus one Android device.
2. Confirm privacy and terms URLs are live.
3. Confirm database backups, abuse triage access, and Edge Function alerts.
4. Build the internal profile with `eas build --profile preview --platform all`.
5. Run a small invite-only Côte d’Azur beta.
6. Review onboarding completion, empty-deck rate, first-message conversion, and block/report rate without inspecting message content or precise locations.
7. Promote the tested build to production.

## Product boundaries

The MVP has no payment, subscriptions, court booking, leagues, public game posts, or player ratings. Exact coordinates and phone numbers are never shown to other players.
