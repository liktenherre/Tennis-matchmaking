# Tennis Matchmaking

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Cursor Cloud specific instructions

Côte Tennis is a single Expo/React Native mobile app backed by a local Supabase stack. Standard commands live in `package.json` scripts and `docs/howto-local-development.md`; the notes below cover only cloud-VM-specific caveats. The update script already runs `pnpm install`.

### Running the app in the cloud VM (no simulator/device)
- The primary target is native iOS/Android, but the cloud VM is headless — run the app on the **web target**: `pnpm exec expo start --web --port 8081`, then open `http://localhost:8081`. `react-native-web` is a dependency and this is the only viable way to run/QA the UI here.
- Sign in without SMS via the dev bypass: on the sign-in screen click **"Dev sign-in (new user)"** (only shown when `__DEV__`, i.e. `expo start`, not a production export). It creates a fresh `@cotetennis.local` user. You can navigate directly to `/sign-in` even with an existing session to create another fresh user.
- Onboarding step 4 requires selecting at least one availability chip before the finish button enables. City defaults to `Nice` (needed for the Free soft gate).

### Backend (Supabase) — requires Docker
- Docker is installed at the system level but `systemd` is not running, so start the daemon manually before using Supabase, e.g. in a tmux session: `sudo dockerd &` (the docker socket may need `sudo chmod 666 /var/run/docker.sock` for non-root access).
- The Supabase CLI is a devDependency — invoke it as `pnpm exec supabase ...` (no separate install). Bring the stack up with `pnpm exec supabase start`; this applies migrations and `supabase/seed.sql` automatically.
- Create a root `.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `pnpm exec supabase status`. Restart Expo after creating/changing `.env`.

### Testing caveats
- `pnpm exec supabase test db` (pgTAP) runs against the **current** DB state and does **not** reset first — run `pnpm exec supabase db reset` beforehand, and don't run it while the app has posted test data (Free windows/dev users) or row counts will mismatch.
- Pre-existing failures on `main` (not caused by your changes): `supabase test db` (pgTAP) fails, and `pnpm run typecheck` reports TS errors in `app/(tabs)/matches.tsx`, `app/(tabs)/free.tsx`, `app/chat/[matchId].tsx`, and `src/tw/`. `pnpm run lint` (warnings only) and `pnpm test` (vitest, 16 tests) pass.
