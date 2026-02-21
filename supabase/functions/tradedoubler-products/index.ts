import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Rate limiting (per-isolate, sliding window) ---
const RATE_LIMIT = 30; // max requests per window per IP
const RATE_WINDOW_MS = 60_000; // 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Periodically clean up stale entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

const TD_API_BASE = "https://api.tradedoubler.com/1.0";

async function getTDAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("TRADEDOUBLER_CLIENT_ID");
  const clientSecret = Deno.env.get("TRADEDOUBLER_CLIENT_SECRET");
  const username = Deno.env.get("TRADEDOUBLER_USERNAME");
  const password = Deno.env.get("TRADEDOUBLER_PASSWORD");
  if (!clientId || !clientSecret) return null;

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const grantBody = username && password
    ? `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&scope=read`
    : `grant_type=client_credentials&scope=read`;

  const endpoints = [
    "https://connect.tradedoubler.com/uaa/oauth/token",
    "https://publishers.tradedoubler.com/en/uaa/oauth/token",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: grantBody,
      });
      if (res.ok) {
        const data = await res.json();
        return data.access_token || null;
      }
    } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate apikey header - must be a valid Supabase anon key for this project
    const apiKey = req.headers.get("apikey");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Verify the key is a JWT referencing this project
    try {
      const payload = JSON.parse(atob(apiKey.split(".")[1]));
      const projectRef = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1];
      if (payload.ref !== projectRef || payload.role !== "anon") {
        throw new Error("Invalid key");
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting by IP
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in a minute.", products: [], total: 0 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20"), 50);

    if (!query || query.length < 2 || query.length > 100) {
      return new Response(
        JSON.stringify({ products: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try legacy token first, then OAuth
    const legacyToken = Deno.env.get("TRADEDOUBLER_TOKEN");
    const oauthToken = await getTDAccessToken();

    if (!legacyToken && !oauthToken) {
      return new Response(
        JSON.stringify({ error: "No Tradedoubler credentials configured", products: [], total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching TD products: "${query}" (page ${page})`);

    // Try with legacy token
    let data: any = null;
    if (legacyToken) {
      const tdUrl = `${TD_API_BASE}/products.json?token=${encodeURIComponent(legacyToken)}&q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(tdUrl, { headers: { Accept: "application/json" } });
      if (res.ok) {
        data = await res.json();
      } else {
        console.log(`Legacy token failed (${res.status}), trying OAuth...`);
      }
    }

    // Fallback to OAuth bearer token
    if (!data && oauthToken) {
      const tdUrl = `${TD_API_BASE}/products.json?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(tdUrl, {
        headers: { Accept: "application/json", Authorization: `Bearer ${oauthToken}` },
      });
      if (res.ok) {
        data = await res.json();
      } else {
        const errText = await res.text();
        console.error(`OAuth Products API error ${res.status}:`, errText);
        return new Response(
          JSON.stringify({ error: `Tradedoubler API error: ${res.status}`, products: [], total: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!data) {
      return new Response(
        JSON.stringify({ products: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawProducts = Array.isArray(data) ? data : (data.products || []);
    const total = data.totalProducts || rawProducts.length;

    const products = rawProducts.map((p: any) => {
      const offer = p.offers?.[0] || {};
      const priceHistory = offer.priceHistory || [];
      const currentPrice = priceHistory[0]?.price?.value || offer.price?.value || null;
      const currency = priceHistory[0]?.price?.currency || offer.price?.currency || "PLN";

      return {
        id: p.productId || p.id || String(Math.random()),
        name: p.name || "Nieznany produkt",
        description: (p.description || "").substring(0, 200),
        image: p.productImage?.url || p.imageUrl || null,
        price: currentPrice ? parseFloat(currentPrice) : null,
        currency,
        store: offer.sourceProductName || offer.programName || p.brand || "Sklep partnerski",
        url: offer.productUrl || p.productUrl || null,
        brand: p.brand || null,
        category: p.categoryName || null,
      };
    });

    return new Response(
      JSON.stringify({ products, total, page, pageSize }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching TD products:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg, products: [], total: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
