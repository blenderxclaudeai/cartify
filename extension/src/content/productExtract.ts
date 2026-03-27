import type { ProductData } from "@ext/lib/types";

function getMeta(property: string): string | null {
  const el =
    document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`) ??
    document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`);
  return el?.content?.trim() || null;
}

function scrapeImage(): string | null {
  const ogImage = getMeta("og:image");
  if (ogImage) return ogImage;
  const twImage = getMeta("twitter:image");
  if (twImage) return twImage;

  let largest: HTMLImageElement | null = null;
  let largestArea = 0;
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const area = img.naturalWidth * img.naturalHeight;
    if (area > largestArea && img.src && !img.src.startsWith("data:")) {
      largestArea = area;
      largest = img;
    }
  });
  return largest ? (largest as HTMLImageElement).src : null;
}

function scrapeTitle(): string {
  return getMeta("og:title") ?? getMeta("twitter:title") ?? document.title ?? "";
}

// ── Price extraction ──

/** Extract a clean price string from raw text, e.g. "$49.99", "199 kr", "€29,90" */
function cleanPrice(raw: string): string | null {
  // Match common price patterns: $49.99, SEK 1 299, 1.299,00 kr, €29,90
  const match = raw.match(
    /(?:[\$€£¥₹]\s?\d[\d\s,.]*\d|\b(?:USD|EUR|SEK|NOK|DKK|GBP|CAD|AUD|CHF|JPY|INR|KR)\s?\d[\d\s,.]*\d|\d[\d\s,.]*\d\s?(?:kr|usd|eur|sek|nok|dkk|gbp|cad|aud|chf|jpy|inr))/i
  );
  if (match) return match[0].trim();

  // Simpler: just a currency symbol followed by digits
  const simple = raw.match(/[\$€£¥₹]\s?\d+[.,]?\d{0,2}/);
  if (simple) return simple[0].trim();

  // Digits with decimal/comma that look like prices
  const digits = raw.match(/\d[\d\s,.]*[.,]\d{2}/);
  if (digits) return digits[0].trim();

  return null;
}

/** Scrape price with priority chain: JSON-LD → Microdata → Meta → CSS selectors */
function scrapePrice(): string | null {
  // 1. JSON-LD
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of jsonLdScripts) {
    try {
      const data = JSON.parse(s.textContent || "");
      const price = extractPriceFromJsonLd(data);
      if (price) return price;
    } catch { /* ignore */ }
  }

  // 2. Microdata — [itemprop="price"]
  const priceEl = document.querySelector('[itemprop="price"]');
  if (priceEl) {
    const val =
      (priceEl as HTMLElement).getAttribute("content") ||
      (priceEl as HTMLElement).textContent?.trim();
    if (val) {
      const currencyEl = document.querySelector('[itemprop="priceCurrency"]');
      const currency = currencyEl?.getAttribute("content") || currencyEl?.textContent?.trim() || "";
      const cleaned = cleanPrice(val) || val.trim();
      if (cleaned) return currency ? `${currency} ${cleaned}` : cleaned;
    }
  }

  // 3. Meta tags
  for (const prop of ["product:price:amount", "og:price:amount"]) {
    const amount = getMeta(prop);
    if (amount) {
      const currency = getMeta("product:price:currency") || getMeta("og:price:currency") || "";
      return currency ? `${currency} ${amount}` : amount;
    }
  }

  // 4. CSS selectors — common price patterns on retailer sites
  const priceSelectors = [
    "[data-price]",
    "[data-testid*='price' i]",
    "[id*='price' i]",
    "[class*='product-price'] [class*='current']",
    "[class*='product-price'] [class*='sale']",
    "[class*='product-price']",
    "[class*='ProductPrice']",
    "[class*='productPrice']",
    "[class*='price-current']",
    "[class*='price--current']",
    "[class*='sale-price']",
    "[class*='salePrice']",
    "[class*='current-price']",
    "[class*='Price'] [class*='current']",
    "[class*='Price'] [class*='sale']",
    ".price .now",
    ".price-box .price",
    "[class*='price'] [class*='now']",
    "[class*='price']",
  ];

  for (const sel of priceSelectors) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        // Check data-price attribute first
        const dataPrice = el.getAttribute("data-price");
        if (dataPrice) {
          const cleaned = cleanPrice(dataPrice);
          if (cleaned) return cleaned;
        }

        const text = el.textContent?.trim();
        if (text) {
          const cleaned = cleanPrice(text);
          if (cleaned) return cleaned;
        }
      }
    } catch { /* invalid selector, skip */ }
  }

  // 5. Broad attribute fallback (for modern component-based storefronts)
  const fallbackNodes = document.querySelectorAll<HTMLElement>(
    "[data-price], [data-testid*='price' i], [aria-label*='price' i], [class*='price' i], [id*='price' i]"
  );
  for (const node of Array.from(fallbackNodes).slice(0, 120)) {
    const candidate = [
      node.getAttribute("data-price") || "",
      node.getAttribute("aria-label") || "",
      node.textContent || "",
    ]
      .join(" ")
      .trim();
    if (!candidate) continue;
    const cleaned = cleanPrice(candidate);
    if (cleaned) return cleaned;
  }

  return null;
}

