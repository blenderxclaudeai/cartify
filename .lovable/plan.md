

## Problem

The extension source code has the multilingual category patterns, but the **compiled Chrome extension** the user is running hasn't been rebuilt — so it's still sending `category: undefined`. The edge function logs confirm: `Category received: "undefined"`, causing it to default to wearable/full_body mode and use the person photo instead of the living room photo.

Even after rebuilding, relying solely on the extension for category detection is fragile — if the extension ever fails to detect, the backend has no fallback.

## Fix: Add server-side category fallback

**File:** `supabase/functions/tryon-request/index.ts`

Add a `detectCategoryFromTitle(title, url)` function in the edge function that runs the same keyword matching against the product title and URL when the extension doesn't provide a category. This makes the system resilient regardless of extension version.

### Changes

1. **Add `detectCategoryFromTitle()` function** — same multilingual regex patterns as the extension, matching against the title and URL path
2. **Update category resolution logic** — use `category || detectCategoryFromTitle(title, pageUrl)` instead of just `category`
3. **Redeploy** the edge function

### Key code addition (in edge function, before the category mapping logic):

```typescript
function detectCategoryFromTitle(title: string, url: string): string | undefined {
  const combined = ((title || "") + " " + (url || "")).toLowerCase();
  
  const patterns: [RegExp, string][] = [
    // Same multilingual patterns as extension...
    [/\b(sofa|soffa|soffor|sitssoffa|soffgrupp|couch|...)\b/, "living_room"],
    [/\b(bed|säng|sängar|madrass|...)\b/, "bedroom"],
    // ... all patterns
  ];
  
  for (const [regex, cat] of patterns) {
    if (regex.test(combined)) return cat;
  }
  return undefined;
}
```

Then update line 86:
```typescript
const effectiveCategory = category || detectCategoryFromTitle(title, pageUrl);
const requiredPhotoCategory = effectiveCategory ? (CATEGORY_TO_PHOTO[effectiveCategory] || "full_body") : "full_body";
```

### Files to change
- `supabase/functions/tryon-request/index.ts` — add server-side category detection fallback + redeploy

