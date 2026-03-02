/**
 * Content script that runs ONLY on the VTO web app domain.
 * After the user completes OAuth on the web app, this script
 * reads the Supabase session from localStorage and sends it
 * to the extension background for persistence.
 */

const SUPABASE_URL = "__SUPABASE_URL__"; // replaced at build time or hardcoded
const STORAGE_KEY_PREFIX = "sb-";

function getSupabaseSession() {
  // Supabase stores session under sb-<project-ref>-auth-token
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith("-auth-token")) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
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
      if (chrome.runtime.lastError) {
        // Extension context invalid — ignore
        return;
      }
      if (response?.ok) {
        // Session synced — show success message & optionally close tab
        showSyncBanner();
        setTimeout(() => window.close(), 1500);
      }
    }
  );
}

function showSyncBanner() {
  const banner = document.createElement("div");
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:999999;background:#000;color:#fff;text-align:center;padding:12px;font-family:system-ui;font-size:14px;";
  banner.textContent = "✓ Signed in to VTO extension — this tab will close shortly";
  document.body.appendChild(banner);
}

// Run immediately
trySendSession();

// Also watch for storage changes (in case OAuth completes after script loads)
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith(STORAGE_KEY_PREFIX) && e.key.endsWith("-auth-token")) {
    trySendSession();
  }
});

// Poll briefly in case the session appears via Supabase's onAuthStateChange
let attempts = 0;
const poll = setInterval(() => {
  attempts++;
  trySendSession();
  if (attempts > 20) clearInterval(poll); // stop after ~10s
}, 500);
