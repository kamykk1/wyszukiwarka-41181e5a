import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Publisher Management API base (OAuth 2.0) — connect.tradedoubler.com is the correct base
const TD_PUB_BASE = "https://connect.tradedoubler.com/publisher";
// Legacy API base (SHA-1 token) — used for conversions/transactions
const TD_LEGACY_BASE = "https://api.tradedoubler.com/1.0";

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

/**
 * Fetch OAuth bearer token using client_credentials or password grant
 * Credentials stored as: TRADEDOUBLER_CLIENT_ID, TRADEDOUBLER_CLIENT_SECRET, TRADEDOUBLER_USERNAME, TRADEDOUBLER_PASSWORD
 */
async function getTDAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("TRADEDOUBLER_CLIENT_ID");
  const clientSecret = Deno.env.get("TRADEDOUBLER_CLIENT_SECRET");
  const username = Deno.env.get("TRADEDOUBLER_USERNAME");
  const password = Deno.env.get("TRADEDOUBLER_PASSWORD");

  if (!clientId || !clientSecret) return null;

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  // Tradedoubler Publisher API requires password grant (username + password)
  const grantBody = username && password
    ? `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&scope=read`
    : `grant_type=client_credentials&scope=read`;

  // Try multiple known OAuth endpoints
  const endpoints = [
    "https://publishers.tradedoubler.com/en/uaa/oauth/token",
    "https://publishers.tradedoubler.com/uaa/token",
    "https://connect.tradedoubler.com/uaa/oauth/token",
  ];

  for (const endpoint of endpoints) {
    try {
      console.log("Trying OAuth endpoint:", endpoint);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: grantBody,
      });

      if (res.ok) {
        const data = await res.json();
        console.log("OAuth success at:", endpoint);
        return data.access_token || null;
      }

      const errText = await res.text();
      console.log(`OAuth ${endpoint}: ${res.status}`, errText.substring(0, 100));
    } catch (e) {
      console.log(`OAuth endpoint ${endpoint} failed:`, e);
    }
  }

  return null;
}

/**
 * Fetch programs from Publisher Management API (OAuth 2.0)
 */
async function fetchSources(accessToken: string): Promise<any[]> {
  const res = await fetch(`${TD_PUB_BASE}/sources?limit=100&offset=0`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.log("Sources endpoint:", res.status, body.substring(0, 200));
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || data.sources || []);
}

