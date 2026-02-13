import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Category mapping for partner APIs
const CATEGORY_SLUGS: Record<string, string> = {
  konta_osobiste: "konta-osobiste",
  konta_firmowe: "konta-firmowe",
  konta_oszczednosciowe: "konta-oszczednosciowe",
  kredyty_hipoteczne: "kredyty-hipoteczne",
  kredyty_gotowkowe: "kredyty-gotowkowe",
  lokaty: "lokaty",
  karty_kredytowe: "karty-kredytowe",
};

interface PartnerOffer {
  external_id: string;
  name: string;
  provider: string;
  category: string;
  description?: string;
  interest_rate?: number;
  annual_fee?: number;
  min_amount?: number;
  max_amount?: number;
  features?: string[];
  affiliate_url?: string;
  image_url?: string;
  currency?: string;
}

// Fetch offers from a partner API
async function fetchFromPartnerAPI(
  baseUrl: string,
  categorySlug: string,
  apiKey: string
): Promise<PartnerOffer[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/offers/${categorySlug}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Partner API ${url} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    // Normalize response - partners may return { offers: [...] } or [...]
    return Array.isArray(data) ? data : (data.offers || data.data || []);
  } catch (err) {
    console.error(`Error fetching from ${baseUrl}/${categorySlug}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Optional: filter by partner_id or category
    const url = new URL(req.url);
    const filterPartnerId = url.searchParams.get("partner_id");
    const filterCategory = url.searchParams.get("category");

    // Fetch enabled partners with configured base_url
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
        JSON.stringify({ success: true, message: "No enabled partners with base_url", imported: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalImported = 0;
    const results: Array<{ partner: string; category: string; count: number; errors: string[] }> = [];

    for (const partner of partners) {
      if (!partner.base_url) continue;

      const categoryApiKeys = (partner.category_api_keys || {}) as Record<string, string>;
      const categoriesToFetch = filterCategory
        ? { [filterCategory]: categoryApiKeys[filterCategory] || partner.api_key }
        : Object.keys(CATEGORY_SLUGS).reduce((acc, cat) => {
            acc[cat] = categoryApiKeys[cat] || partner.api_key || "";
            return acc;
          }, {} as Record<string, string>);

      for (const [category, apiKey] of Object.entries(categoriesToFetch)) {
        if (!apiKey) continue;

        const slug = CATEGORY_SLUGS[category] || category;
        const offers = await fetchFromPartnerAPI(partner.base_url, slug, apiKey);
        const errors: string[] = [];

        for (const offer of offers) {
          try {
            const { error: upsertErr } = await supabase
              .from("financial_products")
              .upsert(
                {
                  external_id: offer.external_id || `${partner.id}_${category}_${offer.name}`,
                  partner_id: partner.id,
                  name: offer.name,
                  provider: offer.provider || partner.display_name,
                  category,
                  description: offer.description || null,
                  interest_rate: offer.interest_rate ?? null,
                  annual_fee: offer.annual_fee ?? null,
                  min_amount: offer.min_amount ?? null,
                  max_amount: offer.max_amount ?? null,
                  features: offer.features ? JSON.stringify(offer.features) : "[]",
                  affiliate_url: offer.affiliate_url || null,
                  image_url: offer.image_url || null,
                  currency: offer.currency || "PLN",
                  source: partner.id,
                  is_active: true,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "external_id" }
              );

            if (upsertErr) {
              errors.push(`${offer.name}: ${upsertErr.message}`);
            } else {
              totalImported++;
            }
          } catch (e) {
            errors.push(`${offer.name}: ${e instanceof Error ? e.message : "Unknown"}`);
          }
        }

        results.push({
          partner: partner.display_name,
          category,
          count: offers.length - errors.length,
          errors,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported: totalImported, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-partner-offers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
