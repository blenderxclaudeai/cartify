/**
 * Content script that runs ONLY on the Cartify web app domain.
 * After the user completes OAuth on the web app, this script
 * reads the Supabase session from localStorage and sends it
 * to the extension background for persistence.
 */

function getSupabaseSession() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const isAuthKey =
      (key.startsWith("sb-") && key.endsWith("-auth-token")) ||
      key.includes("supabase") && key.includes("auth");

    if (isAuthKey) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return parsed;
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return null;
}

let sessionSent = false;

function clearSupabaseSession() {
  // Remove the Supabase auth key from localStorage so the web app's
  // autoRefreshToken doesn't rotate the refresh token and invalidate
  // the copy the extension just received.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      (key.startsWith("sb-") && key.endsWith("-auth-token")) ||
      (key.includes("supabase") && key.includes("auth"))
    ) {
      localStorage.removeItem(key);
    }
  }
}

function trySendSession() {
  if (sessionSent) return;

  const session = getSupabaseSession();
  if (!session?.access_token) return;

  const user = session.user;
  if (!user) return;

  // Mark sent immediately to prevent duplicate sends from polling/events
  sessionSent = true;

  chrome.runtime.sendMessage(
    {
      type: "CARTIFY_SESSION_FROM_WEB",
      payload: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email,
          avatar_url: user.user_metadata?.avatar_url,
        },
      },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        // Reset so we can retry
        sessionSent = false;
        return;
      }
      if (response?.ok) {
        // Stop polling
        clearInterval(poll);
        // Clear the web app's copy of the session so its autoRefreshToken
        // doesn't rotate the refresh token and invalidate the extension's copy
        clearSupabaseSession();
        setTimeout(() => window.close(), 1000);
      } else {
        sessionSent = false;
      }
    }
  );
}

// Run immediately
trySendSession();

// Watch for storage changes
window.addEventListener("storage", (e) => {
  if (e.key && !sessionSent) trySendSession();
});

// Poll briefly — stop after success or 15s
let attempts = 0;
const poll = setInterval(() => {
  attempts++;
  trySendSession();
  if (attempts > 30) clearInterval(poll);
}, 500);
