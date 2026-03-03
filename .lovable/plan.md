

## In-Extension Auth via `chrome.identity.launchWebAuthFlow`

### What changes

**`extension/src/lib/auth.ts`** — Replace `chrome.tabs.create` with `chrome.identity.launchWebAuthFlow`:
- Build the Supabase OAuth URL manually (using the project's Supabase URL + Google provider)
- Set `redirectTo` to `chrome.identity.getRedirectURL()`
- Call `launchWebAuthFlow({ url, interactive: true })`
- Parse the access_token, refresh_token from the callback URL hash fragment
- Store tokens + user info in `chrome.storage.local`

**`extension/src/popup/Popup.tsx`** (or wherever the login buttons live) — Update the sign-in handler to `await` the new auth function. On success, immediately show logged-in state. Remove the "Completing sign-in…" intermediate state.

**`extension/manifest.json`** — Already has `identity` permission. Optionally remove the `webAppSync.js` content script entry (keep as fallback if desired).

**`extension/src/content/webAppSync.ts`** — Can be kept as a fallback for edge cases but is no longer the primary auth path.

### Key implementation detail

```text
Extension Popup
  → chrome.identity.launchWebAuthFlow(supabaseOAuthUrl)
  → Chrome auth popup (Google sign-in)
  → Redirects to https://<ext-id>.chromiumapp.org/#access_token=...
  → Extension parses tokens from URL
  → Stores in chrome.storage.local
  → Popup shows logged-in state
```

The Supabase OAuth URL is constructed as:
```
{SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to={chrome.identity.getRedirectURL()}
```

No web app involvement. No external tabs. Fully self-contained.

### Files to change
1. `extension/src/lib/auth.ts` — Core auth rewrite
2. `extension/src/popup/Popup.tsx` — Update login flow UX
3. `extension/manifest.json` — Optional cleanup of webAppSync content script

