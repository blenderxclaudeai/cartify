

## Extension UI Polish and UX Improvements

### 1. Session card hover: icon-only buttons

Replace the current text buttons ("Try On", "Remove from Cart", "Retailer Cart", "Remove") with three small icon-only circular buttons on hover:

- **Hanger icon** — Try On
- **Trash/X icon** — Remove from Cart (or Remove item)
- **Expand/maximize icon** — Enlarge image in a lightbox overlay

These appear in a row over the product image on hover, similar to the retailer site card buttons. Clean and non-intrusive.

### 2. Remove the black checkmark badge

The `✓` circle in top-right of cart items is removed. Instead, clicking the product image itself opens the product URL on the retailer site (acts as the backlink). The hover overlay with action icons sits on top, with `e.stopPropagation()` to avoid triggering the link.

### 3. Image lightbox

When the user clicks the expand icon, a simple overlay within the extension shows the product image at full width with a close button. No external navigation.

### 4. Disable hover overlay on retailer product pages

Currently, the content script's `injectButton` places a fixed "Try On" button on product pages — this is fine. The issue is the content script may also be injecting card-level hover buttons on product page images. The fix: on product-only pages (not listing pages), skip `setupListingButtons()` entirely and only show the fixed "Try On" button. This is already the case in `evaluatePage()` line 241 (`if (productPage && !listingPage)`), so the overlay buttons should not appear. If the user sees hover interference, it may be from the retailer's own hover — we ensure our content script does nothing extra on product pages.

### 5. Bottom bar cleanup

**Remove** the "We may earn affiliate commission from purchases." text entirely.

**Compact the stats bar:**
- Merge item count and cart total into a single compact row: `8 items · 8 in cart` on left, cart total on right
- Remove the separate "Cart total" sub-row — just show one line
- Smaller font sizes (10-11px)
- Add a "Add all to retailer carts" button in the stats bar when cart items exist — groups items by `retailer_domain`, opens each store tab and triggers add-to-cart automation per store

**Icon-only bottom nav** — replace "Session", "Showroom", "Profile" text with:
- **Clock/list icon** — Session
- **Grid/sparkle icon** — Showroom  
- **User icon** — Profile

Small SVG icons, active state uses `text-foreground`, inactive uses `text-muted-foreground`.

### 6. Bulk "Add all to retailer carts" logic

New handler `handleAddAllToRetailerCart`:
1. Groups `cartItems` by `retailer_domain`
2. For each domain group, sends `CARTIFY_ADD_TO_RETAILER_CART` messages sequentially (one per product URL)
3. Shows progress toast: "Adding to 3 stores..."
4. Shows completion toast with count

### Files changed

- **`extension/src/shared/CartifyApp.tsx`** — All UI changes: hover icons, remove checkmark, lightbox state, compact bottom bar, icon nav, bulk retailer cart button
- **`extension/src/content/ui.ts`** — No changes needed (product page behavior is already correct)
- **`extension/src/content/index.ts`** — Verify product page logic is correct (it already is)

### Technical details

- Lightbox is a simple `position: fixed` overlay within the extension component, not a new screen
- Icon buttons use inline SVG (hanger, trash, maximize-2 from Lucide icon paths)
- Nav icons use inline SVG (clock, grid, user from Lucide)
- Bulk retailer cart iterates with 500ms delay between stores to avoid race conditions

