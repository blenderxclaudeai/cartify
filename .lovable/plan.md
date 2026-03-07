

## Plan: Expanded Profile Categories, Session Total Widget, Coupon System

### 1. Expand Profile Photo Categories

The current `photo_category` enum covers: `full_body`, `face`, `hair`, `hands_wrist`, `hands`, `fingers`, `nails`, `ears`, plus home/pet/vehicle categories.

**Add new body part categories** via DB migration:

```sql
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'upper_body';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lower_body';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'feet';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'eyes';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lips';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'brows';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'arms';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'back';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'lower_back';
ALTER TYPE photo_category ADD VALUE IF NOT EXISTS 'head';
```

Note: `upper_body` may already exist in the enum from prior work — will use `IF NOT EXISTS`.

**Update both UIs** (`CartifyApp.tsx` CATEGORIES array and `Profile.tsx` CATEGORY_GROUPS):
- Reorganize the "You" group into subgroups:
  - **Body**: Full Body, Upper Body, Lower Body, Back, Lower Back, Arms
  - **Head**: Head, Face, Eyes, Lips, Brows, Hair, Ears
  - **Extremities**: Hands, Fingers, Nails, Feet

- Remove Home, Pets, Vehicle, Garden groups from `Profile.tsx` (per the earlier product decision to focus on wearables only). The extension `CartifyApp.tsx` already only uses the flat CATEGORIES array — expand it to match.

**Update `tryon-request/index.ts`**:
- Add new mappings in `CATEGORY_TO_PHOTO` (e.g., `shoes` → `feet`, `pants/leggings` → `lower_body`)
- Add new detection patterns for categories like `eyes` (contact lenses, eye makeup), `lips` (lipstick), `brows` (brow products), `feet` (socks, shoes), `back` (backless dresses)

### 2. Session Page: Total Cost Widget

Add a sticky bottom bar to the Session screen showing estimated total cost of all session items (not just cart items).

**Changes to `CartifyApp.tsx`**:
- Compute `sessionTotal` from all `sessionItems` with parseable prices
- Add a fixed bar above the bottom nav when on Session screen:
  ```
  ┌──────────────────────────────────┐
  │  Total · 5 items      ~$243.50  │
  └──────────────────────────────────┘
  ```
- Show individual `product_price` more prominently on each session item card (already partially there but small — make it more visible)

### 3. Coupon/Deal Discovery System

Instead of showing a product banner when clicking a product, show a **coupon/deal widget** in the extension panel when the user is on a supported retailer.

**New DB table: `retailer_coupons`**

```sql
CREATE TABLE public.retailer_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text DEFAULT 'percentage',
  discount_value text,
  min_purchase text,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.retailer_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
ON public.retailer_coupons FOR SELECT TO authenticated
USING (is_active = true);
```

**Content script change**: When the user is on a retailer page, send a `CARTIFY_CHECK_COUPONS` message to background with the domain.

**Background handler**: Query `retailer_coupons` for the domain. If coupons exist, store them in `chrome.storage.local` under `cartify_active_coupons`.

**Extension UI**: Show a small "Deals available" banner at the top of the Session tab when coupons exist for the current retailer. User can tap to reveal codes and copy them. This keeps users in the Cartify ecosystem and creates an affiliate engagement point.

**How this helps monetization**: Coupon codes can be sourced from affiliate networks (Awin, Impact). When a user applies a coupon through Cartify, the affiliate click is already tracked, earning commission on the purchase.

### 4. Remove Pending Product Banner

The current "pending product" banner with "Try On" button becomes less relevant with the inline card buttons. Keep it for now but deprioritize — the coupon widget takes its UI slot.

---

### Files Summary

| File | Change |
|------|--------|
| **DB Migration** | Add ~10 new `photo_category` enum values + `retailer_coupons` table |
| `extension/src/shared/CartifyApp.tsx` | Expand CATEGORIES, add session total bar, add coupon banner, reorganize profile grid |
| `src/pages/Profile.tsx` | Expand CATEGORY_GROUPS to match new body parts, remove non-wearable groups |
| `supabase/functions/tryon-request/index.ts` | Add new category→photo mappings + detection patterns |
| `extension/src/lib/types.ts` | Add `CARTIFY_CHECK_COUPONS` message type |
| `extension/src/background/index.ts` | Add coupon check handler |
| `extension/src/content/index.ts` | Send coupon check on page load |

### Build Order

1. DB migration (new enum values + retailer_coupons table)
2. Expand profile categories in both UIs
3. Update tryon-request mappings
4. Add session total widget
5. Add coupon system (background + UI)

