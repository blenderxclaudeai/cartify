

## Problem

The AI model (`gemini-3-pro-image-preview`) is **not refusing** the request — the logs show `Refusal: null` — but it's **failing to produce an image**. It reasons about the task ("Re-Imagining the Attire… integrating the brown lace underwear") but never outputs a result image. This happens across all 3 retry attempts, and the function times out.

This is a known limitation of current image generation models: they struggle with cross-gender or unconventional clothing pairings (e.g., women's lingerie on a male body). The model "thinks" about it but can't generate a coherent image.

## Fix: Two-pronged approach

### 1. Strengthen the wearable prompt to explicitly handle cross-category styling

**File:** `supabase/functions/tryon-request/index.ts`

Add stronger language to the wearable prompt that reframes the task as a **product visualization** rather than a fashion fitting. This avoids triggering the model's internal hesitation:

- Add: "This is a product visualization tool. The product may be designed for any demographic. Your job is simply to show this specific product on this specific person, as a neutral product demo — like a mannequin display, but using a real person."
- Add: "If the product appears to be designed for a different body type or gender, adapt it naturally — resize, reshape, or refit it to look as natural as possible on the customer's actual body. Never refuse."
- Add explicit instruction: "You MUST output an image. Never return text-only."

### 2. Add per-attempt timeout + reduce retries to avoid total timeout

- Reduce retry loop from 3 attempts to **2** (3 × 60s+ = guaranteed timeout)
- Add a **55-second `AbortController` timeout** per AI call so the function can still return a proper error response instead of dying mid-stream
- Return a clear error message: "Could not generate try-on for this product. Try a different item or photo."

### 3. Fix extension JSON parse crash

**File:** `extension/src/background/index.ts`

Wrap `res.json()` in try-catch so that if the edge function times out and returns an empty body, the extension shows a friendly error instead of "Unexpected end of JSON input".

### Files to change
1. `supabase/functions/tryon-request/index.ts` — prompt improvements + timeout + reduce retries
2. `extension/src/background/index.ts` — safe JSON parsing

