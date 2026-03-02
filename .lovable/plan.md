

## Problem

The screenshot shows the **deployed** login page at `ddsasdkse.lovable.app/login` has email/password fields, "or" divider, and "Sign Up" link. But the **current code** in `Login.tsx` only has Google and Apple buttons — no email/password form at all.

This means the **published site is stale** — it hasn't been re-published since the Login page was updated. The code is correct; it just needs to be deployed.

Additionally, after completing Google OAuth, the session isn't being detected and the user stays on the login page. The auth logs confirm the Google login succeeds (HTTP 200), so the issue is on the client side — the OAuth return isn't being processed.

### Root cause of "nothing happens after login"

The `redirect_uri` is set to `window.location.origin` (i.e. `https://ddsasdkse.lovable.app`). After OAuth, the browser returns to `/` which immediately `<Navigate to="/profile" />`. The `ProtectedRoute` checks `user` — but the Supabase session hasn't been processed yet (race condition), so it bounces back to `/login` without the OAuth tokens in the URL anymore.

## Plan

### 1. Re-publish the app
The login page code is already correct (Google + Apple only). It just needs to be published so the deployed site matches.

### 2. Fix OAuth redirect to prevent race condition
In `Login.tsx`, change `redirect_uri` from `window.location.origin` to `window.location.origin + "/login"`. This ensures the OAuth return lands back on the login page, where `useAuth`'s `onAuthStateChange` can detect the new session and then the existing `if (user) return <Navigate to="/profile" />` kicks in properly.

```typescript
redirect_uri: window.location.origin + "/login",
```

That single change should fix both issues — the page just needs to be republished.

