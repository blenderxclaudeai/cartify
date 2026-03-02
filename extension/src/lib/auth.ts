/**
 * Extension auth — opens the web app login page in a new tab.
 * A content script on the web app domain detects the session and
 * sends it back to the extension background, which persists it.
 */

const APP_URL = "https://ddsasdkse.lovable.app";

export async function signInWithOAuth(_provider: "google" | "apple") {
  // Open the web app login page — OAuth happens there with managed credentials
  chrome.tabs.create({ url: `${APP_URL}/login`, active: true });
  // The popup shows a "Completing sign-in…" state.
  // The web-app content script will detect the session and message the background.
  // Background persists to chrome.storage.local → popup detects via onChanged.
}

export async function getStoredUser(): Promise<{
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
} | null> {
  try {
    const result = await chrome.storage.local.get("vto_user");
    return result.vto_user || null;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get("vto_auth_token");
    return !!result.vto_auth_token;
  } catch {
    return false;
  }
}

export async function signOut() {
  await chrome.storage.local.remove([
    "vto_auth_token",
    "vto_refresh_token",
    "vto_user",
    "vto_last_result",
  ]);
}
