// Content script — plain TS, no React/JSX, no imports from the app.
// Injected on every page to scrape product data and show a "Try On" button.

(() => {
  // Avoid double-injection
  if (document.getElementById("vto-tryon-btn")) return;

  // --------------- Scraping helpers ---------------

  function getMeta(property: string): string | null {
    const el =
      document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`) ??
      document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`);
    return el?.content?.trim() || null;
  }

  function scrapeImage(): string | null {
    // 1. OpenGraph image
    const ogImage = getMeta("og:image");
    if (ogImage) return ogImage;

    // 2. Twitter card image
    const twImage = getMeta("twitter:image");
    if (twImage) return twImage;

    // 3. Largest visible image on the page (likely the product hero)
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

  function scrapeTitle(): string | null {
    return (
      getMeta("og:title") ??
      getMeta("twitter:title") ??
      document.title ??
      null
    );
  }

  function scrapePrice(): string | null {
    return (
      getMeta("product:price:amount") ??
      getMeta("og:price:amount") ??
      null
    );
  }

  // --------------- Floating button ---------------

  const imageUrl = scrapeImage();
  if (!imageUrl) return; // No product image found — probably not a product page

  const btn = document.createElement("button");
  btn.id = "vto-tryon-btn";
  btn.textContent = "✨ Try On";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "10px 20px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  } as CSSStyleDeclaration);

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = "0 6px 28px rgba(124, 58, 237, 0.5)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 4px 20px rgba(124, 58, 237, 0.4)";
  });

  btn.addEventListener("click", () => {
    const productData = {
      type: "VTO_TRYON_REQUEST",
      payload: {
        pageUrl: window.location.href,
        imageUrl,
        title: scrapeTitle(),
        price: scrapePrice(),
        retailerDomain: window.location.hostname,
      },
    };
    chrome.runtime.sendMessage(productData);
    // Brief feedback
    btn.textContent = "✓ Sent!";
    btn.style.background = "#16a34a";
    setTimeout(() => {
      btn.textContent = "✨ Try On";
      btn.style.background = "linear-gradient(135deg, #7c3aed, #6d28d9)";
    }, 1500);
  });

  document.body.appendChild(btn);
})();
