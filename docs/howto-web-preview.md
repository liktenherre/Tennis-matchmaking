<!-- How-to: publish a $0 personal web preview on GitHub Pages + Supabase Free. -->

# How to publish a personal web preview

Host the Expo **web** export for your own testing. No Apple, Google, EAS, or SMS bill. This is not the Côte Tennis product (no push, no store listing).

**Cost:** $0. **URL after first deploy:** `https://liktenherre.github.io/Tennis-matchmaking/`

## What you use

| Piece | Free option | Caveat |
|---|---|---|
| App | GitHub Pages | SPA only; enable Pages → GitHub Actions once |
| Backend | [Supabase Free](https://supabase.com/pricing) | Pauses after ~7 days idle (resume in the dashboard). 500 MB DB. |
| Sign-in | Dev email button (`@cotetennis.local`) | Phone OTP needs a paid SMS provider — skip it here |

Anyone who has the URL can create test users. Treat it as an unlisted sandbox, not a public launch.

## 1. Create a free Supabase project

1. Create a project at [supabase.com](https://supabase.com) (EU region).
2. In **Authentication → Providers → Email**: enable email signups and **turn Confirm email off** (`.local` addresses cannot receive mail).
3. From this repo, link and push schema (not `seed.sql`):

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push
   ```

4. Copy **Project URL** and **anon / publishable key** from **Project Settings → API**.

## 2. Point GitHub Actions at that project

Repo **Settings → Secrets and variables → Actions**, add:

- `EXPO_PUBLIC_SUPABASE_URL` — `https://<project-ref>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the anon/publishable key

Then **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## 3. Deploy

Push to `main`, or run **Actions → Web preview → Run workflow**.

The workflow bakes `EXPO_PUBLIC_ENABLE_DEV_AUTH=true` into the static bundle so the sign-in screen shows **Dev sign-in (new user)** even though this is not a Metro `__DEV__` session.

## 4. Use it

1. Open the Pages URL (allow a minute after the workflow finishes).
2. Click **Dev sign-in (new user)** and finish onboarding with city **Nice**.
3. Location is optional; city Nice is enough for the Free soft gate.
4. The Free board is empty until a second account posts a window (incognito / another browser).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Workflow fails on “Require hosted Supabase secrets” | Add the two Actions secrets, then re-run |
| Pages 404 on `/Tennis-matchmaking/` | Wait for the first successful `Web preview` run; confirm Pages source is GitHub Actions |
| Sign-up error about confirming email | Disable **Confirm email** on the hosted project |
| Phone OTP fails | Expected — use Dev sign-in |
| Blank screen / missing JS | Confirm `.nojekyll` is in the artifact (the workflow adds it so `_expo/` is not stripped) |
| Project paused | Open the Supabase dashboard and restore; Free sleeps after a week idle |
| Empty Free board | Create a second user and post a window, or run `supabase/seed.sql` in the SQL editor if you want local-style sample cards |

## Cloudflare Pages instead

If the GitHub repo is **private**, GitHub Free does not serve Pages. [Cloudflare Pages](https://pages.cloudflare.com) is also $0 and works with private repos:

- Build command: `pnpm install && pnpm run export:web && cp dist/index.html dist/404.html`
- Output directory: `dist`
- Env vars: the same `EXPO_PUBLIC_*` values, plus `EXPO_PUBLIC_ENABLE_DEV_AUTH=true`
- Omit `EXPO_PUBLIC_BASE_URL` (site is at the domain root)

## Related

- [Local development](./howto-local-development.md)
- [Closed beta (native / EAS)](./howto-closed-beta.md)
- [Architecture / env vars](./reference-architecture.md)
