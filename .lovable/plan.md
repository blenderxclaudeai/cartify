

## Fix Plan: Coupons, Variants, Price Detection — Make Everything Bulletproof

### Core Problems Identified

1. **Coupons still only show for Zara** — The AI gateway returns 402 (credits exhausted). The edge function handles this gracefully by returning empty, but the result is: no coupons for any store except those with manual DB entries (Zara). The code is correct but credits are gone.

2. **Variant detection grabs garbage text** — `waitForVariantElements()` (lines 427-439) still uses bare selectors like `[class*='size' i] button` and `[class*='color' i] button` which match footer/legal elements. Even though `extractSizesFromDom` was fixed with blocklists, the wait function triggers early on garbage matches, and the extraction functions' compound selectors may not match the actual product variant UI on many stores.

3. **Variants extracted too late** — Currently variants are only fetched when the user clicks "Add to retailer cart" (via `CARTIFY_EXTRACT_VARIANTS`), opening a background tab. This is slow and unreliable because background tabs often don't hydrate SPAs. Should extract when the product is **added to the session cart** instead, while the user is already on the page.

4. **Price not detected on some stores** — The price extraction chain is thorough but some stores (like Zara) use deeply nested component-based rendering that doesn't match standard selectors.

---

### Fix 1: Coupon Discovery — Use Google Search Scraping (No AI Credits Needed)

**File: `supabase/functions/scrape-coupons/index.ts`**

The AI approach is fundamentally broken because it depends on API credits. Replace with a **two-tier approach**:

- **Tier 1 (DB cache)**: Check `retailer_coupons` table — already works
- **Tier 2 (Google search)**: When no cached coupons exist, fetch `https://www.google.com/search?q={domain}+coupon+code+{year}` with a browser-like User-Agent. Parse coupon codes from HTML snippets using regex patterns (codes near words like "code", "coupon", "off", "discount"). Store results in DB with 3-day TTL
- **Tier 3 (AI fallback)**: If Google scrape finds nothing AND `LOVABLE_API_KEY` has credits, try AI as last resort

This approach is free, doesn't depend on AI credits, and Google search results contain real coupon codes from aggregator sites.

### Fix 2: Extract Variants When Adding to Session Cart (Not at Checkout)

**File: `extension/src/content/index.ts`**

When the user clicks "Add to Cart" on a product page, **extract variants immediately** (they're already on the page — no background tab needed) and store them alongside the session item.

- In `handleCartClick()`: call `extractVariants()` right there and include results in the `CARTIFY_ADD_TO_CART` payload
- Store variants in `chrome.storage.local` keyed by product URL

**File: `extension/src/background/index.ts`**

- Accept variants in `CARTIFY_ADD_TO_CART` payload and store them in `chrome.storage.local` as `cartify_variants_{itemId}`

**File: `extension/src/shared/CartifyApp.tsx`**

- When showing the variant selection modal, check stored variants first before making a `CARTIFY_EXTRACT_VARIANTS` call
- Only fall back to background-tab extraction if no pre-stored variants exist

### Fix 3: Bulletproof Variant Extraction

**File: `extension/src/content/productExtract.ts`**

**A. Fix `waitForVariantElements()`** — Remove bare selectors that match footer:
- Remove `[class*='size' i] button`, `[class*='size' i] li`, `[class*='size' i] a`
- Remove `[class*='color' i] button`, `[class*='colour' i] button`
- Keep only compound/specific selectors

**B. Add universal fallback extraction** using the approach from the technical advisor:
- Search for `select, [role="radiogroup"], fieldset` elements inside `PRODUCT_AREA_SELECTORS`
- Use `aria-label` or nearby `legend/label` to determine if it's size/color
- Extract `option, [role=radio], button, li, label` children
- Apply existing blocklist + length validation
- This catches stores with non-standard class names

**C. Add schema.org `select` detection** — Many stores use standard `<select>` with option values inside forms. Broaden `select` detection beyond just `name*='size'` — also check `<label>` siblings.

### Fix 4: Better Price Detection

**File: `extension/src/content/productExtract.ts`**

Add additional price selectors for modern storefronts:
- `[data-testid*='product'] [data-testid*='price']` (nested testid pattern)
- `[class*='price' i]:not(nav *, footer *, header *)` — restrict to non-nav areas
- For Zara specifically: their prices are often in `span` elements with specific data attributes — the existing short-text-node fallback (step 7) should catch these, but ensure it runs on the right elements

---

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/scrape-coupons/index.ts` | Add Google search scraping tier before AI, keep AI as fallback |
| `extension/src/content/productExtract.ts` | Fix `waitForVariantElements` bare selectors, add universal fallback extraction, improve price detection |
| `extension/src/content/index.ts` | Extract variants in `handleCartClick` when adding to session cart |
| `extension/src/background/index.ts` | Store pre-extracted variants with session items |
| `extension/src/shared/CartifyApp.tsx` | Use pre-stored variants before background-tab fallback |

