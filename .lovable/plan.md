## Fix Add-to-Cart Flow, Variant Extraction, Image & Price Scraping + Auto Coupon Discovery

### Status: IMPLEMENTED

All 6 areas have been implemented:

1. **Variant extraction** — opens background tabs when no matching tab exists, retries 3x with 1.5s delay, closes tab after
2. **Variant selection required** — Skip button removed, Confirm disabled until size/color selected (when options available)
3. **Add-to-cart automation** — pending carts stored as array keyed by tabId, tabs auto-close 2s after successful add-to-cart
4. **Image extraction** — JSON-LD Product.image as top priority, `<picture>`/`srcset` parsing, product-specific selectors, filtered largest image fallback
5. **Price extraction** — added money/amount/price__amount/data-qa selectors, aria-label scanning, short text node fallback
6. **Auto coupon discovery** — new `scrape-coupons` edge function scrapes RetailMeNot/CouponFollow, uses Gemini Flash to extract codes, caches 24h in retailer_coupons
