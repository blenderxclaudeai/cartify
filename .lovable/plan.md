

## Status and Plan

### Current Issues

**1. No price extraction exists.** `extractProduct()` in `productExtract.ts` returns no `product_price` field. `extractFromCard()` in `productGrid.ts` also returns no price. This means every session item has `null` price, the summary total always shows `$0.00`, and the "You saved" feature has no data.

**2. Coupon table is empty.** The code queries `retailer_coupons` correctly, but the table has zero rows. The system works — it just has no data.

**3. `retailer_domain` is never set during extraction.** The `ProductData` type has an optional `retailer_domain` field, but neither extractor sets it. It only gets set in the background script from the URL.

### Plan

#### 1. Add price extraction to `productExtract.ts`

Add a `scrapePrice()` function with this priority chain:
1. **JSON-LD** — parse `script[type="application/ld+json"]` for `offers.price` / `offers.lowPrice`
2. **Microdata** — `[itemprop="price"]` content or text
3. **Meta tags** — `product:price:amount`, `og:price:amount`
4. **CSS selectors** — common price class patterns: `[class*="price"] [class*="current"]`, `[class*="product-price"]`, `[data-price]`, `[class*="Price"]`
5. **Currency detection** — also extract `priceCurrency` from JSON-LD/microdata for display

Also set `retailer_domain: location.hostname.replace(/^www\./, "")` in the return value.

#### 2. Add price extraction to `productGrid.ts` `extractFromCard()`

Add a `scrapeCardPrice(card)` function that looks within the card element for:
- `[class*="price"]` elements
- `[data-price]` attributes
- Text matching currency patterns like `$XX.XX`, `XX,XX kr`, `€XX`

Return as `product_price` in the `ProductData`.

#### 3. Insert test coupon data

Use the insert tool to add ~10 rows to `retailer_coupons` for domains: `zara.com`, `hm.com`, `asos.com`, `nike.com`, `adidas.com`, `uniqlo.com`, `mango.com` with realistic codes and discount values.

### Files Changed

| File | Change |
|------|--------|
| `extension/src/content/productExtract.ts` | Add `scrapePrice()`, set `retailer_domain`, include `product_price` in return |
| `extension/src/content/productGrid.ts` | Add `scrapeCardPrice()`, include `product_price` in `extractFromCard()` return |
| Database: `retailer_coupons` | Insert ~10 test coupon rows via insert tool |

