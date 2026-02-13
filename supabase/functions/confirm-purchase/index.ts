import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate store via api_key header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate store API key
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, enabled")
      .eq("api_key", apiKey)
      .eq("enabled", true)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: "Invalid or disabled store API key" }), { status: 403, headers: corsHeaders });
    }

    // --- Input validation ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }

    const { user_email, product_name } = body as Record<string, unknown>;

    if (!user_email || typeof user_email !== "string" || !EMAIL_RE.test(user_email) || user_email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid or missing user_email" }), { status: 400, headers: corsHeaders });
    }

    if (!product_name || typeof product_name !== "string" || product_name.length < 1 || product_name.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid or missing product_name (1-500 chars)" }), { status: 400, headers: corsHeaders });
    }

    // Sanitize product_name — allow letters, digits, spaces, common punctuation, Polish chars
    const sanitizedProductName = product_name.replace(/[<>{}]/g, "").trim();

    // Find user by email
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = userList?.users?.find(u => u.email === user_email);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
    }

    // Deduplication — prevent awarding points for same product within 5 minutes
    const { data: recentTx } = await supabase
      .from("points_transactions")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("type", "purchase")
      .ilike("description", `%${sanitizedProductName}%`)
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (recentTx && recentTx.length > 0) {
      return new Response(JSON.stringify({ error: "Duplicate purchase too soon" }), { status: 409, headers: corsHeaders });
    }

    // Award purchase points
    const { data: result, error: rpcErr } = await supabase.rpc("award_purchase_points", {
      _user_id: targetUser.id,
      _product_name: sanitizedProductName,
      _store_name: store.name,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, store: store.name, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("confirm-purchase error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
