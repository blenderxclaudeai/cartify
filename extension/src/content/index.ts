import { extractProduct } from "./productExtract";
import {
  injectButton,
  injectLoginPill,
  removeLoginPill,
  showModal,
  setModalProduct,
  updateModalSuccess,
  updateModalError,
  getRetryButton,
} from "./ui";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/** Check if the current page looks like a product/shopping page */
function isProductPage(): boolean {
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || "");
      const check = (obj: any): boolean => {
        if (!obj) return false;
        if (obj["@type"] === "Product" || obj["@type"] === "ProductGroup") return true;
        if (Array.isArray(obj["@graph"])) return obj["@graph"].some(check);
        if (Array.isArray(obj)) return obj.some(check);
        return false;
      };
      if (check(data)) return true;
    } catch { /* ignore */ }
  }

  const ogType = document.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content?.toLowerCase();
  if (ogType && (ogType === "product" || ogType.startsWith("og:product") || ogType.startsWith("product"))) return true;

  if (document.querySelector('[itemprop="price"], [itemprop="priceCurrency"], [data-price], [class*="product-price"], [class*="productPrice"]')) return true;

  const buttons = document.querySelectorAll("button, [role='button'], a.btn, a.button, input[type='submit']");
  for (const btn of buttons) {
    const text = (btn.textContent || "").trim().toLowerCase();
    if (/add to (cart|bag|basket)|buy now|in den warenkorb|ajouter au panier|zum warenkorb|comprar/i.test(text)) return true;
  }

  const path = location.pathname.toLowerCase();
  if (/\/(product|products|item|dp|p|pd|shop)\/[^/]+/i.test(path)) return true;
  if (/\/[a-z0-9-]+-[a-z0-9]{6,}\.(html|htm)$/i.test(path)) return true;

  if (document.querySelector('[itemtype*="schema.org/Product"], [itemtype*="schema.org/Offer"]')) return true;

  return false;
}

function removeCartifyElements() {
  document.getElementById("cartify-tryon-btn")?.remove();
  removeLoginPill();
}

function evaluatePage() {
  if (!isProductPage()) {
    removeCartifyElements();
    return;
  }

  chrome.runtime.sendMessage({ type: "CARTIFY_GET_AUTH" }, (response) => {
    if (chrome.runtime.lastError) {
      console.log("[Cartify] Extension context error:", chrome.runtime.lastError.message);
      return;
    }

    if (response?.loggedIn) {
      removeLoginPill();
      if (!document.getElementById("cartify-tryon-btn")) {
        injectButton(doTryOn);
      }
    } else {
      document.getElementById("cartify-tryon-btn")?.remove();
      injectLoginPill();
    }
  });
}

(() => {
  setTimeout(evaluatePage, 500);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.cartify_auth_token) return;

    if (changes.cartify_auth_token.newValue) {
      evaluatePage();
    } else {
      removeCartifyElements();
    }
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeCartifyElements();
      setTimeout(evaluatePage, 800);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();

function doTryOn() {
  const product = extractProduct();
  if (!product.product_image) {
    showModal();
    updateModalError("No product image found on this page.");
    return;
  }

  showModal();
  setModalProduct(product.product_url, SUPABASE_URL);

  chrome.runtime.sendMessage(
    { type: "CARTIFY_TRYON_REQUEST", payload: product },
    (response) => {
      if (chrome.runtime.lastError) {
        updateModalError(chrome.runtime.lastError.message || "Extension error");
        bindRetry();
        return;
      }
      if (response?.ok) {
        updateModalSuccess(response);
      } else {
        updateModalError(
          response?.error || "Request failed",
          response?.missingPhoto
        );
        bindRetry();
      }
    }
  );
}

function bindRetry() {
  const retryBtn = getRetryButton();
  if (retryBtn) {
    retryBtn.addEventListener("click", doTryOn);
  }
}
