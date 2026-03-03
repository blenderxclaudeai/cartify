import type { TryOnResponse } from "@ext/lib/types";

const BUTTON_ID = "cartify-tryon-btn";
const PILL_ID = "cartify-login-pill";
const MODAL_ID = "cartify-modal-overlay";

export function injectButton(onClick: () => void): HTMLButtonElement {
  const existing = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (existing) return existing;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Try On";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "10px 20px",
    border: "none",
    borderRadius: "12px",
    background: "#171717",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  });

  btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.05)"; });
  btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });
  btn.addEventListener("click", onClick);
  document.body.appendChild(btn);
  return btn;
}

export function injectLoginPill(): void {
  if (document.getElementById(PILL_ID)) return;
  const pill = document.createElement("div");
  pill.id = PILL_ID;
  pill.textContent = "Log in to Cartify to try on";
  Object.assign(pill.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "8px 16px",
    borderRadius: "20px",
    background: "#f5f5f5",
    color: "#737373",
    fontSize: "12px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    cursor: "pointer",
  });
  pill.addEventListener("click", () => {
    pill.textContent = "Click the Cartify icon in toolbar";
    setTimeout(() => { pill.textContent = "Log in to Cartify to try on"; }, 3000);
  });
  document.body.appendChild(pill);
}

export function removeLoginPill(): void {
  document.getElementById(PILL_ID)?.remove();
}

export function showModal() {
  removeModal();
  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "2147483647",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.6)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "#fff", borderRadius: "16px", padding: "24px",
    width: "380px", maxHeight: "80vh", overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center", color: "#171717",
  });
  card.innerHTML = `
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;">Cartify Preview</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#737373;">Generating your try-on...</p>
    <div id="cartify-modal-body" style="min-height:200px;display:flex;align-items:center;justify-content:center;">
      <div style="width:32px;height:32px;border:3px solid #e5e5e5;border-top-color:#171717;border-radius:50%;animation:cartify-spin 0.8s linear infinite;"></div>
    </div>
  `;
  const style = document.createElement("style");
  style.textContent = `@keyframes cartify-spin{to{transform:rotate(360deg)}}`;
  card.appendChild(style);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) removeModal(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

/** Store product URL for affiliate redirect on modal close */
let _currentProductUrl: string | null = null;
let _affiliateRedirectUrl: string | null = null;

export function setModalProduct(productUrl: string, supabaseUrl: string) {
  _currentProductUrl = productUrl;
  const domain = new URL(productUrl).hostname;
  _affiliateRedirectUrl = `${supabaseUrl}/functions/v1/redirect?target=${encodeURIComponent(productUrl)}&retailerDomain=${encodeURIComponent(domain)}`;
}

export function updateModalSuccess(result: TryOnResponse) {
  const body = document.getElementById("cartify-modal-body");
  if (!body) return;

  const buyBtnHtml = _affiliateRedirectUrl
    ? `<a id="cartify-modal-buy" href="${_affiliateRedirectUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 28px;border:none;border-radius:8px;background:#171717;color:#fff;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;margin-bottom:8px;">Buy This Item</a>`
    : "";

  if (result.resultImageUrl) {
    body.innerHTML = `
      <div style="width:100%;">
        <img src="${result.resultImageUrl}" alt="Try-on result" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;margin-bottom:12px;" />
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          ${buyBtnHtml}
          <button id="cartify-modal-close" style="padding:8px 24px;border:none;border-radius:8px;background:transparent;color:#737373;font-size:12px;font-weight:500;cursor:pointer;">Close</button>
        </div>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div>
        <p style="font-size:14px;color:#171717;margin:0 0 12px;">Try-on request submitted!</p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          ${buyBtnHtml}
          <button id="cartify-modal-close" style="padding:8px 24px;border:none;border-radius:8px;background:transparent;color:#737373;font-size:12px;font-weight:500;cursor:pointer;">Close</button>
        </div>
      </div>
    `;
  }
  document.getElementById("cartify-modal-close")?.addEventListener("click", closeModalWithRedirect);
}

export function updateModalError(errorMsg: string, missingPhoto?: string) {
  const body = document.getElementById("cartify-modal-body");
  if (!body) return;

  const missingPhotoHtml = missingPhoto
    ? `<p style="font-size:12px;color:#737373;margin:8px 0 0;">Open the Cartify extension and upload a photo of your <strong>${missingPhoto}</strong> in your profile to try on this product.</p>`
    : "";

  body.innerHTML = `
    <div>
      <p style="font-size:14px;color:#dc2626;margin:0 0 8px;">Something went wrong</p>
      <p style="font-size:12px;color:#737373;margin:0 0 8px;">${errorMsg}</p>
      ${missingPhotoHtml}
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
        <button id="cartify-modal-retry" style="padding:8px 20px;border:1px solid #e5e5e5;border-radius:8px;background:#fff;color:#171717;font-size:13px;font-weight:500;cursor:pointer;">Retry</button>
        <button id="cartify-modal-close" style="padding:8px 20px;border:none;border-radius:8px;background:#171717;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Close</button>
      </div>
    </div>
  `;
  document.getElementById("cartify-modal-close")?.addEventListener("click", closeModalWithRedirect);
}

export function getRetryButton(): HTMLElement | null {
  return document.getElementById("cartify-modal-retry");
}

/** Technique 5: Redirect page through affiliate link when modal closes */
function closeModalWithRedirect() {
  document.getElementById(MODAL_ID)?.remove();
  if (_affiliateRedirectUrl && _currentProductUrl) {
    window.location.href = _affiliateRedirectUrl;
  }
  _currentProductUrl = null;
  _affiliateRedirectUrl = null;
}

function removeModal() {
  document.getElementById(MODAL_ID)?.remove();
  _currentProductUrl = null;
  _affiliateRedirectUrl = null;
}
