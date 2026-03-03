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

function trySendSession() {
  const session = getSupabaseSession();
  if (!session?.access_token) return;

  const user = session.user;
  if (!user) return;

  chrome.runtime.sendMessage(
    {
      type: "VTO_SESSION_FROM_WEB",
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
      if (chrome.runtime.lastError) return;
      if (response?.ok) {
        // Session synced — the AuthCallback page handles the UI
        setTimeout(() => window.close(), 1500);
      }
    }
  );
}

// Run immediately
trySendSession();

// Watch for storage changes (in case OAuth completes after script loads)
window.addEventListener("storage", (e) => {
  if (e.key) {
    trySendSession();
  }
});

// Poll briefly in case the session appears via onAuthStateChange
let attempts = 0;
const poll = setInterval(() => {
  attempts++;
  trySendSession();
  if (attempts > 30) clearInterval(poll);
}, 500);
