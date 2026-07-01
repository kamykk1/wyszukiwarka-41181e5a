// Cron-triggered: odświeża cache popularnych zapytań wywołując search-offers z ?refresh=1.
// Wywoływane przez pg_cron z nagłówkiem x-cron-secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: settings } = await admin
    .from("offers_settings")
    .select("popular_queries, enabled")
    .eq("id", "default")
    .maybeSingle();

  if (!settings?.enabled) {
    return new Response(JSON.stringify({ skipped: "cache_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const queries: string[] = settings?.popular_queries ?? [];
  const results: Array<{ query: string; ok: boolean; count?: number; error?: string }> = [];

  for (const q of queries) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/search-offers?refresh=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: q, limit: 40 }),
      });
      const json = await res.json();
      results.push({ query: q, ok: res.ok, count: json.offers?.length });
    } catch (e) {
      results.push({ query: q, ok: false, error: (e as Error).message });
    }
  }

  await admin.from("offers_settings").update({ last_refresh_at: new Date().toISOString() }).eq("id", "default");

  // Wywal stare wpisy z cache (starsze niż 24h).
  await admin.from("offers_cache")
    .delete()
    .lt("fetched_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());

  return new Response(JSON.stringify({ refreshed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
