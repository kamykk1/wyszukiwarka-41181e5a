import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_email, task_type, external_task_id, product_id, category } = await req.json();

    if (!user_email || !task_type || !external_task_id) {
      return new Response(
        JSON.stringify({ error: "user_email, task_type, and external_task_id are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch all enabled partners to match API key
    const { data: partners, error: partnersErr } = await supabase
      .from("partner_integrations")
      .select("id, display_name, enabled, task_points, category_points, api_key, category_api_keys")
      .eq("enabled", true);

    if (partnersErr || !partners || partners.length === 0) {
      return new Response(JSON.stringify({ error: "No enabled partners found" }), { status: 403, headers: corsHeaders });
    }

    // Match partner by: 1) category-specific API key, 2) global API key
    let matchedPartner: typeof partners[0] | null = null;
    let matchedCategory: string | null = category || null;

    for (const p of partners) {
      // Check category_api_keys first (per-category verification)
      if (category && p.category_api_keys && typeof p.category_api_keys === "object") {
        const catKeys = p.category_api_keys as Record<string, string>;
        if (catKeys[category] === apiKey) {
          matchedPartner = p;
          matchedCategory = category;
          break;
        }
      }

      // If no category match, check if any category key matches (auto-detect category)
      if (!matchedPartner && p.category_api_keys && typeof p.category_api_keys === "object") {
        const catKeys = p.category_api_keys as Record<string, string>;
        for (const [cat, key] of Object.entries(catKeys)) {
          if (key === apiKey) {
            matchedPartner = p;
            matchedCategory = cat;
            break;
          }
        }
        if (matchedPartner) break;
      }

      // Fallback to global api_key
      if (p.api_key === apiKey) {
        matchedPartner = p;
        break;
      }
    }

    if (!matchedPartner) {
      return new Response(JSON.stringify({ error: "Invalid or disabled partner API key" }), { status: 403, headers: corsHeaders });
    }

    // Find user by email
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = userList?.users?.find(u => u.email === user_email);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
    }

    // Determine points: category_points > task_points
    let points = matchedPartner.task_points;
    if (matchedCategory && matchedPartner.category_points && typeof matchedPartner.category_points === "object") {
      const catPoints = (matchedPartner.category_points as Record<string, number>)[matchedCategory];
      if (catPoints !== undefined && catPoints !== null) {
        points = catPoints;
      }
    }

    // Award points
    const { data: result, error: rpcErr } = await supabase.rpc("award_partner_task_points", {
      _user_id: targetUser.id,
      _partner_id: matchedPartner.id,
      _task_type: task_type,
      _external_task_id: external_task_id,
      _product_id: product_id || null,
      _override_points: points,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        success: true,
        partner: matchedPartner.display_name,
        category: matchedCategory,
        points_awarded: points,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("partner-callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
