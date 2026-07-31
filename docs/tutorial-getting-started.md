<!-- Tutorial: from clone to a working Free window on local Supabase. -->

# Get Côte Tennis running and post your first Free window

You will run the app against local Supabase, sign in, finish onboarding, and post a Free window so it appears on the nearby board. By the end you will understand the default player path: Free → Interested → Accept → chat → We played.

## What you'll need

- Node 22, Docker, Supabase CLI, `pnpm`
- Expo Go or a simulator
- About 15 minutes

For a checklist-style setup, see [How to develop locally](./howto-local-development.md).

## Step 1: Install and start the backend

```bash
pnpm install
supabase start
supabase db reset
```

`db reset` applies matchmaking + Free migrations and loads seeded Nice players (including sample Free windows).

Copy the API URL and publishable key from the CLI into a root `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

## Step 2: Launch the app

```bash
pnpm start
```

Open in Expo Go. You should see the animated Broadcast Scoreboard intro, then the sign-in screen.

## Step 3: Sign in and land on Free

Use the **developer sign-in** on the sign-in screen (local email bypass), or a configured test phone/OTP.

Complete the 4 onboarding steps (profile → tennis → city/location → preferences). Pick city **Nice** so the Free soft gate includes you.

You are redirected to **`/free`** — the default home after onboarding.

**You should see:** the Free tab (“who’s free nearby”), possibly seeded cards from Camille and others.

## Step 4: Post a Free window

1. Choose an open Paris preset (for example Tomorrow AM).
2. Optionally set an area label (e.g. `Magnan`).
3. Tap post.

**You should see:** your active window card with the time range and a cancel action. Nearby players with city Nice and distance ≤15 km can list you via `list_free_nearby`.

## What you built

A local Côte Tennis loop: auth → onboarding → Free post. Next steps:

- Tap **Interested** on a seeded card, then Accept from a second account (or SQL) to open chat
- Confirm **We played** from both sides to set `played_at`
- Skim the [user journey Mermaid chart](./explanation-user-journey.md)
- Read the [Free RPC contract](./free-rpc-contract.md) before changing SQL

## Related

- [Architecture reference](./reference-architecture.md)
- [How to run closed beta](./howto-closed-beta.md)
