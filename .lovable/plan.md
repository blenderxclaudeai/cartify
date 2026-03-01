

## Build the Chrome Extension

The React app is already designed as a 400x600 popup. Here's the plan to turn it into a fully functional Chrome Manifest V3 extension.

### New files to create

**`public/manifest.json`** -- Manifest V3 config:
- `manifest_version: 3`, name "VTO", version "1.0.0"
- `action.default_popup: "index.html"` (the built React app)
- `permissions: ["activeTab", "storage"]`
- `content_scripts` matching all URLs, injecting `content.js`
- `background.service_worker: "background.js"`
- Icon placeholders (16, 48, 128)

**`src/extension/content.ts`** -- Content script (plain TS, no React):
- Scrapes product data from the current page (OpenGraph meta tags first, fallback to largest image, title, price)
- Injects a floating "Try On" button on product pages
- On click, sends product data to the background script via `chrome.runtime.sendMessage`
- Styled with inline CSS (no Tailwind available in content scripts)

**`src/extension/background.ts`** -- Background service worker:
- Listens for messages from content script
- Stores product data in `chrome.storage.local`
- Opens the popup or passes data to it when requested

**`vite.config.extension.ts`** -- Separate Vite config for extension scripts:
- Builds `content.ts` and `background.ts` as IIFE bundles (not ES modules) into `dist/`
- No React, no Tailwind -- plain TS only

**`public/icons/`** -- Placeholder icon PNGs (icon16, icon48, icon128)

### Files to modify

**`src/App.tsx`** -- Router swap:
- Detect extension context via `typeof chrome !== "undefined" && chrome.runtime?.id`
- Use `MemoryRouter` instead of `BrowserRouter` when inside extension popup
- Extension popups don't have a URL bar, so `BrowserRouter` breaks navigation

**`src/pages/Showroom.tsx`** -- Receive product data from extension:
- On mount, check `chrome.storage.local` for pending product data sent by the content script
- If found, auto-trigger a try-on request and clear the stored data
- This connects the "Try On" button on retailer pages to the popup's Showroom

**`package.json`** -- New build script:
- `"build:extension"`: runs the normal `vite build` plus builds content/background scripts with the extension vite config, then copies `manifest.json` into `dist/`

### How it works end-to-end

```text
User on retailer site
  → Content script scrapes product (image, title, price, URL)
  → Floating "Try On" button appears
  → Click → sends data to background.ts
  → background.ts stores in chrome.storage.local, opens popup
  → Popup (React app) loads, Showroom reads stored product
  → Calls tryon-request edge function
  → Result displayed in Showroom
  → "Add to Cart" → affiliate redirect back to retailer
```

### Technical notes
- Content scripts and background workers MUST be plain JS/TS (no JSX, no imports from React). They need a separate build step
- The popup is just the normal React build (`dist/index.html`)
- Auth tokens persist in `chrome.storage.local` -- the existing Supabase client already uses `localStorage`, which works in extension popups
- No database changes needed