async function fetchProgramsOAuth(accessToken: string) {
  // First get sources (required by programs endpoint)
  const sources = await fetchSources(accessToken);
  console.log(`Found ${sources.length} sources`);

  if (sources.length === 0) {
    throw new Error("Nie znaleziono żadnych źródeł (sources) w koncie Tradedoubler. Dodaj stronę wydawcy w panelu TD.");
  }

  const allPrograms: any[] = [];

  for (const source of sources) {
    const sourceId = source.id || source.sourceId;
    console.log(`Fetching programs for source ${sourceId} (${source.name || ""})`);

    const url = `${TD_PUB_BASE}/programs?sourceId=${sourceId}&limit=100&offset=0`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Programs for source ${sourceId}: ${res.status}`, body.substring(0, 200));
      continue;
    }

    const data = await res.json();
    const programs = Array.isArray(data) ? data : (data.items || data.programs || data.data || []);
    allPrograms.push(...programs);
  }

  // Deduplicate by program ID
  const seen = new Set<string>();
  return allPrograms.filter(p => {
    const id = String(p.id || p.programId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Fetch transactions from Publisher Management API (OAuth 2.0)
 */
async function fetchTransactionsOAuth(accessToken: string, fromDate?: string) {
  const params = new URLSearchParams({ limit: "100", offset: "0" });
  if (fromDate) params.set("fromDate", fromDate);
  
  const res = await fetch(`${TD_PUB_BASE}/transactions?${params}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("TD transactions error:", res.status, body);
    throw new Error(`Tradedoubler transactions API error: ${res.status}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const legacyToken = Deno.env.get("TRADEDOUBLER_TOKEN");

    await authenticateAdmin(req, supabaseUrl, anonKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ─── Test OAuth connection ─────────────────────────────────────────────
    if (req.method === "GET" && action === "test-oauth") {
      const clientId = Deno.env.get("TRADEDOUBLER_CLIENT_ID");
      const clientSecret = Deno.env.get("TRADEDOUBLER_CLIENT_SECRET");
      const tdToken = Deno.env.get("TRADEDOUBLER_TOKEN");
      const username = Deno.env.get("TRADEDOUBLER_USERNAME");
      const password = Deno.env.get("TRADEDOUBLER_PASSWORD");

      const results: any[] = [];
      const endpoints = [
        "https://publishers.tradedoubler.com/en/uaa/oauth/token",
        "https://publishers.tradedoubler.com/uaa/token",
        "https://connect.tradedoubler.com/uaa/oauth/token",
      ];

      if (clientId && clientSecret) {
        const basicAuth = btoa(`${clientId}:${clientSecret}`);
        const grantBody = username && password
          ? `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&scope=read`
          : `grant_type=client_credentials&scope=read`;

        for (const endpoint of endpoints) {
          try {
            const r = await fetch(endpoint, {
              method: "POST",
              headers: { "Authorization": `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
              body: grantBody,
            });
            const body = await r.text();
            results.push({ endpoint, status: r.status, response: body.substring(0, 300) });
            if (r.ok) break;
          } catch (e) {
            results.push({ endpoint, error: String(e) });
          }
        }
      }

      return new Response(JSON.stringify({
        has_client_id: !!clientId,
        has_client_secret: !!clientSecret,
        has_legacy_token: !!tdToken,
        has_username: !!username,
        has_password: !!password,
        oauth_tests: results,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Sync programs from Tradedoubler ───────────────────────────────────
    if (req.method === "GET" && action === "programs") {
      
      // Try OAuth 2.0 first (Publisher Management API)
      const accessToken = await getTDAccessToken();
      
      if (accessToken) {
        console.log("Using OAuth 2.0 Publisher Management API...");
        const programs = await fetchProgramsOAuth(accessToken);
        
        const mapped = programs.map((p: any) => ({
          id: String(p.id || p.programId || p.program_id),
          name: p.name || p.programName || "Unknown",
          advertiser_id: String(p.advertiserId || p.advertiser_id || p.id || ""),
          logo_url: p.logoUrl || p.logo_url || p.logo || null,
          cashback_rate: parseFloat(String(p.commissionRate || p.commission_rate || p.defaultCommission || "0")) || null,
          cashback_type: p.commissionType || "percent",
          currency: p.currency || "PLN",
          status: p.status || p.statusId || "active",
          category: p.category || p.categoryName || null,
          url: p.url || p.websiteUrl || p.website || null,
          raw_data: p,
          synced_at: new Date().toISOString(),
        }));

        if (mapped.length > 0) {
          const { error: upsertErr } = await supabase
            .from("tradedoubler_programs")
            .upsert(mapped, { onConflict: "id" });
          if (upsertErr) console.error("Upsert error:", upsertErr);
        }

        return new Response(JSON.stringify({ programs: mapped, count: mapped.length, source: "oauth" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: legacy token not available for /programs — return helpful error
      if (!legacyToken) {
        return new Response(JSON.stringify({
          error: "Brak danych uwierzytelniających Tradedoubler",
          details: "Skonfiguruj TRADEDOUBLER_CLIENT_ID + TRADEDOUBLER_CLIENT_SECRET (z publishers.tradedoubler.com/en/uaa/clients) aby pobierać programy przez nowe API.",
          programs: [],
          count: 0,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: try legacy API for connected programs (only works for some endpoints)
      console.log("Trying legacy API with token...");
      const legacyRes = await fetch(`${TD_LEGACY_BASE}/programs.json?token=${legacyToken}`, {
        headers: { "Accept": "application/json" },
      });

      if (!legacyRes.ok) {
        const body = await legacyRes.text();
        console.error("Legacy API error:", legacyRes.status, body);
        return new Response(JSON.stringify({
          error: `Tradedoubler API error: ${legacyRes.status}`,
          details: body,
          hint: "Aby pobrać listę programów, skonfiguruj TRADEDOUBLER_CLIENT_ID i TRADEDOUBLER_CLIENT_SECRET w panelu wydawcy Tradedoubler (publishers.tradedoubler.com/en/uaa/clients).",
        }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const legacyData = await legacyRes.json();
      const programs = Array.isArray(legacyData) ? legacyData : (legacyData.programs || legacyData.data || []);

      const mapped = programs.map((p: any) => ({
        id: String(p.id || p.programId),
        name: p.name || p.programName || "Unknown",
        advertiser_id: String(p.advertiserId || ""),
        logo_url: p.logoUrl || null,
        cashback_rate: parseFloat(String(p.commissionRate || "0")) || null,
        cashback_type: p.commissionType || "percent",
        currency: p.currency || "PLN",
        status: p.status || "active",
        category: p.category || null,
        url: p.url || null,
        raw_data: p,
        synced_at: new Date().toISOString(),
      }));

      if (mapped.length > 0) {
        await supabase.from("tradedoubler_programs").upsert(mapped, { onConflict: "id" });
      }

      return new Response(JSON.stringify({ programs: mapped, count: mapped.length, source: "legacy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Sync transactions / pull new commissions ──────────────────────────
    if (req.method === "GET" && action === "sync-transactions") {
      const accessToken = await getTDAccessToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "OAuth credentials not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch last 7 days of transactions
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const txData = await fetchTransactionsOAuth(accessToken, fromDate);
      const transactions = Array.isArray(txData) ? txData : (txData.transactions || txData.items || []);

      return new Response(JSON.stringify({ transactions, count: transactions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Cached programs from DB ───────────────────────────────────────────
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

    // ─── Assign Tradedoubler program to store ──────────────────────────────
    if (req.method === "POST" && action === "assign") {
      const body = await req.json();
      const { store_id, program_id, cashback_rate, cashback_type } = body;

      if (!store_id) {
        return new Response(JSON.stringify({ error: "Missing store_id" }), {
          status: 400, headers: corsHeaders,
        });
      }

      if (!program_id) {
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

      const { data: prog } = await supabase
        .from("tradedoubler_programs")
        .select("*")
        .eq("id", program_id)
        .single();

      // Use provided cashback_rate or fall back to program's rate
      const finalRate = cashback_rate != null ? cashback_rate : (prog?.cashback_rate || null);
      const finalType = cashback_type || prog?.cashback_type || "percent";

      const { error } = await supabase
        .from("stores")
        .update({
          partner_source: "tradedoubler",
          tradedoubler_program_id: program_id,
          tradedoubler_advertiser_id: prog?.advertiser_id || null,
          cashback_rate: finalRate,
          cashback_type: finalType,
        })
        .eq("id", store_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, cashback_rate: finalRate }), {
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
