

## Extension Status Assessment

### What's working (structurally complete)
- **Manifest V3** is correctly configured with permissions, popup, content script, and background worker
- **Content script** scrapes product data (OG tags, images, title, price) and shows a floating "Try On" button
- **Background worker** stores product data in `chrome.storage.local` for the popup to read
- **App.tsx** correctly detects extension context and uses `MemoryRouter`
- **Showroom** reads pending product data from `chrome.storage.local` and auto-triggers try-on
- **Redirect edge function** handles affiliate link generation with merchant template lookup
- **Database tables** (`tryon_requests`, `click_events`, `affiliate_merchants`) exist with RLS

### What's NOT working / missing

#### 1. No `build:extension` script in package.json
The `vite.config.extension.ts` exists but there's no npm script to actually run it. You can't build the extension without manually running Vite commands. Need to add:
```
"build:extension": "vite build && vite build --config vite.config.extension.ts && vite build --config vite.config.extension.ts --mode background"
```
The current extension config only exports `contentConfig` as default -- it can't build both `content.js` and `background.js` in one pass since IIFE doesn't support multiple entries.

#### 2. The try-on AI is a mock placeholder
`tryon-request/index.ts` line 38 returns a static placeholder image:
```
const resultImageUrl = `https://placehold.co/400x600/7c3aed/white?text=VTO+Try-On`;
```
There is **no actual AI model** connected. This is the core feature of the product and it doesn't work yet. You'd need to integrate a virtual try-on model (like IDM-VTON, OOTDiffusion, or a hosted API) that takes the user's photo + product image and composites them.

#### 3. Affiliate network not configured
You mentioned this -- no Awin or Impact integration yet. The `redirect` function looks up `affiliate_merchants` table but it's empty, so all redirects just go to the raw retailer URL with no tracking/commission.

#### 4. Auth uses `getClaims()` which doesn't exist
In `tryon-request/index.ts` line 24:
```typescript
const { data } = await supabase.auth.getClaims(token);
```
This method doesn't exist on the Supabase JS client. It should be `supabase.auth.getUser()` with the token passed via the Authorization header. This will crash on every authenticated request.

#### 5. Content script shows on EVERY page
The content script injects on `<all_urls>` and only skips if no image is found. This means on pages like Google, YouTube, Wikipedia, etc., a "Try On" button will appear next to the largest image. Needs smarter detection of actual product/e-commerce pages.

#### 6. Chrome Web Store requirements for publishing
To actually publish, you also need:
- **Privacy policy** (required by Chrome Web Store)
- **Proper icon assets** (current ones are generated placeholders)
- **Store listing** screenshots and description
- A **developer account** ($5 one-time fee on Chrome Web Store)

### Summary: What needs to happen before it works

| Item | Effort | Status |
|------|--------|--------|
| Add `build:extension` npm script | Small | Missing |
| Fix `getClaims()` → `getUser()` in tryon-request | Small | Broken |
| Integrate real AI try-on model | Large | Mock only |
| Configure affiliate network (Awin/Impact) | Medium | Not started |
| Smarter product page detection in content script | Medium | Too aggressive |
| Chrome Web Store assets & privacy policy | Small | Missing |

### Bottom line
The **scaffolding is solid** -- manifest, content script, background worker, popup routing, database, and affiliate redirect flow are all wired up correctly. But the two core features (AI try-on and affiliate tracking) are placeholders. The auth bug in the edge function would also crash real requests.

To get to a publishable extension, we need to:
1. Fix the `getClaims` bug (quick)
2. Add the build script (quick)
3. Integrate a real try-on AI model (this is the big one)
4. Set up Awin/Impact merchant data
5. Add product-page detection heuristics to the content script

