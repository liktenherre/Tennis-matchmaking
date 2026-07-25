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

## Deploy Configuration (configured by /setup-deploy)
- Platform: EAS + Supabase
- Production URL: none (native app / closed beta)
- Deploy workflow: manual CLI (not auto-deploy on push)
- Deploy status command: eas build:list --limit 1 --non-interactive
- Merge method: squash
- Project type: mobile app (Expo / React Native)
- Post-deploy health check: none (CLI status only; local .env is 127.0.0.1 Supabase)

### Custom deploy hooks
- Pre-merge: pnpm run lint && pnpm run typecheck && pnpm test
- Deploy trigger: eas build --profile preview --platform all (promote with eas build --profile production / eas submit when ready); Supabase: supabase db push + supabase functions deploy (manual)
- Deploy status: eas build:list --limit 1 --non-interactive
- Health check: none (no production HTTP URL yet)
