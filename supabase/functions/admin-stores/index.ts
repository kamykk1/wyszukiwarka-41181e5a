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

    // GET: List stores (without exposing credentials)
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo, color, enabled, api_key, api_secret")
        .order("name");

      if (error) throw error;

      const masked = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        logo: s.logo,
        color: s.color,
        enabled: s.enabled,
        has_api_key: !!s.api_key,
        has_api_secret: !!s.api_secret,
      }));

      return new Response(JSON.stringify(masked), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Update store API keys
    if (req.method === "POST" && action === "update-keys") {
      const body = await req.json();
      const { id, api_key, api_secret } = body;

      if (!id || typeof id !== "string") {
        return new Response(JSON.stringify({ error: "Missing store id" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const updateData: Record<string, any> = {};
      if (api_key !== undefined) updateData.api_key = api_key || null;
      if (api_secret !== undefined) updateData.api_secret = api_secret || null;

      const { error } = await supabase
        .from("stores")
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
        .from("stores")
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
