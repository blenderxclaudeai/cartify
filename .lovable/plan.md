

## Plan: Fix Extension Login + Cart — Root Cause Analysis & Solution

### What's broken and why

**Problem 1: Login never completes (popup port closes)**

`AUTH_LOGIN` handler (line 362) calls `doOAuthLogin()` which returns a Promise that only resolves when `completeAuth()` fires (after the auth tab sends `CARTIFY_SESSION_FROM_WEB`). But opening the auth tab causes the popup to lose focus and close. When the popup closes, the message port dies — `sendResponse` silently fails. Even though auth succeeds in the background (tokens are stored), the popup never learns about it.

In `CartifyApp.tsx` line 288-294, `handleOAuth` awaits the response from `signInWithOAuth`. If the popup closes and reopens, `authLoading` resets to `false` and the user sees the login screen again, even though tokens may now be in storage. The storage listener at line 141 should catch this, but the timing is wrong — the popup wasn't open when the tokens were written.

**Problem 2: Getting "logged out" on page navigation**

Every page navigation triggers `evaluatePage()` → `AUTH_GET_USER` → `getAuthState()`. If the access token is expired, `getAuthState` calls `refreshToken()`. If refresh fails (rotated/dead token), our recent fix clears ALL auth data (line 96). This means **navigating to any page clears a valid-but-expired session**, creating a logout loop. The user logs in successfully, navigates to a product page, token is slightly expired, refresh fails (because Supabase already rotated the refresh token during a previous alarm), and boom — logged out.

The fix: `refreshToken()` should NOT clear auth on every failure. It should only clear if the server explicitly says the refresh token is invalid (e.g., 400/401). Network errors or timeouts should NOT clear auth — they should just return false and let the caller decide.

**Problem 3: Cart shows no feedback on failure**

The content script's `handleCartClick` (in `content/index.ts` line 120-132) checks `response?.ok` but has no else branch — when `ok` is false, the button just stays in loading state with no error toast.

### Changes

**`extension/src/background/index.ts`:**

1. **Make `AUTH_LOGIN` fire-and-forget**: Respond immediately with `{ ok: true, pending: true }`. Set a `cartify_auth_pending` flag in storage. `completeAuth` clears the flag. The popup uses `storage.onChanged` to detect auth completion (already wired up at line 136-158).

2. **Fix `refreshToken()` to not nuke auth on transient errors**: Only clear stored tokens if the server responds with 400/401 (invalid token). Don't clear on network errors, timeouts, or 5xx errors.

3. **Add `onStartup` alarm re-initialization**: Already present at line 589, but also ensure the refresh alarm is re-created in the alarm handler itself if it fires (belt and suspenders).

**`extension/src/shared/CartifyApp.tsx`:**

4. **Update `handleOAuth`**: Don't await the full response. After sending `AUTH_LOGIN`, just set `authLoading = true`. The storage listener already handles detecting when auth completes. On popup open, also check for `cartify_auth_pending` to show a "waiting for sign-in" state.

**`extension/src/content/index.ts`:**

5. **Add error feedback to `handleCartClick`**: When `response?.ok` is false, show an error toast ("Sign in to add to cart" or the server error message) and reset the button state.

### Files

| File | Change |
|------|--------|
| `extension/src/background/index.ts` | Fire-and-forget `AUTH_LOGIN`; fix `refreshToken` to only clear on explicit auth rejection; set `cartify_auth_pending` flag |
| `extension/src/shared/CartifyApp.tsx` | Don't block on `AUTH_LOGIN` response; check `cartify_auth_pending` on mount; show waiting state |
| `extension/src/content/index.ts` | Add error toast + button reset when cart add fails |

