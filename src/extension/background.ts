// Background service worker — plain TS, no React/JSX.
// Receives product data from the content script, stores it, and opens the popup.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VTO_TRYON_REQUEST") return;

  const { payload } = message;

  // Store product data so the popup can read it on load
  chrome.storage.local.set({ vto_pending_product: payload }, () => {
    // Open the popup (action popup) — this shows it as if the user clicked the icon
    // Note: programmatically opening a popup only works from a user gesture in the
    // content script, which we have (the button click). The popup will read storage on mount.
    sendResponse({ ok: true });
  });

  // Keep the message channel open for async sendResponse
  return true;
});

// Optional: clear stale data when extension starts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove("vto_pending_product");
});
