// Background service worker — handles auth persistence + try-on requests

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Auth check
  if (msg?.type === "CARTIFY_GET_AUTH") {
    chrome.storage.local.get(["cartify_auth_token", "cartify_user"], (result) => {
      sendResponse({
        loggedIn: !!result.cartify_auth_token,
        user: result.cartify_user || null,
      });
    });
    return true;
  }

  // Session sync from web app content script
  if (msg?.type === "CARTIFY_SESSION_FROM_WEB") {
    const { access_token, refresh_token, user } = msg.payload;
    chrome.storage.local.set(
      {
        cartify_auth_token: access_token,
        cartify_refresh_token: refresh_token,
        cartify_user: user,
      },
      () => {
        sendResponse({ ok: true });
      }
    );
    return true;
  }

  // Try-on request
  if (msg?.type !== "CARTIFY_TRYON_REQUEST") return;

  const { payload } = msg;

  (async () => {
    try {
      const stored = await chrome.storage.local.get("cartify_auth_token");
      const authToken = stored.cartify_auth_token;

      if (!authToken) {
        sendResponse({ ok: false, error: "NOT_LOGGED_IN" });
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/tryon-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          pageUrl: payload.product_url,
          imageUrl: payload.product_image,
          title: payload.product_title,
          category: payload.product_category || undefined,
        }),
      });

      let data: any;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        sendResponse({ ok: false, error: "Request timed out. Please try again." });
        return;
      }

      if (!res.ok) {
        sendResponse({
          ok: false,
          error: data.error || `HTTP ${res.status}`,
          missingPhoto: data.missingPhoto || undefined,
        });
      } else {
        chrome.storage.local.set({
          cartify_last_result: {
            ...data,
            product_url: payload.product_url,
            product_title: payload.product_title,
            timestamp: Date.now(),
          },
        });
        sendResponse({
          ok: true,
          tryOnId: data.tryOnId,
          resultImageUrl: data.resultImageUrl,
        });

        // Silent affiliate cookie drop
        try {
          const domain = new URL(payload.product_url).hostname;
          const redirectUrl = `${SUPABASE_URL}/functions/v1/redirect?target=${encodeURIComponent(payload.product_url)}&retailerDomain=${encodeURIComponent(domain)}&clickRef=silent_cookie`;
          chrome.tabs.create({ url: redirectUrl, active: false }, (tab) => {
            if (tab?.id) {
              setTimeout(() => { chrome.tabs.remove(tab.id!); }, 3000);
            }
          });
        } catch (e) {
          console.log("[Cartify] Silent cookie drop failed:", e);
        }
      }
    } catch (e: any) {
      console.error("[Cartify background]", e);
      sendResponse({ ok: false, error: e.message });
    }
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(["cartify_last_result"]);
});
