<!-- Reference: stack, routes, data model, and client/RPC surface for Côte Tennis. -->

# Architecture reference

Côte Tennis is an Expo Router mobile app backed by Supabase (Auth, Postgres/PostGIS, Storage, Realtime, Edge Functions). Closed beta discovery is **Free windows**; mutual swipe on **Deck** is the fallback.

## Stack

| Layer | Choice |
|-------|--------|
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript, Expo Router |
| UI | NativeWind 5 (Tailwind), custom fonts (Bebas Neue, Saira, Chakra Petch, Azeret Mono) |
| Backend | Supabase Auth (phone OTP + local email bypass), Postgres, PostGIS, Storage (`profile-photos`), Realtime |
| Domain tests | Vitest (`src/features/**/*.test.ts`) |
| DB tests | pgTAP under `supabase/tests/database/` |
| E2E | Maestro under `.maestro/` |
| Package manager | `pnpm@11.12.0` |

## App routes

Route protection lives in `app/_layout.tsx` via `Stack.Protected`:

| Guard | Screens |
|-------|---------|
| No session | `(auth)/sign-in`, `(auth)/verify` |
| Session, not onboarded | `(onboarding)/onboarding` |
| Session + onboarded | `(tabs)/*`, `chat/[matchId]`, `filters` |

`app/index.tsx` redirects: sign-in → onboarding → **`/free`**.

### Tabs (`app/(tabs)/`)

| Route | Role |
|-------|------|
| `free` | Default home: post window, nearby board, inbound Accept |
| `matches` | Active match list → chat |
| `discover` | Swipe deck fallback |
| `profile` | Profile, locale, delete account |

## Client modules

| Path | Responsibility |
|------|----------------|
| `src/features/free/free.ts` | Free presets, card helpers, window status (display only; ranking in SQL) |
| `src/features/free/free-service.ts` | Free + played RPCs |
| `src/features/matching/matching.ts` | Pure compatibility filter/score for deck |
| `src/features/matching/matching-service.ts` | `discover_profiles`, `record_swipe`, block/report |
| `src/features/matching/formats.ts` | Onboarding format chip exclusivity |
| `src/features/chat/chat-service.ts` | `list_my_matches`, messages CRUD |
| `src/providers/session-provider.tsx` | Auth session + `profiles.onboarding_completed_at` |
| `src/lib/supabase.ts` | Publishable-key client, AsyncStorage session |
| `src/lib/analytics.ts` | Allowlisted events; strips phone/coords/message keys |

## Environment variables

Client (Expo public):

| Variable | Used by |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase.ts` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | `app.config.ts` (push / EAS) |

Server / ops (not in Expo):

| Variable | Used by |
|----------|---------|
| `DATABASE_WEBHOOK_SECRET` | Edge Function webhook auth |
| Supabase service role | Founder SQL (`beta_invitees`, `founder_mark_mediated`) |

Never put the service-role key in Expo env vars.

## Data model (core tables)

Enums: `tennis_level`, `match_format`, `match_status`.

| Table | Purpose |
|-------|---------|
| `profiles` | Player identity; `onboarding_completed_at` gates app access |
| `locations` | City + approximate PostGIS point |
| `court_preferences` | Preferred court names |
| `availability_slots` | Recurring slots for deck ranking |
| `discovery_preferences` | Deck filters |
| `swipes` / `matches` / `messages` | Mutual-like path + chat |
| `blocks` / `reports` / `moderation_events` | Safety |
| `free_windows` | Time-bounded “I’m free” posts (≤24h) |
| `free_interests` | Viewer → poster interest |
| `match_sessions` | Dual confirm → `played_at`; optional `source_window_id` |
| `beta_invitees` | Contingency invite-only gate (service role) |
| `analytics_events` | Allowlisted product events |
| `push_tokens` | Device tokens |
| `match_reads` | Per-user last-read timestamps for unread badges |

Stranger-visible Free and discovery rows are returned via **`security definer` RPCs**, not client joins on `profiles`.

## RPC surface (authenticated unless noted)

### Free / played

See [free-rpc-contract.md](./free-rpc-contract.md) for full args and soft gates.

`post_free_window`, `cancel_free_window`, `get_my_free_window`, `list_free_nearby`, `express_free_interest`, `accept_free_interest`, `confirm_played`, `get_match_session`, `paris_free_preset_bounds`, `founder_mark_mediated` (**service_role only**).

`ensure_active_match` is internal (not granted to `authenticated`).

### Matchmaking / account

| RPC | Role |
|-----|------|
| `complete_onboarding(...)` | Writes profile, location, courts, prefs; sets `onboarding_completed_at` |
| `discover_profiles(...)` | Ranked deck candidates |
| `record_swipe(target_user_id, liked)` | Persist swipe; may create match |
| `list_my_matches()` | Match inbox rows (+ `unread_count`) |
| `mark_match_read(match_id_input)` | Clear unread badge for a conversation |
| `unmatch(match_id_input)` | End match |
| `delete_my_account()` | Account deletion |
| `register_push_token` / `revoke_push_token` | Push registration |

### Direct table access (RLS)

- `messages` — insert/select for match participants (rate-limited)
- `blocks` / `reports` — insert own rows
- `analytics_events` — insert allowlisted names

## Edge Functions

| Function | Trigger |
|----------|---------|
| `push-event` | DB webhooks on `matches` / `messages` |
| `report-alert` | DB webhook on `reports` |
| `profile-photos` | Photo-related server work |

## Analytics allowlist

`onboarding_completed`, `discovery_loaded`, `match_created`, `first_message_sent`, `user_blocked`, `user_reported`, `operation_failed`, `free_posted`, `interest_expressed`, `session_confirmed`, `played`.

Forbidden property keys: `message`, `phone`, `latitude`, `longitude`, `exact_location`.

## npm scripts

| Script | Command |
|--------|---------|
| Start | `pnpm start` |
| Lint / types / unit | `pnpm run lint`, `pnpm run typecheck`, `pnpm test` |
| DB | `pnpm run db:reset`, `pnpm run db:test` |
| E2E | `TEST_PHONE=+33699999999 TEST_OTP=123456 MATCHED_TEST_PHONE=+33600000001 FREE_POSTER_PHONE=+33600000001 FREE_INTEREST_PHONE=+33600000002 pnpm run test:e2e` |

## Related

- [User journey (explanation + Mermaid)](./explanation-user-journey.md)
- [Free RPC contract](./free-rpc-contract.md)
- [How to develop locally](./howto-local-development.md)
- [How to run closed beta](./howto-closed-beta.md)
- [Getting started tutorial](./tutorial-getting-started.md)
