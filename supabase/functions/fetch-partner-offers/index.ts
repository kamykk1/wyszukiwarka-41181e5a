import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map internal category names to systempartnerski.pl product types
const CATEGORY_TO_PRODUCT_TYPE: Record<string, string[]> = {
  konta_osobiste: ["konto_osobiste"],
  konta_firmowe: ["konto_firmowe"],
  konta_oszczednosciowe: ["konto_oszczednosciowe"],
  kredyty_gotowkowe: ["kredyt_gotowkowy", "kredyt_konsolidacyjny"],
  kredyty_hipoteczne: ["kredyt_hipoteczny"],
  kredyty_konsolidacyjne: ["kredyt_konsolidacyjny"],
  lokaty: ["lokata"],
  karty_kredytowe: ["karta_kredytowa"],
};

// Fetch offers from systempartnerski.pl API
async function fetchFromSystemPartnerski(
  baseUrl: string,
  token: string,
): Promise<any[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/getdata`;
    console.log("Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Auth-Token": token,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`API returned ${response.status}: ${text.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.offers || data.data || []);
  } catch (err) {
    console.error(`Error fetching from API:`, err);
    return [];
  }
}

// Normalize offer data from systempartnerski.pl format to our DB format
function normalizeOffer(raw: any, category: string, partnerId: string) {
  const productType = raw.product_type || category;

  // Extract features based on category
  let features: string[] = [];
  if (Array.isArray(raw.features)) {
    features = raw.features
      .map((f: any) => (Array.isArray(f) ? f[1] : f))
      .filter(Boolean);
  }

  // Build description based on category
  let description = "";
  if (raw.representative_example) {
    description = raw.representative_example;
  } else if (raw.bonus && raw.bonus_opis) {
    description = raw.bonus_opis.replace(/\\r\\n|\r\n/g, " ").trim();
  } else if (raw.label) {
    description = raw.label;
  }

  // Extract interest rate
  let interestRate: number | null = null;
  if (typeof raw.aprc === "number") {
    interestRate = raw.aprc;
  } else if (typeof raw.nominal_interest_rate === "number") {
    interestRate = raw.nominal_interest_rate;
  } else if (Array.isArray(raw.interest_rates) && raw.interest_rates.length > 0) {
    // For savings accounts: take the highest rate
    interestRate = Math.max(...raw.interest_rates.map((r: any) => (Array.isArray(r) ? r[1] : 0)));
  } else if (Array.isArray(raw.interest_rate) && raw.interest_rate.length > 0) {
    // For deposits: take rate from first entry
    interestRate = Array.isArray(raw.interest_rate[0]) ? raw.interest_rate[0][1] : null;
  }

  // Extract annual fee (management fee for accounts)
  let annualFee: number | null = null;
  if (typeof raw.management_fee_max === "number") {
    annualFee = raw.management_fee_max * 12; // monthly → annual
  } else if (typeof raw.annual_fee === "number") {
    annualFee = raw.annual_fee;
  }

  // Build affiliate URL
  let affiliateUrl: string | null = null;
  if (raw.lead_url) {
    affiliateUrl = raw.lead_url.startsWith("http")
      ? raw.lead_url
      : `https://api.systempartnerski.pl${raw.lead_url}`;
  }

  const externalId = `${partnerId}_${productType}_${raw.product_id || raw.version_id || raw.product_name}`;

  return {
    external_id: externalId,
    partner_id: partnerId,
    name: raw.product_name || "Unknown",
    provider: raw.bank_name || partnerId,
    category,
    description: description || null,
    interest_rate: interestRate,
    annual_fee: annualFee,
    min_amount: raw.min_amount ? Number(raw.min_amount) : (raw.amount_min ? Number(raw.amount_min) : null),
    max_amount: raw.max_amount ? Number(raw.max_amount) : (raw.amount_max ? Number(raw.amount_max) : null),
    features: JSON.stringify(features),
    affiliate_url: affiliateUrl,
    image_url: raw.logo_url_format || raw.logo_url || null,
    currency: raw.currency || "PLN",
    source: partnerId,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Admin authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Accept partner_id/category from query params or body
    const url = new URL(req.url);
    let filterPartnerId = url.searchParams.get("partner_id");
    let filterCategory = url.searchParams.get("category");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.partner_id) filterPartnerId = body.partner_id;
        if (body?.category) filterCategory = body.category;
      } catch {
        /* no body */
      }
    }

    // Fetch enabled partners
    let query = supabase
      .from("partner_integrations")
      .select("id, display_name, base_url, api_key, category_api_keys, enabled")
      .eq("enabled", true);

    if (filterPartnerId) {
      query = query.eq("id", filterPartnerId);
    }

    const { data: partners, error: pErr } = await query;
    if (pErr) throw pErr;

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No enabled partners", imported: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalImported = 0;
    const results: Array<{
      partner: string;
      category: string;
      count: number;
      errors: string[];
    }> = [];

    for (const partner of partners) {
      if (!partner.base_url) continue;

      const categoryApiKeys = (partner.category_api_keys || {}) as Record<string, string>;

      // Determine which categories to fetch
      const categoriesToFetch = filterCategory
        ? { [filterCategory]: categoryApiKeys[filterCategory] || partner.api_key || "" }
        : Object.entries(categoryApiKeys).reduce(
            (acc, [cat, key]) => {
              if (key) acc[cat] = key;
              return acc;
            },
            {} as Record<string, string>,
          );

      for (const [category, apiToken] of Object.entries(categoriesToFetch)) {
        if (!apiToken) continue;

        console.log(`Fetching ${category} from ${partner.display_name}...`);
        const rawOffers = await fetchFromSystemPartnerski(partner.base_url, apiToken);
        const errors: string[] = [];

        console.log(`Got ${rawOffers.length} offers for ${category}`);

        for (const raw of rawOffers) {
          try {
            const normalized = normalizeOffer(raw, category, partner.id);

            // Check if product already exists by external_id
            const { data: existing } = await supabase
              .from("financial_products")
              .select("id")
              .eq("external_id", normalized.external_id)
              .maybeSingle();

            let upsertErr;
            if (existing) {
              const { error } = await supabase
                .from("financial_products")
                .update(normalized)
                .eq("id", existing.id);
              upsertErr = error;
            } else {
              const { error } = await supabase
                .from("financial_products")
                .insert(normalized);
              upsertErr = error;
            }

            if (upsertErr) {
              errors.push(`${normalized.name}: ${upsertErr.message}`);
            } else {
              totalImported++;
            }
          } catch (e) {
            errors.push(`${raw.product_name || "?"}: ${e instanceof Error ? e.message : "Unknown"}`);
          }
        }

        results.push({
          partner: partner.display_name,
          category,
          count: rawOffers.length - errors.length,
          errors,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported: totalImported, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("fetch-partner-offers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
