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
  // 1. JSON-LD with @type "Product"
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

  // 2. og:type = product
  const ogType = document.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content?.toLowerCase();
  if (ogType && (ogType === "product" || ogType.startsWith("og:product") || ogType.startsWith("product"))) return true;

  // 3. Microdata price indicators
  if (document.querySelector('[itemprop="price"], [itemprop="priceCurrency"], [data-price], [class*="product-price"], [class*="productPrice"]')) return true;

  // 4. "Add to cart" / "Buy" / "Add to bag" buttons
  const buttons = document.querySelectorAll("button, [role='button'], a.btn, a.button, input[type='submit']");
  for (const btn of buttons) {
    const text = (btn.textContent || "").trim().toLowerCase();
    if (/add to (cart|bag|basket)|buy now|in den warenkorb|ajouter au panier|zum warenkorb|comprar/i.test(text)) return true;
  }

  // 5. Common product page URL patterns
  const path = location.pathname.toLowerCase();
  if (/\/(product|products|item|dp|p|pd|shop)\/[^/]+/i.test(path)) return true;
  // Zalando-style: /<brand>-<product>-<sku>.html or similar with SKU-like segments
  if (/\/[a-z0-9-]+-[a-z0-9]{6,}\.(html|htm)$/i.test(path)) return true;

  // 6. Presence of product-related schema attributes
  if (document.querySelector('[itemtype*="schema.org/Product"], [itemtype*="schema.org/Offer"]')) return true;

  return false;
}

function removeVtoElements() {
  document.getElementById("vto-tryon-btn")?.remove();
  removeLoginPill();
}

function evaluatePage() {
  if (!isProductPage()) {
    removeVtoElements();
    return;
  }

  // It's a product page — check auth and inject
  chrome.runtime.sendMessage({ type: "VTO_GET_AUTH" }, (response) => {
    if (chrome.runtime.lastError) {
      console.log("[VTO] Extension context error:", chrome.runtime.lastError.message);
      return;
    }

    if (response?.loggedIn) {
      removeLoginPill();
      if (!document.getElementById("vto-tryon-btn")) {
        injectButton(doTryOn);
      }
    } else {
      document.getElementById("vto-tryon-btn")?.remove();
      injectLoginPill();
    }
  });
}

(() => {
  // Initial evaluation — may run before DOM is fully rendered on SPAs,
  // so we also set up re-evaluation below.
  // Small delay to let SPA frameworks render product data
  setTimeout(evaluatePage, 500);

  // Listen for auth state changes so button updates immediately after login
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.vto_auth_token) return;

    if (changes.vto_auth_token.newValue) {
      // Re-evaluate — only inject if on product page
      evaluatePage();
    } else {
      removeVtoElements();
    }
  });

  // SPA navigation watcher — re-evaluate when URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove existing UI and re-evaluate after a short delay
      // to let the new page content render
      removeVtoElements();
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
    { type: "VTO_TRYON_REQUEST", payload: product },
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
