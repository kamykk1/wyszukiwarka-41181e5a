import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TD_BASE = "https://api.tradedoubler.com/1.0";

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
    const tdToken = Deno.env.get("TRADEDOUBLER_TOKEN");

    if (!tdToken) {
      return new Response(JSON.stringify({ error: "TRADEDOUBLER_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await authenticateAdmin(req, supabaseUrl, anonKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET programs: fetch from Tradedoubler and cache
    if (req.method === "GET" && action === "programs") {
      const tdUrl = `${TD_BASE}/programs.json?token=${tdToken}&orderBy=name&freeText=`;
      console.log("Fetching TD programs...");

      const tdRes = await fetch(tdUrl, {
        headers: { "Accept": "application/json" },
      });

      if (!tdRes.ok) {
        const body = await tdRes.text();
        console.error("TD API error:", tdRes.status, body);
        return new Response(JSON.stringify({ error: `Tradedoubler API error: ${tdRes.status}`, details: body }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tdData = await tdRes.json();
      const programs = Array.isArray(tdData) ? tdData : (tdData.programs || tdData.data || []);

      const mapped = programs.map((p: any) => ({
        id: String(p.id || p.programId || p.program_id),
        name: p.name || p.programName || p.program_name || "Unknown",
        advertiser_id: String(p.advertiserId || p.advertiser_id || ""),
        logo_url: p.logoUrl || p.logo_url || p.logo || null,
        cashback_rate: parseFloat(p.commissionRate || p.commission_rate || p.cr || "0") || null,
        cashback_type: p.commissionType || p.commission_type || "percent",
        currency: p.currency || "PLN",
        status: p.status || "active",
        category: p.category || p.categoryName || null,
        url: p.url || p.websiteUrl || null,
        raw_data: p,
        synced_at: new Date().toISOString(),
      }));

      if (mapped.length > 0) {
        const { error: upsertErr } = await supabase
          .from("tradedoubler_programs")
          .upsert(mapped, { onConflict: "id" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
        }
      }

      return new Response(JSON.stringify({ programs: mapped, count: mapped.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET cached programs from DB
    if (req.method === "GET" && action === "cached-programs") {
      const { data, error } = await supabase
        .from("tradedoubler_programs")
        .select("id, name, advertiser_id, logo_url, cashback_rate, cashback_type, currency, status, category, url, synced_at")
        .order("name");

      if (error) throw error;

      return new Response(JSON.stringify({ programs: data || [], count: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: assign Tradedoubler program to a store
    if (req.method === "POST" && action === "assign") {
      const body = await req.json();
      const { store_id, program_id } = body;

      if (!store_id) {
        return new Response(JSON.stringify({ error: "Missing store_id" }), {
          status: 400, headers: corsHeaders,
        });
      }

      if (!program_id) {
        // Unassign - revert to manual
        const { error } = await supabase
          .from("stores")
          .update({
            partner_source: "manual",
            tradedoubler_program_id: null,
            tradedoubler_advertiser_id: null,
            cashback_rate: null,
            cashback_type: null,
          })
          .eq("id", store_id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Program unassigned" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch program details
      const { data: prog } = await supabase
        .from("tradedoubler_programs")
        .select("*")
        .eq("id", program_id)
        .single();

      const { error } = await supabase
        .from("stores")
        .update({
          partner_source: "tradedoubler",
          tradedoubler_program_id: program_id,
          tradedoubler_advertiser_id: prog?.advertiser_id || null,
          cashback_rate: prog?.cashback_rate || null,
          cashback_type: prog?.cashback_type || "percent",
        })
        .eq("id", store_id);

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
