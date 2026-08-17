<!-- Static invite host for App Clip / Universal Links on app.cotetennis.com. -->

# web-invite (`app.cotetennis.com`)

Static Cloudflare Pages site that serves:

- `/.well-known/apple-app-site-association` (and root copy)
- `/f/:windowId` landing page with App Clip meta tags

## One-time setup

1. Register domain `cotetennis.com` and create DNS for `app.cotetennis.com`.
2. Replace `APPLE_TEAM_ID` in both AASA files with your Apple Team ID (10 characters).
3. After App Store Connect creates the app listing, replace `APP_STORE_ID` in `public/f.html`.
4. Deploy `public/` to Cloudflare Pages; point custom domain `app.cotetennis.com` at the project.
5. Verify:
   - `curl -I https://app.cotetennis.com/.well-known/apple-app-site-association` → `Content-Type: application/json`
   - `curl https://app.cotetennis.com/f/<uuid>` returns the landing HTML

## Deploy

```sh
# From repo root — example with Wrangler
npx wrangler pages deploy web-invite/public --project-name=cote-tennis-invite
```

Or connect this folder’s `public/` directory as the Pages build output (no build step).
