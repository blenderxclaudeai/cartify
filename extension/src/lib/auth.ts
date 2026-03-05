/**
 * Extension auth helpers — thin wrappers around background messages.
 * All actual OAuth logic lives in the background service worker.
 */

export async function signInWithOAuth(
  provider: "google" | "apple"
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "AUTH_LOGIN", provider },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message || "Extension error" });
          return;
        }
        resolve(response || { ok: false, error: "No response" });
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
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_GET_USER" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response?.user || null);
    });
  });
}

export async function isLoggedIn(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_GET_USER" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(response?.loggedIn || false);
    });
  });
}

export async function signOut(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }, () => {
      resolve();
    });
  });
}
