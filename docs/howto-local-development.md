<!-- How-to: run Côte Tennis against local Supabase. -->

# How to develop locally

Run the Expo app against a local Supabase stack with seeded Nice players and Free windows.

## Prerequisites

- Node 22
- `pnpm` 11.12 (see `packageManager` in `package.json`)
- Docker
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Expo Go on a phone, or an iOS/Android simulator

## Steps

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Create a `.env` in the repo root with local Supabase values (after step 4 you will fill the URL and key):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key from supabase status>
   ```

   Optional for push: `EXPO_PUBLIC_EAS_PROJECT_ID=<eas-project-uuid>`.

3. Start Supabase and reset the database (migrations + `supabase/seed.sql`).

   ```bash
   supabase start
   supabase db reset
   ```

4. Copy the API URL and publishable (anon) key from the CLI output into `.env`.

5. Start Expo.

   ```bash
   pnpm start
   ```

   Open the project in Expo Go or a simulator.

6. Sign in.

   - **Local SMS:** configure a Supabase test phone/OTP pair, or
   - **Dev bypass:** on the sign-in screen use the developer email path (`dev@cotetennis.local` / `cote-tennis-dev`) — this avoids needing an SMS provider when GoTrue rejects OTP without a provider.

7. Complete onboarding (4 steps). You land on **Free**. Seeded Nice players may already show Free cards after `db reset`.

## Verification

```bash
pnpm run lint
pnpm run typecheck
pnpm test
supabase test db
```

Maestro (simulator/device + app build). After `db reset`, local `test_otp` numbers work:

```bash
TEST_PHONE=+33699999999 TEST_OTP=123456 \
MATCHED_TEST_PHONE=+33600000001 \
FREE_POSTER_PHONE=+33600000001 FREE_INTEREST_PHONE=+33600000002 \
pnpm run test:e2e
```

In the app: Free tab loads without error; posting a window refreshes your “your window” card; Deck still opens under Discover.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Supabase client hits placeholder URL | Set both `EXPO_PUBLIC_SUPABASE_*` vars and restart Expo |
| Phone OTP fails locally | Use the developer sign-in button, or configure `auth.sms.test_otp` **and** an SMS provider |
| Empty Free board | Soft gate requires Nice city; complete onboarding with city **Nice**, or check seed Free windows after `db reset` |
| Presets missing late evening | Expected — Paris slots that already ended are hidden (`availableFreePresets`) |
| pgTAP failures | Re-run `supabase db reset` then `supabase test db` |

## Related

- [Getting started tutorial](./tutorial-getting-started.md)
- [Architecture reference](./reference-architecture.md)
- [Free RPC contract](./free-rpc-contract.md)
