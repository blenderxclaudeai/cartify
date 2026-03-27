

## Extension UI: Remove Try On Button, Fix Retailer Cart, Add Variant Selection

### What changes

**1. Remove floating "Try On" button on product pages**

In `extension/src/content/index.ts`, remove the `injectButton(doTryOn)` call on product-only pages (lines 246-248). The extension side panel already has try-on functionality — the floating button on the retailer page is redundant and intrusive. The login pill and listing card buttons remain unchanged.

**2. Rename "Add all to retailer carts" → "Add to cart"**

In `CartifyApp.tsx` line 1176, change the button text from "Add all to retailer carts" to "Add to cart".

**3. Fix retailer cart automation (opens page but doesn't click)**

The current flow opens the product page via the redirect edge function, then waits for `tabs.onUpdated` to fire and sends `CARTIFY_ADD_TO_RETAILER_CART` to the content script. The issue is timing — the content script may not be fully injected when the message arrives.

Fix in `extension/src/background/index.ts`: add a retry loop with delay (3 attempts, 1.5s apart) in the `tabs.onUpdated` listener before giving up. This gives the content script time to load and register its message listener.

**4. Size/color variant selection popup before adding to retailer cart**

This is the biggest change. When the user clicks "Add to cart" (the bulk button), instead of immediately opening retailer pages, show a **step-through popup** inside the extension for each cart item:

- **New state**: `variantFlow` — array of cart items to process, `variantFlowIndex` — current item index, `variantSelections` — map of item ID → user selections (size, color as free text)
- **New overlay UI** in `CartifyApp.tsx`: a modal-style overlay (similar to lightbox) showing:
  - Product image + title
  - Two text inputs: **Size** and **Color/Variant** (free text, since reliably extracting variant options from arbitrary retailers is not feasible)
  - "Skip" and "Next" buttons
  - Progress indicator ("2 of 5")
- After the user goes through all items, the extension proceeds with the existing `handleAddAllToRetailerCart` logic, but now also stores the variant selections
- The variant info is passed to the content script as `payload.variant` so it can attempt to select size/color on the retailer page before clicking "Add to Cart"

**Why free-text inputs**: Extracting size/color options