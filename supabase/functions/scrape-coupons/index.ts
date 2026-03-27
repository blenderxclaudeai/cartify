import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Missing domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for fresh cached coupons (scraped within last 24h)
    const { data: cached } = await supabase
      .from("retailer_coupons")
      .select("code,description,discount_type,discount_value,min_purchase,scraped_at")
      .eq("domain", domain)
      .eq("is_active", true);

    if (cached && cached.length > 0) {
      // Check if any scraped coupons are fresh
      const hasFreshScraped = cached.some(
        (c: any) => c.scraped_at && Date.now() - new Date(c.scraped_at).getTime() < CACHE_TTL_MS
      );
      // Also include manually-added coupons (no scraped_at)
      const manualCoupons = cached.filter((c: any) => !c.scraped_at);

      if (hasFreshScraped || manualCoupons.length > 0) {
        return new Response(
          JSON.stringify({ coupons: cached.map(({ scraped_at, ...rest }: any) => rest) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Scrape coupon aggregator sites
    const cleanDomain = domain.replace(/^www\./, "");
    const domainNoTld = cleanDomain.split(".")[0];

    const aggregatorUrls = [
      `https://www.retailmenot.com/view/${cleanDomain}`,
      `https://couponfollow.com/site/${cleanDomain}`,
      `https://www.coupons.com/coupon-codes/${domainNoTld}`,
    ];

    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    let combinedHtml = "";

    for (const url of aggregatorUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
          headers: { "User-Agent": userAgent },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const text = await res.text();
          // Take a reasonable chunk to avoid token limits
          combinedHtml += `\n--- SOURCE: ${url} ---\n` + text.slice(0, 30000);
        }
      } catch {
        // Skip failed fetches
      }
    }

    if (!combinedHtml.trim()) {
      return new Response(JSON.stringify({ coupons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to extract coupons from HTML
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ coupons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiPrompt = `Extract all coupon/promo codes from this HTML for the retailer "${cleanDomain}".
Return ONLY valid JSON array. Each object must have:
- "code": the coupon/promo code string
- "description": short description of the deal
- "discount_type": "percentage" or "fixed" or "free_shipping" or "other"
- "discount_value": the discount amount as string (e.g. "20%" or "$10") or null

If no valid coupons found, return empty array [].
Do NOT include expired coupons. Only include codes that appear to be currently active.

HTML content:
${combinedHtml.slice(0, 50000)}`;

    try {
      const aiRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You extract coupon codes from HTML. Return only valid JSON arrays." },
            { role: "user", content: aiPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiRes.ok) {
        return new Response(JSON.stringify({ coupons: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const content = aiData?.choices?.[0]?.message?.content || "[]";

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Try to extract array from response
        const match = content.match(/\[[\s\S]*\]/);
        parsed = match ? JSON.parse(match[0]) : [];
      }

      const coupons: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.coupons)
        ? parsed.coupons
        : [];

      if (coupons.length === 0) {
        return new Response(JSON.stringify({ coupons: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old scraped coupons for this domain
      await supabase
        .from("retailer_coupons")
        .delete()
        .eq("domain", cleanDomain)
        .not("scraped_at", "is", null);

      // Insert new scraped coupons
      const now = new Date().toISOString();
      const expires = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      const rows = coupons.slice(0, 20).map((c: any) => ({
        domain: cleanDomain,
        code: String(c.code || "").slice(0, 50),
        description: String(c.description || "").slice(0, 200),
        discount_type: c.discount_type || "other",
        discount_value: c.discount_value ? String(c.discount_value).slice(0, 50) : null,
        is_active: true,
        scraped_at: now,
        expires_at: expires,
      }));

      const { error: insertError } = await supabase
        .from("retailer_coupons")
        .insert(rows);

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      const result = rows.map(({ scraped_at, expires_at, is_active, ...rest }) => rest);
      return new Response(JSON.stringify({ coupons: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (aiError) {
      console.error("AI extraction error:", aiError);
      return new Response(JSON.stringify({ coupons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("scrape-coupons error:", err);
    return new Response(JSON.stringify({ error: "Internal error", coupons: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
