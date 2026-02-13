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

    // Authenticate via x-api-key header matching a partner integration
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate partner API key
    const { data: partner, error: partnerErr } = await supabase
      .from("partner_integrations")
      .select("id, display_name, enabled, task_points")
      .eq("api_key", apiKey)
      .eq("enabled", true)
      .single();

    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: "Invalid or disabled partner API key" }), { status: 403, headers: corsHeaders });
    }

    const { user_email, task_type, external_task_id, product_id } = await req.json();

    if (!user_email || !task_type || !external_task_id) {
      return new Response(
        JSON.stringify({ error: "user_email, task_type, and external_task_id are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find user by email
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = userList?.users?.find(u => u.email === user_email);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
    }

    // Award partner task points
    const { data: result, error: rpcErr } = await supabase.rpc("award_partner_task_points", {
      _user_id: targetUser.id,
      _partner_id: partner.id,
      _task_type: task_type,
      _external_task_id: external_task_id,
      _product_id: product_id || null,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, partner: partner.display_name, ...result }),
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
