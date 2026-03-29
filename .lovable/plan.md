

## Fix Plan: Coupons, Variants, Images, Cart Clear, Back Button

### 1. Fix Coupon Discovery — Smart DB Cache + AI Fallback

**Problem**: The AI gateway returns 402 (credits exhausted) for every new-domain lookup, so only Zara (which has manual DB entries) shows coupons.

**Fix** (`supabase/functions/scrape-coupons/index.ts`):
- The DB-first cache check is already there and correct
- Switch to cheapest model: `google/gemini-2.5-flash-lite` (costs far less)
- On 402 error, log it but gracefully return whatever DB coupons exist (don't return empty)
- Add a `scraped_at` freshness check: only call AI if no entries exist OR all entries are older than 3 days (not 24h — reduce call frequency)
- When AI returns results, they persist in DB so all future users for that store get cached results instantly

**Fix** (`extension/src/background/index.ts`):
- The background already checks DB first, then calls edge function on miss — this is correct
- No changes needed here

### 2. Fix Variant Extraction — Stop Grabbing Footer/Legal Text

**Problem**: Selectors like `[class*='size' i]` match footer containers, grabbing "försäljnings- och leveransvillkor" as a variant.

**Fix** (`extension/src/content/productExtract.ts`):
- Remove the bare `[class*='size' i]` and `[class*='color' i]` from container selector lists (keep compound ones like `[class*='size' i][class*='selector' i]`)
- Restrict container search to product areas: only match inside `main`, `article`, `form`, `[class*='product' i]`, `[id*='product' i]`
- Add text blocklist — skip any value matching: `försäljning|villkor|leverans|retur|policy|guide|reviews|faq|kundtjänst|storleksguide|care|details|cookie|shipping|terms`
- Add length validation: sizes must be ≤10 chars, colors ≤30 chars
- Skip any element inside `nav`, `footer`, `header`, `[class*='policy' i]`, `[class*='delivery' i]`

### 3. Fix Ellos Image Extraction

**Problem**: Ellos uses `<picture>` elements with lazy-loaded `<source srcset>` inside non-standard containers that don't match current selectors.

**Fix** (`extension/src/content/productExtract.ts`):
- In the `<picture>` fallback (step 4), reduce threshold from `pictures.length > 5` to `> 8` — be even more lenient
- Add Ellos-specific selectors: `[data-product-media] img`, `[class*='media'] picture source`
- For the largest-image fallback, also check `img.currentSrc` before `img.src`

### 4. Clear Session Cart After Bulk Add-to-Retailer-Cart

**Problem**: After adding items to the real retailer cart, the session cart should empty since the user is done.

**Fix** (`extension/src/shared/CartifyApp.tsx`):
- After `handleAddToRetailerCart` completes for all grouped items for a retailer, mark those session items as `in_cart: false` or remove them from the session
- Show a toast: "Items added to {retailer} cart — session cleared"
- Reload session items to reflect the change

**Fix** (`extension/src/background/index.ts`):
- After successful add-to-cart + tab close, update the session items in the DB (set `in_cart = false` or `interaction_type = 'purchased'`)
- Trigger `cartify_session_updated_at` so the UI refreshes

### 5. Add Back Arrow Button (Session Header)

**Problem**: No way to undo changes or go back after making cart changes.

**Fix** (`extension/src/shared/CartifyApp.tsx`):
- Track a `sessionDirty` state — set to `true` when user adds/removes items from cart
- Show a `←` arrow button to the left of the `↻` refresh button, only when `sessionDirty === true`
- Clicking it reloads the session from DB (effectively undoing local-only changes) and resets `sessionDirty`

---

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/scrape-coupons/index.ts` | Switch to flash-lite model, extend cache TTL to 3 days, handle 402 gracefully |
| `extension/src/content/productExtract.ts` | Restrict variant selectors to product area, add blocklist + length validation, improve Ellos image handling |
| `extension/src/background/index.ts` | Mark session items as purchased after successful add-to-cart |
| `extension/src/shared/CartifyApp.tsx` | Clear cart after bulk add, add back arrow with dirty tracking |

