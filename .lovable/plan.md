

## Problems

1. **Button/pill appears on every website** (GitHub, Google, etc.) — there is zero product page detection. The content script runs on `<all_urls>` and immediately injects the button or login pill with no check.

2. **Doesn't appear on Zalando** — Zalando is a SPA. The content script runs once at `document_idle`. If the page navigates client-side to a product page after initial load, the script doesn't re-evaluate. The MutationObserver at the bottom watches for URL changes but does nothing with them.

3. **Emoji still visible** — The screenshot shows a sparkle on the "Try On" button. This is likely a stale extension build, but we should double-check all text strings.

## Plan

### 1. Add `isProductPage()` gate in `extension/src/content/index.ts`

Before injecting anything, check if the current page is actually a product page using these signals:
- JSON-LD `@type: "Product"` schema
- `og:type` = `"product"` or `"og:product"`
- Presence of price indicators (elements with `itemprop="price"`, common price CSS patterns)
- "Add to cart" / "Buy" buttons
- URL patterns common to product pages (`/product/`, `/p/`, `/dp/`)

If none of these signals are found, do NOT inject the button or pill. This stops it from appearing on GitHub, Google, etc.

### 2. Fix SPA navigation re-evaluation

The MutationObserver already detects URL changes but doesn't act on them. Update it to re-run the product page check and inject/remove the button accordingly when the URL changes. This fixes Zalando and other SPAs where users navigate to a product page after the initial script load.

### 3. Verify emoji removal

Confirm all UI strings in `ui.ts` and `Popup.tsx` have no emojis. The current code looks clean, so this is likely a stale build issue — but will double-check.

### Files to change

- **`extension/src/content/index.ts`** — Add `isProductPage()` check, make MutationObserver re-evaluate on URL change
- **`extension/src/content/ui.ts`** — Verify no emojis (looks clean already)
- **`extension/src/popup/Popup.tsx`** — Verify no emojis