/** Recursively extract price from JSON-LD data (handles @graph, arrays, nested offers) */
function extractPriceFromJsonLd(data: any): string | null {
  if (!data) return null;

  // Handle @graph arrays
  if (data["@graph"]) {
    for (const item of Array.isArray(data["@graph"]) ? data["@graph"] : [data["@graph"]]) {
      const p = extractPriceFromJsonLd(item);
      if (p) return p;
    }
  }

  // Handle arrays
  if (Array.isArray(data)) {
    for (const item of data) {
      const p = extractPriceFromJsonLd(item);
      if (p) return p;
    }
    return null;
  }

  // Check if this is a Product type
  const type = data["@type"];
  const isProduct =
    type === "Product" ||
    (Array.isArray(type) && type.includes("Product"));

  if (isProduct && data.offers) {
    const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
    for (const offer of offers) {
      const price = offer.price ?? offer.lowPrice ?? offer.highPrice;
      if (price != null) {
        const currency = offer.priceCurrency || "";
        const priceStr = String(price);
        return currency ? `${currency} ${priceStr}` : priceStr;
      }
    }
  }

  return null;
}

/** Detect product category from page signals */
function detectCategory(): string | undefined {
  const text = (
    (getMeta("og:title") ?? "") +
    " " +
    document.title +
    " " +
    (getMeta("og:description") ?? "") +
    " " +
    (getMeta("description") ?? "")
  ).toLowerCase();

  // Check JSON-LD for product category hints
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  let jsonLdText = "";
  jsonLdScripts.forEach((s) => {
    try {
      const data = JSON.parse(s.textContent || "");
      const cat = data?.category || data?.productGroupID || "";
      jsonLdText += " " + (typeof cat === "string" ? cat : JSON.stringify(cat));
    } catch { /* ignore */ }
  });

  // Scrape breadcrumbs for extra category signals
  const breadcrumbs = document.querySelectorAll(
    '[class*="breadcrumb"] a, nav[aria-label*="bread"] a, nav[aria-label*="Bread"] a, ol li a'
  );
  let breadcrumbText = "";
  breadcrumbs.forEach((a) => { breadcrumbText += " " + (a.textContent || ""); });

  const combined = (text + " " + jsonLdText + " " + breadcrumbText).toLowerCase();

  const patterns: [RegExp, string][] = [
    [/\b(ring|rings|engagement ring|wedding band|ringar|förlovningsring)\b/, "ring"],
    [/\b(bracelet|bangle|wristband|watch|watches|armband|klocka|montre|reloj|Uhr|Armband)\b/, "bracelet"],
    [/\b(necklace|pendant|chain|choker|halsband|collier|Halskette|Kette|collar)\b/, "necklace"],
    [/\b(earring|earrings|studs|hoops|örhängen|örhänge|boucles d'oreilles|Ohrringe|pendientes)\b/, "earring"],
    [/\b(nail polish|nail art|manicure|press.on nails|nagellack|naglar)\b/, "nails"],
    [/\b(glasses|sunglasses|eyeglasses|eyewear|frames|glasögon|solglasögon|lunettes|Brille|Sonnenbrille|gafas)\b/, "glasses"],
    [/\b(hat|cap|beanie|headband|headwear|mössa|hatt|keps|chapeau|Mütze|Hut|sombrero|gorro)\b/, "hat"],
    [/\b(hair|wig|hair extension|hair clip|hairpin|peruk|hårförlängning)\b/, "hair"],
    [/\b(underwear|boxers|briefs|lingerie|panties|bra|underkläder|kalsonger|trosor|bh|sous-vêtements|Unterwäsche)\b/, "bottom"],
    [/\b(swimwear|bikini|swim trunks|badkläder|baddräkt|bikini|Badeanzug|Badehose)\b/, "bottom"],
    [/\b(shirt|blouse|top|t.shirt|tee|hoodie|sweater|jacket|coat|blazer|vest|tröja|jacka|kappa|skjorta|blus|väst|chemise|veste|manteau|Hemd|Jacke|Mantel|camisa|chaqueta|abrigo)\b/, "top"],
    [/\b(dress|gown|romper|jumpsuit|klänning|robe|Kleid|vestido)\b/, "dress"],
    [/\b(pants|trousers|jeans|shorts|skirt|leggings|byxor|kjol|pantalon|jupe|Hose|Rock|pantalones|falda)\b/, "bottom"],
    [/\b(shoe|shoes|sneakers|boots|sandals|heels|loafers|footwear|skor|stövlar|sandaler|chaussures|bottes|Schuhe|Stiefel|zapatos|botas)\b/, "shoes"],
    [/\b(socks|stockings|strumpor|sockor|chaussettes|Socken|calcetines)\b/, "shoes"],
    [/\b(bag|handbag|purse|backpack|tote|clutch|väska|ryggsäck|sac|Tasche|Rucksack|bolso|mochila)\b/, "bag"],
  ];

  for (const [regex, category] of patterns) {
    if (regex.test(combined)) return category;
  }

  return undefined;
}

export interface ProductVariants {
  sizes: string[];
  colors: string[];
}

/** Extract available variant options (sizes, colors) from JSON-LD, microdata, and DOM */
export function extractVariants(): ProductVariants {
  const sizes = new Set<string>();
  const colors = new Set<string>();

  // 1. JSON-LD: Product → offers → availability variants
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of jsonLdScripts) {
    try {
      const data = JSON.parse(s.textContent || "");
      extractVariantsFromJsonLd(data, sizes, colors);
    } catch { /* ignore */ }
  }

  // 2. DOM: common size selectors
  if (sizes.size === 0) {
    extractSizesFromDom(sizes);
  }

  // 3. DOM: common color selectors
  if (colors.size === 0) {
    extractColorsFromDom(colors);
  }

  return {
    sizes: Array.from(sizes),
    colors: Array.from(colors),
  };
}

function extractVariantsFromJsonLd(data: any, sizes: Set<string>, colors: Set<string>): void {
  if (!data) return;

  if (Array.isArray(data)) {
    data.forEach((d) => extractVariantsFromJsonLd(d, sizes, colors));
    return;
  }

  if (data["@graph"]) {
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data["@graph"]];
    graph.forEach((d: any) => extractVariantsFromJsonLd(d, sizes, colors));
    return;
  }

  const type = data["@type"];
  const isProduct = type === "Product" || type === "ProductGroup" ||
    (Array.isArray(type) && (type.includes("Product") || type.includes("ProductGroup")));

  if (!isProduct) return;

  // Check hasVariant (schema.org ProductGroup pattern)
  if (data.hasVariant) {
    const variants = Array.isArray(data.hasVariant) ? data.hasVariant : [data.hasVariant];
    for (const v of variants) {
      if (v.size) sizes.add(String(v.size).trim());
      if (v.color) colors.add(String(v.color).trim());
      // additionalProperty pattern
      if (v.additionalProperty) {
        const props = Array.isArray(v.additionalProperty) ? v.additionalProperty : [v.additionalProperty];
        for (const p of props) {
          const name = (p.name || "").toLowerCase();
          const val = String(p.value || "").trim();
          if (!val) continue;
          if (name.includes("size") || name === "taille" || name === "größe" || name === "storlek") sizes.add(val);
          if (name.includes("color") || name.includes("colour") || name === "couleur" || name === "farbe" || name === "färg") colors.add(val);
        }
      }
    }
  }

  // Check offers for variant info
  if (data.offers) {
    const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
    for (const offer of offers) {
      if (offer.size) sizes.add(String(offer.size).trim());
      if (offer.color) colors.add(String(offer.color).trim());
      // itemOffered may contain variant info
      if (offer.itemOffered) {
        const item = offer.itemOffered;
        if (item.size) sizes.add(String(item.size).trim());
        if (item.color) colors.add(String(item.color).trim());
      }
    }
  }

  // Direct size/color on Product
  if (data.size) {
    const s = Array.isArray(data.size) ? data.size : [data.size];
    s.forEach((v: any) => sizes.add(String(v).trim()));
  }
  if (data.color) {
    const c = Array.isArray(data.color) ? data.color : [data.color];
    c.forEach((v: any) => colors.add(String(v).trim()));
  }

  // additionalProperty on Product level
  if (data.additionalProperty) {
    const props = Array.isArray(data.additionalProperty) ? data.additionalProperty : [data.additionalProperty];
    for (const p of props) {
      const name = (p.name || "").toLowerCase();
      const val = String(p.value || "").trim();
      if (!val) continue;
      if (name.includes("size")) sizes.add(val);
      if (name.includes("color") || name.includes("colour")) colors.add(val);
    }
  }
}

