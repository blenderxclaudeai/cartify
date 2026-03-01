

## Overview

Redesign Profile and Showroom pages to match the Login page's clean, centered card aesthetic. Remove the token copy functionality since auth is handled entirely through Google/Apple OAuth.

## Design Pattern (from Login page)

The Login page uses: centered card (`h-[600px] w-[400px]`), `rounded-2xl border`, `bg-background`, spaced sections with `justify-between`, clean typography. The ExtensionLayout already mirrors this shell — the inner content just needs refinement.

## Changes

### 1. Profile page (`src/pages/Profile.tsx`)
- **Remove** the "Copy Token" button and all token-related code (`copyToken` function, `session` from useAuth, `Copy` icon import)
- **Restructure layout** to match Login's vertical spacing style:
  - User avatar + name + email centered at top (like Login's header)
  - Photo upload grid in the middle section
  - "Sign Out" as a subtle bottom-aligned link (like Login's footer)
- Clean, minimal typography matching Login's `text-[28px]`, `text-[14px]`, `text-[11px]` scale

### 2. Showroom page (`src/pages/Showroom.tsx`)
- **Restructure** to match the same vertical rhythm:
  - Header centered with title + subtitle (matching Login's header style)
  - Content grid in the middle
  - Empty state with centered messaging matching Login's aesthetic

### 3. ExtensionLayout (`src/components/ExtensionLayout.tsx`)
- Keep the outer shell (already matches Login's container)
- Style the bottom nav tabs to feel more integrated with the minimal design

## Affiliate Integration Answer

For Awin or similar affiliate networks, the easiest approach will be:
- Store your Awin publisher ID as a backend secret
- The existing `redirect` edge function already handles affiliate link wrapping — we just need to plug in Awin's redirect URL template (e.g., `https://www.awin1.com/cread.php?awinmid=...&awinaffid=...&ued=TARGET_URL`)
- When you have your Awin account, share your publisher ID and merchant IDs, and I'll configure the redirect function

## Technical Details

- Remove imports: `Copy` from lucide-react, `session` destructuring from `useAuth`
- Remove `copyToken` function entirely
- No database or backend changes needed
- No new dependencies

