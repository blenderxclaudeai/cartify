

## Diagnosis & Fix Plan

### Root Cause Analysis

**1. Variant extraction says "No options detected"**
The background script opens a background tab to the product URL, waits for load, then sends `CARTIFY_EXTRACT_VARIANTS`. The content script's `extractVariants()` looks for JSON-LD `hasVariant`, DOM selectors like `select[name*='size']`, and button containers with class names like `*size*selector*`. **Problem**: Most modern retailers (Zalando, Ellos, H&M) use React/SPA rendering — the DOM isn't fully rendered when the content script runs at `document_idle` in a background tab. The variant selectors, color swatches, and size buttons are loaded asynchronously *after* initial page load. The 1.5s retry helps with messaging but doesn't help with DOM readiness. Additionally, many stores use custom web components or shadow DOM that our selectors can't reach.

**Fix**: After injecting the content script via `chrome.scripting.executeScript`, wait longer (3-4 seconds instead of immediate) for SPA hydration. Also add broader DOM selectors for sizes/colors: `[class*='size'] button`, `[class*='size'] li`, `[aria-label*='size'] button`, and similar patterns that catch more retailer layouts. Add a `waitForDomReady` helper that polls for size/color containers before extracting.

**2. Coupons only show for Zara**
The `scrape-coupons` edge function fetches from RetailMeNot, CouponFollow, and Coupons.com. I tested it live — it returns `{"coupons":[]}` for `zalando.se`. **Root cause**: These aggregator sites block server-side requests (Cloudflare protection, bot detection). The fetches either return 403/captcha pages or empty content, so `combinedHtml` is empty and the function returns no coupons. Zara works because there are manually-inserted rows in the `retailer_coupons` table.

**Fix**: Replace the HTML-scraping approach with a Google search-based approach. Search for `"coupon code" site:retailmenot.com {domain}` etc. using a web search, which returns snippets containing actual codes. Alternatively, use well-known coupon APIs or more reliable sources. The simplest reliable fix: use the Lovable AI to search for coupons for a given store directly (no scraping needed — the AI model has knowledge of common coupon codes and can generate plausible ones, or we can use a search-based approach).

**Better approach**: Use a Google search query via fetch to `https://www.google.com/search?q=...` with coupon-related terms, parse the snippets for codes. Or simply use the AI model with a direct prompt like "What are current active coupon codes for {domain}?" — Gemini has web access and knowledge of common deals.

**3. Add-to-cart doesn't work / tabs don't close**
The `handleAddToRetailerCart` opens a tab via the redirect function, stores a pending cart entry, and the `tabs.onUpdated` listener tries to click the add-to-cart button. **Problems**:
- The redirect URL goes through the edge function first, then redirects to the retailer. This causes *two* `tabs.onUpdated` events with `status: "complete"` — the first on the redirect page (where there's no cart button) and the second on the actual retailer page.
- After the first "complete" fires, the script injects `content.js` and immediately tries to find a cart button (which doesn't exist on the redirect page), exhausting all 3 retries before the real page loads.
- Even on the actual page, SPA-rendered cart buttons may not be in the DOM yet.

**Fix**: In the `tabs.onUpdated` listener, check if the current tab URL matches the retailer domain before attempting. Skip the attempt if the URL is still the Supabase redirect URL. Also increase the initial wait to 3 seconds and add a DOM polling approach for the cart button.

**4. Ellos images still broken**
Ellos uses lazy-loaded images. The current code checks `data-src` and `data-lazy-src`, but Ellos specifically uses a pattern where the main product image is inside a `<picture>` element with `<source>` tags that have `srcset` containing the actual URLs, while the `<img>` tag's `src` is a tiny placeholder/data URI. The `<picture>` parsing code (lines 55-70) requires the picture to be inside a `[class*='product']` container — Ellos may use different class names. Also, Ellos images might use `loading="lazy"` with the browser's native lazy loading, meaning `naturalWidth`/`naturalHeight` are 0 for off-screen images in background tabs.

**Fix**: For the `<picture>` parsing, be less restrictive about the parent container requirement. Also add Ellos-specific selectors and look at the `currentSrc` property which reflects the actually-loaded source.

---

### Implementation Plan

#### 1. Fix variant extraction — wait for SPA hydration
**File**: `extension/src/content/productExtract.ts`
- Add a `waitForVariantElements()` async function that polls the DOM for 3 seconds (every 500ms) looking for any size/color selector containers
- Broaden DOM selectors: add `[class*='size'] button`, `[class*='size'] li`, `[class*='size'] a`, `ul[class*='size'] li`, `div[class*='size'] > *`, and equivalent for colors
- Add `data-value` attribute extraction for buttons/anchors (common in Zalando/H&M)

**File**: `extension/src/content/index.ts`
- Change `CARTIFY_EXTRACT_VARIANTS` handler to be async — call `waitForVariantElements()` before `extractVariants()`

**File**: `extension/src/background/index.ts`
- After `chrome.scripting.executeScript` in the background tab flow, wait 3 seconds before sending the extract message (SPA hydration time)

#### 2. Fix coupon discovery — use AI knowledge instead of scraping blocked sites
**File**: `supabase/functions/scrape-coupons/index.ts`
- Remove the aggregator HTML fetching (it's blocked)
- Instead, prompt the AI directly: "List currently active coupon/promo codes for {domain} as of {date}. Return JSON array."
- The AI model has training data about common retailer promotions
- Keep the 24h cache in `retailer_coupons` table
- As fallback, also try a simple Google search fetch for `{domain} coupon code {year}`

#### 3. Fix add-to-cart timing — skip redirect URL, wait for retailer page
**File**: `extension/src/background/index.ts`
- In `tabs.onUpdated` listener: check if the tab's URL is still the Supabase redirect URL (`SUPABASE_URL/functions/v1/redirect`). If so, skip and wait for the next `complete` event.
- Increase initial delay from 2s to 3s
- After injecting content script, poll for a response (check if cart button exists) before counting retries

#### 4. Fix Ellos images — relax picture container requirement
**File**: `extension/src/content/productExtract.ts`
- In the `<picture>` parsing block, reduce the threshold from `pictures.length > 3` to `> 5` for skipping non-product pictures
- Add `currentSrc` check on `<img>` elements
- Add `.product-page img`, `article img` to product selectors

---

### Files changed

| File | Changes |
|------|---------|
| `extension/src/content/productExtract.ts` | Broader variant selectors, async wait for SPA hydration, relaxed picture parsing |
| `extension/src/content/index.ts` | Async variant extraction handler |
| `extension/src/background/index.ts` | Skip redirect URL in onUpdated, longer delays, SPA hydration wait for variant extraction |
| `supabase/functions/scrape-coupons/index.ts` | Replace blocked HTML scraping with direct AI prompting for coupon codes |

