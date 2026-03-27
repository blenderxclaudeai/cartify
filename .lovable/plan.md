

## Fix Add-to-Cart Flow, Variant Extraction, Image & Price Scraping + Auto Coupon Discovery

### Problem Summary

1. Variant extraction only works if a tab is already open on that retailer — fails silently otherwise
2. Skip button lets users bypass variant selection, but products need size/color to be added to cart
3. "Add to cart" opens retailer tabs but doesn't click add-to-cart reliably, and tabs stay open flooding the browser
4. Image extraction picks wrong images on some stores (e.g. Ellos uses `<picture>` / `srcset`)
5. Price extraction fails on some stores (e.g. Zara uses non-standard price markup)
6. **Coupons only show for Zara** because the database only has manually-added Zara entries — needs auto-discovery for any store

---

### 1. Fix variant extraction — open background tabs to extract

In `background/index.ts`: when no matching tab exists for a product URL, open it in a **background tab** (`active: false`), wait for `status === "complete"`, send `CARTIFY_EXTRACT_VARIANTS` with retry (3 attempts, 1.5s apart), then **close the tab**.

### 2. Make variant selection required

In `CartifyApp.tsx`: remove the "Skip" button. "Confirm" button is **disabled** until at least size OR color is selected (when options are available). If no variants were extracted (no sizes AND no colors), allow proceeding without selection. Helper text: "Select size and color to continue."

### 3. Fix add-to-cart automation + auto-close tabs

In `background/index.ts`: change `cartify_pending_retailer_cart` from a single object to an **array** keyed by `tabId`. After successful `CARTIFY_ADD_TO_RETAILER_CART` response, wait 2 seconds then **close the tab** via `chrome.tabs.remove(tabId)`.

### 4. Improve image extraction for all stores

In `productExtract.ts` `scrapeImage()`:
- **Top priority**: JSON-LD `Product.image`
- Add `<picture>` / `<source srcset>` parsing
- Add product-specific selectors: `[class*='product'] img`, `[class*='gallery'] img:first-child`
- Filter "largest image" fallback: exclude images with width < 200 or aspect ratio > 3:1

### 5. Improve price extraction for all stores

In `productExtract.ts` `scrapePrice()`:
- Add selectors: `[class*='money']`, `[class*='amount']`, `[class*='price__amount']`, `[data-qa*='price']`, `[data-testid*='current-price']`
- Add `aria-label` scanning on price containers
- Scan short text nodes matching price regex as broad fallback

### 6. Auto-discover coupons for any retailer (NEW)

**New edge function** `supabase/functions/scrape-coupons/index.ts`:
- Accepts `{ domain: string }`
- Checks `retailer_coupons` for cached coupons less than 24 hours old (using new `scraped_at` column)
- On cache miss: fetches HTML from coupon aggregator URLs (RetailMeNot, CouponFollow) with browser-like User-Agent
- Sends raw HTML to Lovable AI (Gemini 2.5 Flash) to extract coupon codes, descriptions, and discount info as structured JSON
- Inserts extracted coupons into `retailer_coupons` with 24-hour expiry
- Returns coupons

**Database migration**: add `scraped_at timestamptz` column to `retailer_coupons`

**Background script update** in `background/index.ts`: after querying `retailer_coupons` and finding no results, call the `scrape-coupons` edge function with the domain. Cache returned coupons as before.

---

### Files changed

| File | Changes |
|------|---------|
| `extension/src/background/index.ts` | Background tab for variant extraction; pending cart array with auto-close; call scrape-coupons on coupon cache miss |
| `extension/src/content/productExtract.ts` | JSON-LD image priority, `<picture>`/`srcset`, product-specific selectors, broader price selectors |
| `extension/src/shared/CartifyApp.tsx` | Remove skip button, require variant selection, disable confirm when no selection |
| `supabase/functions/scrape-coupons/index.ts` | **New** — scrape coupon aggregators via AI extraction |
| Migration | Add `scraped_at` column to `retailer_coupons` |

### Technical details

- Background tabs: `chrome.tabs.create({ url, active: false })` — invisible to user, closed after use
- Coupon cache TTL: 24 hours via `scraped_at` timestamp comparison
- AI extraction uses Gemini 2.5 Flash (no API key needed) to parse messy HTML into structured coupon data
- If scraping fails (blocked/timeout), returns empty array gracefully
- Edge function uses service role key to insert coupons (bypasses RLS)
- Image priority chain: JSON-LD Product.image → og:image → twitter:image → product selectors → picture/srcset → largest filtered img

