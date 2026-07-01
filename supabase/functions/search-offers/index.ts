// Zunifikowana wyszukiwarka ofert — sprowadza wyniki wielu partnerów
// do wspólnego schematu i sortuje po cenie efektywnej (cena – cashback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { searchAllegro } from "./adapters/allegro.ts";
import { searchAliexpress } from "./adapters/aliexpress.ts";
import { searchAmazon } from "./adapters/amazon.ts";
import { searchTemu } from "./adapters/temu.ts";
import type { AdapterResult, NormalizedOffer } from "./adapters/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BodySchema = z.object({
  query: z.string().trim().min(2).max(100),
  category: z.string().trim().max(50).optional(),
  limit: z.number().int().min(1).max(100).optional().default(40),
  sort: z.enum(["price_effective", "price", "cashback", "rating"]).optional().default("price_effective"),
});

// Prosty rate-limit w pamięci procesu.
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT) return false;
  b.count++;
  return true;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms)),
  ]);
}

function buildAffiliateUrl(url: string, email?: string | null): string {
  if (!email) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("epi1", email);
    return u.toString();
  } catch {
    return url;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!rateLimit(ip)) {
      return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    if (body.limit) body.limit = Number(body.limit);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { query, category, limit, sort } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Email dla parametru epi1 (jeśli zalogowany).
    let userEmail: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await anon.auth.getUser();
        userEmail = user?.email ?? null;
      } catch { /* niezalogowany */ }
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Wczytaj ustawienia cache (TTL, enabled).
    const { data: settings } = await admin
      .from("offers_settings")
      .select("cache_ttl_minutes, enabled")
      .eq("id", "default")
      .maybeSingle();
    const ttlMinutes = settings?.cache_ttl_minutes ?? 30;
    const cacheEnabled = settings?.enabled ?? true;
    const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";

    // Spróbuj cache jeśli włączone i nie wymuszono odświeżenia.
    if (cacheEnabled && !forceRefresh) {
      const cutoff = new Date(Date.now() - ttlMinutes * 60_000).toISOString();
      const { data: cached } = await admin
        .from("offers_cache")
        .select("*")
        .eq("query", query.toLowerCase())
        .gte("fetched_at", cutoff)
        .order("price_effective", { ascending: true })
        .limit(limit);

      if (cached && cached.length >= 4) {
        const offers = cached.map((o: any) => ({ ...o, product_url: buildAffiliateUrl(o.product_url, userEmail) }));
        return new Response(
          JSON.stringify({
            offers, cached: true, query, category, sort,
            partners: [], ttl_minutes: ttlMinutes,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Wywołaj adaptery równolegle z timeoutem 5s.
    const runners: { partner: NormalizedOffer["partner_id"]; run: () => Promise<NormalizedOffer[]> }[] = [
      { partner: "allegro", run: () => searchAllegro(query) },
      { partner: "aliexpress", run: () => searchAliexpress(query) },
      { partner: "amazon", run: () => searchAmazon(query) },
      { partner: "temu", run: () => searchTemu(query, supabaseUrl, serviceKey) },
    ];

    const results: AdapterResult[] = await Promise.all(
      runners.map(async ({ partner, run }) => {
        const start = Date.now();
        try {
          const offers = await withTimeout(run(), 5000, partner);
          return { partner_id: partner, status: "ok" as const, offers, latency_ms: Date.now() - start };
        } catch (err) {
          console.error(`[${partner}] error`, err);
          return {
            partner_id: partner,
            status: "error" as const,
            offers: [],
            latency_ms: Date.now() - start,
            error: (err as Error).message,
          };
        }
      }),
    );


    // Wzbogać, sortuj, przytnij.
    const all = results.flatMap((r) =>
      r.offers.map((o) => {
        const cashback_amount = +(o.price_total * (o.cashback_rate / 100)).toFixed(2);
        const price_effective = +(o.price_total - cashback_amount).toFixed(2);
        return {
          ...o,
          product_url: buildAffiliateUrl(o.product_url, userEmail),
          cashback_amount,
          price_effective,
        };
      })
    );

    all.sort((a, b) => {
      switch (sort) {
        case "price": return a.price_total - b.price_total;
        case "cashback": return b.cashback_rate - a.cashback_rate;
        case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
        default: return a.price_effective - b.price_effective;
      }
    });

    const trimmed = all.slice(0, limit);

    // Zapisz cache (best-effort).
    if (trimmed.length > 0) {
      const rows = trimmed.map((o) => ({
        partner_id: o.partner_id,
        external_id: o.external_id,
        query: query.toLowerCase(),
        title: o.title,
        image_url: o.image_url,
        product_url: o.product_url,
        price: o.price,
        currency: o.currency,
        shipping_price: o.shipping_price,
        price_total: o.price_total,
        cashback_rate: o.cashback_rate,
        cashback_amount: o.cashback_amount,
        price_effective: o.price_effective,
        rating: o.rating,
        reviews_count: o.reviews_count,
        category: o.category,
        brand: o.brand,
        fetched_at: new Date().toISOString(),
      }));
      admin.from("offers_cache").upsert(rows, { onConflict: "partner_id,external_id,query" })
        .then(({ error }) => { if (error) console.error("cache upsert", error); });
    }

    return new Response(
      JSON.stringify({
        offers: trimmed,
        partners: results.map((r) => ({
          id: r.partner_id,
          status: r.status,
          count: r.offers.length,
          latency_ms: r.latency_ms,
          error: r.error,
        })),
        query,
        category,
        sort,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("search-offers fatal", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
