/**
 * Extension auth — uses chrome.identity.launchWebAuthFlow
 * for a fully in-extension OAuth experience (no external tabs).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export async function signInWithOAuth(
  provider: "google" | "apple"
): Promise<{ ok: boolean; error?: string }> {
  const redirectUrl = chrome.identity.getRedirectURL();

  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}` +
    `&redirect_to=${encodeURIComponent(redirectUrl)}`;

  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError?.message || "Auth cancelled",
          });
          return;
        }

        try {
          const hashFragment = callbackUrl.split("#")[1];
          if (!hashFragment) {
            resolve({ ok: false, error: "No tokens in callback URL" });
            return;
          }

          const params = new URLSearchParams(hashFragment);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (!access_token) {
            resolve({ ok: false, error: "No access token received" });
            return;
          }

          const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${access_token}`,
            },
          });

          if (!userRes.ok) {
            resolve({ ok: false, error: "Failed to fetch user info" });
            return;
          }

          const userData = await userRes.json();

          const user = {
            id: userData.id,
            email: userData.email,
            name:
              userData.user_metadata?.full_name ||
              userData.user_metadata?.name ||
              userData.email,
            avatar_url: userData.user_metadata?.avatar_url,
          };

          await chrome.storage.local.set({
            cartify_auth_token: access_token,
            cartify_refresh_token: refresh_token,
            cartify_user: user,
          });

          resolve({ ok: true });
        } catch (e: any) {
          resolve({ ok: false, error: e.message || "Auth failed" });
        }
      }
    );
  });
}

export async function getStoredUser(): Promise<{
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
} | null> {
  try {
    const result = await chrome.storage.local.get("cartify_user");
    return result.cartify_user || null;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get("cartify_auth_token");
    return !!result.cartify_auth_token;
  } catch {
    return false;
  }
}

export async function signOut() {
  await chrome.storage.local.remove([
    "cartify_auth_token",
    "cartify_refresh_token",
    "cartify_user",
    "cartify_last_result",
  ]);
}
