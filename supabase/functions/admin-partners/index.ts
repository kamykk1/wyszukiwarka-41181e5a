import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function authenticateAdmin(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

  const userId = claimsData.claims.sub;
  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
  return userId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await authenticateAdmin(req, supabaseUrl, anonKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: List partners (without exposing credentials)
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("partner_integrations")
        .select("id, name, display_name, enabled, base_url, task_points, description, category_api_keys, category_points, category_calc_mode")
        .order("display_name");

      if (error) throw error;

      // Mask credentials: show only whether keys are configured
      const masked = (data || []).map((p: any) => {
        const catKeys = (p.category_api_keys || {}) as Record<string, string>;
        const maskedCatKeys: Record<string, boolean> = {};
        for (const [cat, key] of Object.entries(catKeys)) {
          maskedCatKeys[cat] = !!key;
        }
        return {
          ...p,
          has_api_key: true,
          category_api_keys: undefined,
          category_api_keys_configured: maskedCatKeys,
          category_points: p.category_points,
          category_calc_mode: p.category_calc_mode || {},
        };
      });

      return new Response(JSON.stringify(masked), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Update partner settings (including credentials)
    if (req.method === "POST" && action === "update") {
      const body = await req.json();
      const { id, api_key, api_secret, task_points, base_url, category_api_keys, category_points, category_calc_mode } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing partner id" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const updateData: Record<string, any> = {};
      if (api_key !== undefined) updateData.api_key = api_key || null;
      if (api_secret !== undefined) updateData.api_secret = api_secret || null;
      if (task_points !== undefined) updateData.task_points = task_points;
      if (base_url !== undefined) updateData.base_url = base_url || null;
      if (category_api_keys !== undefined) updateData.category_api_keys = category_api_keys;
      if (category_points !== undefined) updateData.category_points = category_points;
      if (category_calc_mode !== undefined) updateData.category_calc_mode = category_calc_mode;

      const { error } = await supabase
        .from("partner_integrations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Toggle enabled
    if (req.method === "POST" && action === "toggle") {
      const body = await req.json();
      const { id, enabled } = body;

      const { error } = await supabase
        .from("partner_integrations")
        .update({ enabled })
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: corsHeaders,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
