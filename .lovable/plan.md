

## Plan: Shopping Session, Cart, Showroom Fixes

This is a large feature set. Here's a phased plan covering all items.

---

### Bug Fix: Share fallback

The `handleShare` in both `CartifyApp.tsx` and `Showroom.tsx` catches errors but shows "Couldn't share — try downloading instead" when both `navigator.share` and clipboard fail. In extension contexts, clipboard write often fails due to permissions. Fix: always attempt download as the final fallback instead of just showing a toast.

**Files:** `extension/src/shared/CartifyApp.tsx`, `src/pages/Showroom.tsx`

---

### Showroom Image Loading

Images load slowly because `result_image_url` points to external URLs. Add `loading="lazy"` to images and show a placeholder skeleton while loading. No backend change needed.

**Files:** `extension/src/shared/CartifyApp.tsx`, `src/pages/Showroom.tsx`

---

### Daily Showroom Reset

Create a scheduled edge function `cleanup-daily` that runs once per day and deletes `tryon_requests` older than 24 hours. Use a PostgreSQL cron job via `pg_cron` or a Supabase scheduled function.

**DB Migration:**
```sql
-- No new table needed, just the edge function + a cron trigger
-- Alternative: use a DB function + pg_cron
CREATE OR REPLACE FUNCTION public.cleanup_old_tryons()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.tryon_requests
  WHERE created_at < now() - interval '24 hours';
$$;
```

**New file:** `supabase/functions/cleanup-daily/index.ts` — called via scheduled invocation or a simple cron.

---

### New DB Tables: Shopping Sessions + Session Items

```sql
-- Shopping sessions: one active session per user per day
CREATE TABLE public.shopping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
ON public.shopping_sessions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Session items: products the user interacted with
CREATE TABLE public.session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.shopping_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url text NOT NULL,
  product_title text,
  product_image text,
  product_price text,
  retailer_domain text,
  interaction_type text NOT NULL DEFAULT 'viewed',
  -- interaction_type: 'viewed', 'saved', 'cart', 'tryon_requested', 'tryon_completed'
  in_cart boolean NOT NULL DEFAULT false,
  tryon_request_id uuid REFERENCES public.tryon_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session items"
ON public.session_items FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable realtime for session_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_items;

-- Cleanup function: delete expired sessions and their items
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.shopping_sessions WHERE expires_at < now();
$$;
```

---

### Extension UI: New Navigation Tabs

Current nav: `Profile | Showroom`

New nav: `Session | Showroom | Profile`

**Session tab** shows:
- Active shopping session with product list grouped by interaction type
- Each item shows: image thumbnail, title, price, retailer
- Action buttons per item: "Add to Cart" (Cartify cart), "Try On", "Remove"
- Cart summary at bottom: item count + estimated total
- Items with completed try-ons show a small badge linking to showroom

**Showroom tab** stays the same but with daily reset behavior and lazy loading fix.

**Profile tab** stays the same.

**File:** `extension/src/shared/CartifyApp.tsx` — add `Screen = "session" | "showroom" | "profile" | "settings"`, default to `"session"`.

---

### Content Script: Track Interactions

When a user clicks inline Cartify button on a listing page or clicks "Try On" on a product page, the background should also create/update a `session_item` in the current shopping session.

**Changes to `extension/src/background/index.ts`:**
- New helper `ensureSession()`: GET or CREATE a `shopping_session` for today
- On `CARTIFY_TRYON_REQUEST`: after firing the try-on, also upsert a `session_item` with `interaction_type: 'tryon_requested'`
- New message type `CARTIFY_ADD_TO_CART`: creates a `session_item` with `in_cart: true`
- New message type `CARTIFY_SAVE_PRODUCT`: creates a `session_item` with `interaction_type: 'saved'`

**Changes to `extension/src/content/index.ts` + `ui.ts`:**
- On listing pages, add a second small button (cart icon) next to the Cartify try-on button on each product card
- Clicking cart button extracts product data and sends `CARTIFY_ADD_TO_CART` to background

---

### Content Script: New Card Actions

Each product card on listing pages gets two small overlaid buttons:
1. **Try On** (existing hanger icon) — queues a try-on
2. **Add to Cart** (small + icon) — adds to Cartify cart/session

Both use the same deferred extraction pattern (extract on click only).

**Files:** `extension/src/content/ui.ts`, `extension/src/content/index.ts`

---

### Web App Showroom Changes

`src/pages/Showroom.tsx`: Add daily reset awareness — show "Today's try-ons" header, explain items reset daily. Add lazy loading to images.

---

### Files Summary

| File | Change |
|------|--------|
| **DB Migration** | Create `shopping_sessions` + `session_items` tables with RLS |
| `supabase/functions/cleanup-daily/index.ts` | **New** — delete expired sessions + old tryon_requests |
| `extension/src/shared/CartifyApp.tsx` | Add Session tab, fix share fallback, lazy load images, 3-tab nav |
| `extension/src/background/index.ts` | Add `ensureSession()`, `CARTIFY_ADD_TO_CART`, `CARTIFY_SAVE_PRODUCT` handlers |
| `extension/src/content/ui.ts` | Add cart button injection alongside try-on button |
| `extension/src/content/index.ts` | Wire up cart button clicks |
| `extension/src/lib/types.ts` | Add new message types |
| `src/pages/Showroom.tsx` | Fix share fallback, lazy load images, daily reset header |

### Build Order

1. DB migration (tables + RLS + cleanup function)
2. Fix share bug + image lazy loading (quick wins)
3. Background: session management + new message handlers
4. Extension UI: Session tab + 3-tab nav
5. Content script: cart button on listing cards
6. Cleanup edge function

