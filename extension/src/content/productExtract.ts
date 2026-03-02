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

  // Category keyword matching — order matters (most specific first)
  // Includes multilingual keywords (Swedish, German, French, Spanish, Italian, Dutch)
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
    // Furniture / living room — multilingual + IKEA-specific terms
    [/\b(sofa|soffa|soffor|sitssoffa|soffgrupp|couch|armchair|fåtölj|fåtöljer|coffee table|soffbord|side table|sidobord|lamp|lampa|rug|matta|carpet|curtain|gardin|pillow|kudde|cushion|canapé|fauteuil|tapis|rideau|coussin|divano|poltrona|tappeto|Sofa|Couch|Sessel|Couchtisch|Teppich|Kissen|Vorhang|Lampe|sofá|sillón|alfombra|cortina|cojín|lámpara)\b/, "living_room"],
    // Bedroom — multilingual
    [/\b(bed|beds|mattress|bedding|nightstand|duvet|comforter|säng|sängar|madrass|sängbord|påslakan|täcke|bäddset|lit|matelas|couette|table de nuit|Bett|Matratze|Bettdecke|Nachttisch|cama|colchón|edredón|mesita de noche)\b/, "bedroom"],
    // Kitchen — multilingual
    [/\b(kitchen|cookware|dinnerware|mug|cup|plate|bowl|kök|köksredskap|mugg|kopp|tallrik|skål|cuisine|casserole|vaisselle|tasse|assiette|bol|Küche|Geschirr|Tasse|Teller|Schüssel|cocina|vajilla|taza|plato|cuenco)\b/, "kitchen"],
    [/\b(bathroom|towel|shower|bath mat|badrum|handduk|dusch|badmatta|salle de bain|serviette|douche|Badezimmer|Handtuch|Dusche|baño|toalla|ducha)\b/, "bathroom"],
    [/\b(desk|office chair|monitor stand|bookshelf|skrivbord|kontorsstol|bokhylla|bureau|chaise de bureau|étagère|Schreibtisch|Bürostuhl|Regal|escritorio|silla de oficina|estantería)\b/, "office"],
    [/\b(dog collar|dog bed|dog toy|cat toy|cat bed|pet|hundleksak|hundbädd|kattleksak|kattbädd|husdjur)\b/, "pet"],
    [/\b(car seat cover|car mat|steering wheel|car accessory|bilklädsel|bilmatta|ratt|biltillbehör)\b/, "car_interior"],
    [/\b(patio|garden|outdoor furniture|planter|flower pot|trädgård|utomhus|utomhusmöbler|kruka|balkong|jardin|terrasse|Garten|Terrasse|jardín|patio)\b/, "garden"],
  ];

  for (const [regex, category] of patterns) {
    if (regex.test(combined)) return category;
  }

  return undefined;
}

export function extractProduct(): ProductData {
  return {
    product_url: location.href,
    product_title: scrapeTitle(),
    product_image: scrapeImage() ?? "",
    product_category: detectCategory(),
  };
}
