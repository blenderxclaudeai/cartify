import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // Try to get user from JWT if provided, but don't require it
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getClaims(token);
      if (data?.claims?.sub) {
        userId = data.claims.sub as string;
      }
    }

    const body = await req.json();
    const { pageUrl, imageUrl, title, price, retailerDomain } = body;

    if (!pageUrl || !imageUrl) {
      return new Response(JSON.stringify({ error: "pageUrl and imageUrl required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mock result: in production, call actual AI model here
    const resultImageUrl = `https://placehold.co/400x600/7c3aed/white?text=VTO+Try-On`;

    // Only save to DB if we have a user
    let tryOnId = crypto.randomUUID();
    if (userId) {
      const { data, error } = await supabase.from("tryon_requests").insert({
        user_id: userId,
        page_url: pageUrl,
        image_url: imageUrl,
        title: title || null,
        price: price || null,
        retailer_domain: retailerDomain || null,
        status: "completed",
        result_image_url: resultImageUrl,
      }).select().single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      tryOnId = data.id;
    }

    return new Response(JSON.stringify({
      tryOnId,
      status: "completed",
      resultImageUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
