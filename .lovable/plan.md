

## Plan: Fix Expired Token Handling

### Root Cause

The auth logs show repeated `"token is expired"` 403 errors. The extension stores the access token in `chrome.storage.local` and has a 45-minute refresh alarm, but **when the refresh fails or the alarm misses** (e.g. laptop sleep, service worker suspended), the extension keeps the stale expired token. 

This causes:
1. **"Sign in to use Virtual try-on"** — `getAuthState()` returns `loggedIn: true` (token exists but is expired), content script injects the "Try On" button, but `handleTryOn` sends the expired token to the edge function which rejects it. The error flows back as a generic failure.
2. **Cart not working** — `ensureSession()` uses the expired token, Supabase returns 403, session creation fails silently, `addSessionItem` gets no session ID and bails.

### Fix: Auto-refresh on auth failure

**`extension/src/background/index.ts`** — 3 changes:

1. **Add `fetchWithAutoRefresh` helper**: wraps any authenticated fetch — if response is 401/403, calls `refreshToken()` once and retries with the new token. This is the single fix that solves both try-on and cart failures.

2. **Update `getAuthHeaders()`**: before returning headers, check if token looks expired (decode JWT exp claim) and proactively refresh. This prevents the 403 round-trip entirely.

3. **Update `handleTryOn()`**: if response is 401/403 or error is `NOT_LOGGED_IN`, attempt `refreshToken()` and retry once before returning the error.

4. **Update `ensureSession()` and `addSessionItem()`**: use `fetchWithAutoRefresh` instead of raw `fetch` for all Supabase REST calls.

5. **Update `getAuthState()`**: validate token expiry before returning `loggedIn: true`. If expired, attempt refresh. Return `loggedIn: false` only if refresh also fails.

### Files

| File | Change |
|------|--------|
| `extension/src/background/index.ts` | Add `fetchWithAutoRefresh`, update `getAuthState` to validate token, update `handleTryOn`/`ensureSession`/`addSessionItem` to retry on 401/403 |

No DB changes needed. No UI changes needed — once the token refreshes correctly, everything works.

