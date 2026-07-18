<!-- How-to: operate the Nice closed beta around Free windows and played. -->

# How to run the Nice closed beta

Ship an invite-only preview build, keep Free density alive, and measure **stranger played** — not match count.

## Prerequisites

- Linked Supabase project (EU region) and EAS project
- Ability to run `eas build`
- [roster.csv](../roster.csv) filled with ≥20–40 Nice intermediate players
- Local verification green: `pnpm test`, `supabase test db`

## Steps

1. Reset and test the Free migrations locally.

   ```bash
   supabase db reset
   supabase test db
   ```

2. Smoke the Free RPC chain as a Nice test user (SQL editor or authenticated client):

   `post_free_window` → `list_free_nearby` → `express_free_interest` / `accept_free_interest` → `confirm_played`

   Contract details: [free-rpc-contract.md](./free-rpc-contract.md).

3. Deploy Edge Functions and webhooks (production/staging).

   - Secrets: `DATABASE_WEBHOOK_SECRET`
   - Functions: `push-event`, `report-alert`, `profile-photos`
   - Webhooks: `matches` / `messages` → `push-event`; `reports` → `report-alert`
   - SMS provider, OTP rate limits, deep link `cotetennis://`
   - Set `EXPO_PUBLIC_EAS_PROJECT_ID` for the client build

4. Build the internal preview.

   ```bash
   eas build --profile preview --platform all
   ```

   Install on invitees from the EAS page.

5. Invite the Nice roster onto the preview build. T0 checklist: ≥15 onboarded and ≥1 Free post in the cohort, then run the 7-day stranger-played clock.

6. If the soft Nice gate floods with outsiders, insert rows into `beta_invitees` with the **service role**. When that table is non-empty, list RPCs switch to invite-only.

## Verification

- Free empty-board rate and Accept latency look healthy
- Dual **We played** confirms increment `played` analytics (no message content or precise locations in events)
- Cap founder-mediated hit ratio; if >50% by week 3, treat mediation as CRM, not product (`TODOS.md`)

Week 1 Free has **no push fan-out** — discovery is in-app list + inbound badges only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Non-Nice users on the board | Confirm city gate; or enable `beta_invitees` contingency |
| Accept fails with P0001 | Read `error.hint` — usually expired window, block, or self-interest |
| No push on match/message | Physical device + registered token + webhook → `push-event` |
| Metrics look “successful” but courts empty | Count `played` / `played_at`, not `match_created` |

## Related

- [User journey explanation](./explanation-user-journey.md)
- [Free RPC contract](./free-rpc-contract.md)
- [Architecture reference](./reference-architecture.md)
- Product boundaries and release checklist in [README.md](../README.md)