const SIZE_SELECTORS = [
  "select[name*='size' i]",
  "select[id*='size' i]",
  "select[data-testid*='size' i]",
  "select[aria-label*='size' i]",
  "[data-testid*='size' i] select",
  "[class*='size' i] select",
];

const COLOR_SELECTORS = [
  "select[name*='color' i]", "select[name*='colour' i]",
  "select[id*='color' i]", "select[id*='colour' i]",
  "select[aria-label*='color' i]", "select[aria-label*='colour' i]",
  "[data-testid*='color' i] select", "[data-testid*='colour' i] select",
  "[class*='color' i] select", "[class*='colour' i] select",
];

function extractSizesFromDom(sizes: Set<string>): void {
  // Select dropdowns
  for (const sel of SIZE_SELECTORS) {
    const elems = document.querySelectorAll<HTMLSelectElement>(sel);
    for (const select of elems) {
      for (const opt of select.options) {
        const val = opt.text.trim();
        if (val && !opt.disabled && val !== "" && !/select|choose|pick|välj|wähle/i.test(val)) {
          sizes.add(val);
        }
      }
      if (sizes.size > 0) return;
    }
  }

  // Button/radio groups labeled "size"
  const sizeContainers = document.querySelectorAll<HTMLElement>(
    "[class*='size' i][class*='selector' i], [class*='size' i][class*='option' i], [class*='size' i][class*='picker' i], [data-testid*='size' i], fieldset[class*='size' i], [role='radiogroup'][aria-label*='size' i]"
  );
  for (const container of sizeContainers) {
    const btns = container.querySelectorAll<HTMLElement>("button, [role='radio'], label, a[data-value]");
    for (const btn of btns) {
      const text = (btn.textContent || "").trim();
      if (text && text.length < 20 && !/size guide|storleksguide/i.test(text)) {
        sizes.add(text);
      }
    }
    if (sizes.size > 0) return;
  }
}

