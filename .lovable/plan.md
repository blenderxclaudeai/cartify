

## Problem

The manifest declares `"default_popup": "popup.html"` but the Vite popup build outputs the file as `index.html` (Rollup preserves the original filename from `src/popup/index.html`). Chrome cannot find `popup.html` → ERR_FILE_NOT_FOUND.

## Fix

Two small changes:

1. **Rename the popup output to match the manifest.** In `extension/vite.config.ts`, add a post-build step (or Rollup plugin) that renames `dist/index.html` → `dist/popup.html` after the popup build completes. Alternatively, change the manifest to `"default_popup": "index.html"` — but `popup.html` is the clearer convention, so renaming is preferred.

2. **Remove stale root-level files.** Delete the legacy plain-JS files that sit directly in `/extension` and could mislead someone into loading the wrong folder:
   - `extension/background.js`
   - `extension/content.js`
   - `extension/index.html`

   These are old hand-written stubs; the real built files go into `extension/dist/`.

3. **Also remove the duplicate source files** `extension/src/background.ts` and `extension/src/content.ts` which are unused (the real entry points are in `extension/src/background/index.ts` and `extension/src/content/index.ts`).

No other changes needed — the manifest patterns, build pipeline, and source code are otherwise correct.

