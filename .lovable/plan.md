

## Fix Plan: Syntax Error, Auto-Refresh, and Cart Total Visibility

### Problem Summary

1. **Build-breaking syntax error** in `CartifyApp.tsx` — lines 929–933 contain orphaned/duplicate JSX (a stray `>`, a duplicate SVG share button, and unmatched closing tags). This is why the extension build fails.
2. **No auto-refresh** after actions (add to cart, remove, try-on) — the UI updates local state but doesn't signal other views to refresh.
3. **Cart total widget exists** (lines 1012–1055) but is invisible because the build crashes before reaching it.

### Changes

**File: `extension/src/shared/CartifyApp.tsx`**

1. **Delete orphaned lines 929–933** — remove the duplicate JSX fragment:
   ```
   929:                           >
   930:                             <svg ...share icon duplicate...></svg>
   931:                           </button>
   932:                         </div>
   933:                       </div>
   ```
   Line 928 (`</div>`) correctly closes the showroom card. Line 934 (`))`) correctly closes the `.map()`. The lines between are garbage from a bad merge.

2. **Add auto-refresh after mutations** — extract session loading into a reusable `loadSessionItems()` function and call it after:
   - `handleToggleCart` (cart add/remove)
   - `handleRemoveSessionItem` (delete)
   - `handleTryOnSessionItem` (try-on queued)
   
   Also listen to `chrome.storage.onChanged` for `cartify_recent_tryons` to auto-refresh showroom results when a try-on completes in background.

3. **Ensure cart total is always visible** — the summary bar already renders cart total at the bottom of the Session tab. Once the syntax error is fixed, it will appear. No additional changes needed for this.

### What Becomes Visible After Fix

- Session summary bar at bottom: item count, cart count, session total, cart total
- Coupon deals banner
- Hover overlays on showroom cards
- All action buttons working and triggering UI refresh

### Technical Details

- The `loadSessionItems` function will be called both from the `useEffect` and after mutations, using the same fetch logic
- Storage listener will also trigger showroom refresh when `cartify_recent_tryons` changes
- Vite version (`^5.4.19`) and `@vitejs/plugin-react-swc` (`^3.11.0`) are compatible — no version conflict in `package.json`. The ChatGPT report about Vite 8 is incorrect for this repo.
- `lovable-tagger` (`^1.1.13`) is a dev dependency that only runs in development mode and is gated by `mode === "development"` — it won't block production builds.