function extractColorsFromDom(colors: Set<string>): void {
  // Select dropdowns
  for (const sel of COLOR_SELECTORS) {
    const elems = document.querySelectorAll<HTMLSelectElement>(sel);
    for (const select of elems) {
      for (const opt of select.options) {
        const val = opt.text.trim();
        if (val && !opt.disabled && val !== "" && !/select|choose|pick|välj|wähle/i.test(val)) {
          colors.add(val);
        }
      }
      if (colors.size > 0) return;
    }
  }

  // Button/radio groups labeled "color"
  const colorContainers = document.querySelectorAll<HTMLElement>(
    "[class*='color' i][class*='selector' i], [class*='color' i][class*='option' i], [class*='colour' i][class*='selector' i], [class*='colour' i][class*='option' i], [class*='color' i][class*='picker' i], [data-testid*='color' i], [data-testid*='colour' i], fieldset[class*='color' i], [role='radiogroup'][aria-label*='color' i]"
  );
  for (const container of colorContainers) {
    const btns = container.querySelectorAll<HTMLElement>("button, [role='radio'], label, a[data-value]");
    for (const btn of btns) {
      const text = (btn.textContent || "").trim();
      const ariaLabel = btn.getAttribute("aria-label")?.trim();
      const title = btn.getAttribute("title")?.trim();
      const val = ariaLabel || title || text;
      if (val && val.length < 40) {
        colors.add(val);
      }
    }
    if (colors.size > 0) return;
  }
}

export function extractProduct(): ProductData {
  return {
    product_url: location.href,
    product_title: scrapeTitle(),
    product_image: scrapeImage() ?? "",
    product_category: detectCategory(),
    product_price: scrapePrice() ?? undefined,
    retailer_domain: location.hostname.replace(/^www\./, ""),
  };
}
