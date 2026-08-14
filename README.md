<!-- Explains how to configure, test, and release the Côte Tennis mobile app. -->

# Côte Tennis

Free iOS and Android matchmaking for adult tennis players around Côte d’Azur. Closed beta discovery is **Free windows** (who’s free nearby → Interested → Accept → chat → We played). Mutual swipe remains a fallback deck.

## Stack

- Expo SDK 57, React Native, TypeScript, and Expo Router
- Supabase Auth, Postgres/PostGIS, Storage, Realtime, and Edge Functions
- Vitest for domain rules, pgTAP for database security, and Maestro for device flows

## Documentation

| Doc | Quadrant | Description |
|-----|----------|-------------|
| [docs/tutorial-getting-started.md](docs/tutorial-getting-started.md) | Tutorial | Clone → local Free window |
| [docs/howto-local-development.md](docs/howto-local-development.md) | How-to | Day-to-day local setup and troubleshooting |
| [docs/howto-closed-beta.md](docs/howto-closed-beta.md) | How-to | Nice closed beta ops and played metric |
| [docs/howto-web-preview.md](docs/howto-web-preview.md) | How-to | Free personal web preview (GitHub Pages + Supabase Free) |
| [docs/reference-architecture.md](docs/reference-architecture.md) | Reference | Routes, tables, RPCs, env vars |
| [docs/explanation-user-journey.md](docs/explanation-user-journey.md) | Explanation | Why Free-first + Mermaid user flow |
| [docs/free-rpc-contract.md](docs/free-rpc-contract.md) | Reference | Free RPC args, gates, glossary |
| [docs/privacy-policy.md](docs/privacy-policy.md) | Legal | Privacy policy |

## Local setup

1. Install Node 22, Docker, the Supabase CLI, and Expo Go.
2. Run `pnpm install`.
3. Run `supabase start`, then `supabase db reset`.
4. Create `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the CLI.
5. Run `pnpm start` and open the project in Expo Go.

Walkthrough: [docs/tutorial-getting-started.md](docs/tutorial-getting-started.md).

SMS delivery requires a configured Supabase phone provider outside local development. Use a test phone/OTP pair configured in Supabase for Maestro, or the local developer sign-in on the sign-in screen.

For a **$0 public URL** you can open on your phone (web only, no store/SMS): [docs/howto-web-preview.md](docs/howto-web-preview.md).

## Closed beta ops (Free)

1. `supabase db reset` (applies Free migrations) then `supabase test db`.
2. Smoke RPCs as a Nice test user: `post_free_window` → `list_free_nearby` → `express_free_interest` / `accept_free_interest` → `confirm_played` (see [docs/free-rpc-contract.md](docs/free-rpc-contract.md)).
3. `eas build --profile preview --platform all` and install on invitees.
4. Fill [roster.csv](roster.csv) with ≥20–40 Nice intermediates; invite onto the preview build.
5. T0 checklist: ≥15 onboarded + ≥1 Free post in cohort; then run the 7-day stranger-played clock.

If soft Nice gate floods, insert rows into `beta_invitees` (service role) — list RPCs switch to invite-only.

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
- Maestro (local test OTP after `supabase db reset`):

  ```bash
  TEST_PHONE=+33699999999 TEST_OTP=123456 \
  MATCHED_TEST_PHONE=+33600000001 \
  FREE_POSTER_PHONE=+33600000001 FREE_INTEREST_PHONE=+33600000002 \
  pnpm run test:e2e
  ```

  Flows under `.maestro/` cover onboarding, Free post smoke, Free→Accept→We played, filters/chat, report, block, and account delete. Skip mutating seed data with `maestro test .maestro --exclude-tags destructive` when you are not resetting the DB.

Push notifications require a physical device. Still manually test denied location, denied notifications, offline recovery, empty Free board, and swipe fallback before each beta.

## Release

1. Verify French and English copy on small and large iPhones plus one Android device.
2. Confirm privacy and terms URLs are live.
3. Confirm database backups, abuse triage access, and Edge Function alerts.
4. Build the internal profile with `eas build --profile preview --platform all`.
5. Run a small invite-only Nice beta measuring stranger `played` (not match count).
6. Review Free empty-board rate, Accept latency, and played confirms without inspecting message content or precise locations.
7. Promote the tested build to production after the played bar.

## Product boundaries

No payment, subscriptions, court booking, leagues, public open feeds, or player ratings. Exact coordinates and phone numbers are never shown on Free cards. Week 1 Free has no push fan-out (in-app list + inbound badges only).
