<!-- Free RPC contract for Availability Broadcast closed beta. -->

# Free RPC contract

All stranger-visible Free data is returned only via `security definer` RPCs. Do not join `profiles` from the client for Free cards.

## Glossary

| EN | FR |
|----|----|
| Free | Je suis dispo |
| Interested | Ça m’intéresse |
| Accept | Accepter |
| We played | On a joué |

## RPCs

| RPC | Args | Returns | Notes |
|-----|------|---------|-------|
| `post_free_window` | `preset`, `starts_at_input`, `ends_at_input`, `area_label_input` | `free_windows` row | Paris presets: `today_am`, `today_pm`, `tomorrow_am`, `tomorrow_pm`. Use `custom` + timestamps (≤24h). Cancels previous active window in the same TX. Copies `court_preferences` into `court_names`. |
| `cancel_free_window` | — | void | Soft-cancel active window. |
| `get_my_free_window` | — | `{ window, inbound[] }` | Inbound list for Accept UI. |
| `list_free_nearby` | — | Free card rows | Nice soft gate (or `beta_invitees` if table non-empty). Distance ≤15 km. Never phone/coords. |
| `express_free_interest` | `window_id_input` | void | Viewer → poster. |
| `accept_free_interest` | `window_id_input`, `from_user_id_input` | `{ matched, match_id, other_first_name }` | Uses `ensure_active_match`, seeds chat, sets `match_sessions.source_window_id`. |
| `confirm_played` | `match_id_input` | session JSON + `just_played` | Participants only. `played_at` when both confirmed. |
| `get_match_session` | `match_id_input` | session JSON | For sticky We played UI. |
| `paris_free_preset_bounds` | `preset` | `starts_at`, `ends_at` | Server-side Europe/Paris. |
| `founder_mark_mediated` | `match_id_input` | void | **service_role only**. |

`ensure_active_match` is **not** granted to `authenticated` — swipe + Accept call it internally.

## RAISE style

Exceptions use `errcode = 'P0001'` with a short message and a `hint` (problem → cause → fix). Map `error.message` / `error.hint` in UI alerts.

## Soft gates

1. Default: viewer + poster `profiles.city` normalized to Nice (case-insensitive trim).
2. Contingency: if `beta_invitees` has any row, both sides must be invitees (city gate off).

## Analytics allowlist

`free_posted`, `interest_expressed`, `session_confirmed`, `played` (+ existing match/chat events).

## Related

- [User journey + Mermaid](./explanation-user-journey.md)
- [Architecture reference](./reference-architecture.md)
- [How to run closed beta](./howto-closed-beta.md)
