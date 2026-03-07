

## Root Cause Analysis

The extension instability stems from **one critical bug** that cascades into every symptom you're seeing, plus two secondary issues:

### Primary Bug: Token Refresh Race Condition

`refreshToken()` has no concurrency guard. Every action (cart click, try-on, page navigation, coupon check) triggers API calls that independently detect an expired token and call `refreshToken()` simultaneously. Supabase **rotates** the refresh token on each use — the first call succeeds and stores a new token, the second call uses the now-invalid old token, gets a 400, and **wipes all auth data** (lines 96-98). This single bug causes:

- Logged out when clicking "Add to Cart" (cart triggers `getAuthHeaders()` + `ensureSession()` + `fetchWithAutoRefresh()` — up to 3 concurrent refreshes)
- Logged out when navigating pages (`evaluatePage()` → `AUTH_GET_USER` → `getAuthState()` triggers refresh, while the coupon check on line 286 also fires)
- Try-on says "Please log in" (same race — auth wiped mid-request)
- Login resets (popup detects cleared `cartify_auth_token` via storage listener)

### Secondary Issue: Coupon Check Triggers Unnecessary Auth

The content script fires `CARTIFY_CHECK_COUPONS` on **every page load** (line 286). This calls `getAuthHeaders()` which may trigger a token refresh — adding another concurrent refresh call to the race. Coupons are public data (`is_active = true` policy allows any authenticated user) but the check still requires auth headers.

### Tertiary Issue: Redirect Allowlist Empty

`ALLOWED_REDIRECT_DOMAINS` is an empty array (line 10 of redirect function). The function fails closed — all redirects return 403. This breaks any affiliate/cart redirect flow.

### What the Cleanup System Does (and Doesn't Do)

The `cleanup-daily` edge function only calls two DB functions: `cleanup_expired_sessions` (deletes expired `shopping_sessions` rows) and `cleanup_old_tryons` (deletes `tryon_requests` older than 24h). These are **server-side DB operations** and do NOT touch `chrome.storage.local`. The cleanup system is **not** directly causing logouts. The timing correlation is coincidental — the coupon feature added with it introduced the extra concurrent `getAuthHeaders()` call that exacerbated the race condition.

---

## Fix Plan

### 1. Add Refresh Token Deduplication Lock (fixes ALL logout issues)

**File: `extension/src/background/index.ts`**

Rename current `refreshToken()` to `doRefreshToken()`. Create a new `refreshToken()` wrapper with a module-level promise lock:

```ts
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefreshToken();
  try { return await refreshPromise; }
  finally { refreshPromise = null; }
}
```

This ensures all concurrent callers wait for the same refresh operation instead of firing parallel rotations. One change, fixes every logout symptom.

### 2. Make Coupon Check Non-Auth-Dependent

**File: `extension/src/content/index.ts`**

Move the coupon check to fire **after** `evaluatePage()` completes (inside the auth callback), not independently on page load. This eliminates one source of concurrent refresh calls and prevents coupon checks from racing with auth state checks.

### 3. Configure Redirect Allowlist

**File: `supabase/functions/redirect/index.ts`**

The empty `ALLOWED_REDIRECT_DOMAINS` array blocks all redirects. Two options:
- Add common retailer domains to the hardcoded list, OR
- Set the `ALLOWED_REDIRECT_DOMAINS` environment secret with comma-separated domains

Since merchant domains vary, the best approach is to **remove the fail-closed empty check** and instead use a permissive default that still validates protocol (http/https only). Or populate the env variable with initial domains.

### 4. Minor Stability Improvements

**File: `extension/src/background/index.ts`**

- In `onInstalled`, also clear stale `cartify_auth_pending` flag (prevents stuck loading state after extension update)
- In the alarm handler for `TOKEN_REFRESH_ALARM`, the refresh already uses the deduplication lock from fix #1, so no additional change needed

### Summary of Files

| File | Change |
|------|--------|
| `extension/src/background/index.ts` | Add `refreshPromise` deduplication lock around `refreshToken()`; clear `cartify_auth_pending` in `onInstalled` |
| `extension/src/content/index.ts` | Move coupon check inside `evaluatePage()` auth callback instead of firing independently |
| `supabase/functions/redirect/index.ts` | Configure or remove the empty domain allowlist so redirects work |

No database changes needed. No changes to `CartifyApp.tsx`, `webAppSync.ts`, or `auth.ts` — those are fine as-is.

