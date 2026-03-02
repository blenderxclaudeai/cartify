import { supabase, SUPABASE_URL } from "./supabase";

/**
 * Launch OAuth via chrome.identity.launchWebAuthFlow.
 * Works inside MV3 extension popups without needing an external web page.
 */
export async function signInWithOAuth(provider: "google" | "apple") {
  // Get the redirect URL that chrome.identity provides
  const redirectUrl = chrome.identity.getRedirectURL();

  // Build the Supabase OAuth URL with skipBrowserRedirect
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: redirectUrl,
    },
  });

  if (error || !data.url) {
    throw error || new Error("No OAuth URL returned");
  }

  // Launch the web auth flow in a browser popup
  const resultUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: data.url, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!responseUrl) {
          reject(new Error("No response URL"));
        } else {
          resolve(responseUrl);
        }
      }
    );
  });

  // Parse tokens from the URL hash fragment
  // Supabase redirects with #access_token=...&refresh_token=...
  const hashParams = new URLSearchParams(
    resultUrl.includes("#") ? resultUrl.split("#")[1] : ""
  );
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");

  if (!access_token || !refresh_token) {
    throw new Error("Missing tokens in OAuth response");
  }

  // Set the session on the Supabase client
  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({ access_token, refresh_token });

  if (sessionError) throw sessionError;

  // Persist token to chrome.storage.local for background/content scripts
  if (sessionData.session) {
    await chrome.storage.local.set({
      vto_auth_token: sessionData.session.access_token,
      vto_refresh_token: sessionData.session.refresh_token,
      vto_user: {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        name:
          sessionData.session.user.user_metadata?.full_name ||
          sessionData.session.user.user_metadata?.name ||
          sessionData.session.user.email,
        avatar_url: sessionData.session.user.user_metadata?.avatar_url,
      },
    });
  }

  return sessionData.session;
}

export async function getStoredAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get("vto_auth_token");
    return result.vto_auth_token || null;
  } catch {
    return null;
  }
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
  const token = await getStoredAuthToken();
  return !!token;
}

export async function signOut() {
  await supabase.auth.signOut();
  await chrome.storage.local.remove([
    "vto_auth_token",
    "vto_refresh_token",
    "vto_user",
    "vto_last_result",
  ]);
}
