

## Fix List

### 1. Remove website Sign In
- Remove "Sign in" button from landing page nav (line 197-201) and footer (line 423-425)
- Remove `/login` route from `App.tsx` and delete `src/pages/Login.tsx`
- Auth only happens inside the Chrome extension via `chrome.identity`

### 2. Fix product image gray backgrounds
- Add `bg-white` to the product image cards in the "Try on anything" marquee section so all items render on pure white regardless of PNG transparency

### 3. Fix extension layout — sticky header/tabs, scrollable content only
Current problem: entire popup scrolls, hiding the bottom nav bar.

Restructure `Popup.tsx` logged-in layout:
- **Sign Out bar**: fixed at top (`shrink-0`)
- **Avatar + name + email**: fixed below sign out (`shrink-0`)
- **Tab buttons (You/Home/Pets...)**: fixed below profile info (`shrink-0`)
- **Photo grid / showroom content**: scrollable middle area (`flex-1 overflow-y-auto`)
- **Bottom nav (Profile/Showroom)**: fixed at bottom (`shrink-0`)
- Add `scrollbar-hide` to the scrollable area (already in CSS)
- Remove any outer `overflow-y-auto` from the wrapper

### 4. Hide scrollbar in extension
- The extension popup CSS already has `.scrollbar-hide` utility but it's only applied to the content div — ensure it's also hiding the native scrollbar with `scrollbar-width: none` on the body/root in `popup.css`

### 5. Match extension design to website
- Tab buttons: use the same pill style as the website's `TabsTrigger` — lighter, with `rounded-lg` borders matching the landing page aesthetic
- Sign Out text: move into a subtle settings area (top-right, smaller, ghost style matching website nav)
- Upload cards: ensure dashed borders and hover states match the website Profile page exactly
- Use consistent spacing, font sizes, and border radius values

### 6. Extension auth — ensure chrome.identity flow works
The extension already uses `chrome.identity.launchWebAuthFlow` in `extension/src/lib/auth.ts`. The issue may be that clicking sign-in in the extension popup somehow navigates to the web app login page. Review `handleOAuth` in Popup.tsx — it correctly calls `signInWithOAuth` from the extension auth lib, so this should work. No code change needed here unless there's a redirect issue in the OAuth config.

### Files to change
- `src/pages/LandingPage.tsx` — remove Sign In links, add `bg-white` to product cards
- `src/App.tsx` — remove `/login` route
- `extension/src/popup/Popup.tsx` — restructure layout with sticky sections, improve design consistency
- `extension/src/popup/popup.css` — add scrollbar hiding to body
- Delete `src/pages/Login.tsx`

