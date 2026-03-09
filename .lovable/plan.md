

## Comprehensive Project Analysis — Cartify

### Bugs and Issues

**1. tryon-request still references "VTO" in error message (line 201)**
The error message says `"Please upload a photo of your ${label} in your VTO profile"` — should say "Cartify profile".

**2. tryon-request doesn't receive price/retailerDomain from extension**
The background `handleTryOn` sends `product_title`, `product_image`, `product_url`, `product_category` to the edge function — but NOT `product_price` or `retailer_domain`. The edge function expects `price` and `retailerDomain` in the body but never receives them. This means `tryon_requests` rows always have `null` price and `null` retailer_domain.

**3. Session item price not passed to addSessionItem for try-on**
When `handleTryOn` succeeds, it calls `addSessionItem(payload, "tryon_requested", false, data.tryOnId)` — but the `payload` object only has `product_url`, `product_image`, `product_title`, `product_category`. It does NOT include `product_price` or `retailer_domain`. These fields are available in `ProductData` from extraction but get stripped before reaching `addSessionItem`.

**4. Currency detection is fragile**
`currencySymbol` in CartifyApp.tsx uses a simple regex `match(/[^\d\s.,]/)` which could match any non-digit character. If the price is `"SEK 299"`, the symbol becomes `"S"`. The `cleanPrice()` function may return `"199 kr"` — the regex would match `"k"`.

**5. Content script MutationObserver on `document.body` is too aggressive**
The observer triggers `scheduleListingRescan()` on every DOM change (childList + subtree on body). This fires constantly on dynamic pages (chat widgets, ad rotations, animations). Should use a more targeted approach or add throttling.

**6. "Add to Cart" button on Showroom cards links to affiliate redirect**
The `<a>` tag uses `getAffiliateUrl(r)` which goes through the redirect edge function. But the redirect function tries to get `userId` from the `Authorization` header — which isn't sent because it's a plain `<a href>` link. Click events are recorded with `null` user_id.

**7. No error handling on session summary total for mixed currencies**
If a user browses products on multiple retailers (e.g., one in USD, one in SEK), the totals sum raw numbers regardless of currency, producing meaningless results.

**8. Home/room/pet/car categories still in tryon-request edge function**
The edge function still has prompts and category mappings for `living_room`, `bedroom`, `kitchen`, `bathroom`, `office`, `pet`, `car_interior`, `garden`. The extension content script also still detects these categories. Since the focus is now exclusively on personal wearables, these add dead code and could produce confusing results.

**9. webAppSync matches too broad a pattern**
`"https://*.lovable.app/*"` means the sync script runs on ALL lovable.app subdomains, not just the Cartify one. Could interfere with other Lovable projects the user visits.

---

### Improvements

**10. No loading/refresh on Session page**
Once session items are loaded, there's no way to refresh without switching tabs. No pull-to-refresh or manual reload button.

**11. No empty cart state distinction**
The summary bar shows "X in cart" but there's no visual distinction between session items and cart items in the grid. Users can't easily see which items they've added to cart without hovering.

**12. Showroom actions not behind hover overlay**
Session page cards use hover overlays for actions, but Showroom cards always show Add to Cart / Download / Share buttons. Inconsistent with the premium design principle.

**13. No product link on session cards**
Clicking a session card does nothing (only hover actions). Users should be able to click to visit the product page.

**14. Price extraction not sent with try-on from product pages**
`doTryOn()` in `content/index.ts` calls `extractProduct()` which now returns `product_price`, but `handleTryOn` in background strips it before sending to the edge function.

**15. Profile page aspect ratio inconsistency**
Profile uses `aspect-square` while Session and Showroom use `aspect-[3/4]`. The original request was for consistency.

---

### Suggested New Features

**16. Cart badge on extension icon**
Show the number of cart items as a badge on the extension toolbar icon using `chrome.action.setBadgeText`.

**17. Saved/wishlist feature**
The `CARTIFY_SAVE_PRODUCT` message type exists but there's no UI to trigger "save" from content script buttons or view saved items separately.

**18. Realtime session sync**
Currently session items only load when switching to the Session tab. Could use `chrome.storage.onChanged` to push new items into the list in realtime as the user browses.

**19. Coupon auto-copy toast feedback**
The coupon code copy works but the toast says "Code copied!" — could show the actual code: `"SAVE20 copied!"`.

---

### Implementation Plan

| Priority | Item | Files |
|----------|------|-------|
| High | Fix try-on payload — pass price + retailerDomain to edge function | `extension/src/background/index.ts` |
| High | Fix "VTO profile" text in edge function error | `supabase/functions/tryon-request/index.ts` |
| High | Remove non-wearable categories from edge function | `supabase/functions/tryon-request/index.ts` |
| High | Pass price/domain in addSessionItem from try-on flow | `extension/src/background/index.ts` |
| Medium | Narrow webAppSync match to only `ddsasdkse.lovable.app` | `extension/manifest.json` |
| Medium | Make Showroom cards use hover overlay for actions | `extension/src/shared/CartifyApp.tsx` |
| Medium | Add cart visual indicator (subtle badge/dot) on session cards | `extension/src/shared/CartifyApp.tsx` |
| Medium | Make session cards clickable to open product URL | `extension/src/shared/CartifyApp.tsx` |
| Medium | Add refresh button to Session tab header | `extension/src/shared/CartifyApp.tsx` |
| Medium | Fix currency detection for non-symbol currencies (kr, SEK) | `extension/src/shared/CartifyApp.tsx` |
| Low | Throttle MutationObserver rescan to max 1/sec | `extension/src/content/index.ts` |
| Low | Add cart badge on extension icon | `extension/src/background/index.ts` |
| Low | Remove dead home/pet/car categories from content script detection | `extension/src/content/productExtract.ts` |

This is a total of 13 changes across 5 files + 1 edge function. The high-priority items are data-integrity bugs that cause missing prices and incorrect error messages. The medium items are UX consistency improvements.

