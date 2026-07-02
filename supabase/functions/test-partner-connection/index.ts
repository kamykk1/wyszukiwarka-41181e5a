// Test połączenia z API partnera. Admin-only.
// Zwraca {ok, message, latency_ms, details?, logs?}.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TestResult = {
  ok: boolean;
  message: string;
  latency_ms: number;
  details?: unknown;
  logs?: string[];
};

// Aliasy — różne warianty zapisu tego samego partnera trafiają do właściwego testera
const SLUG_ALIASES: Record<string, string> = {
  allegro: "allegro",
  aliexpress: "aliexpress",
  ali: "aliexpress",
  amazon: "amazon",
  amazon_pa: "amazon",
  temu: "temu",
  tradedoubler: "temu",
  bankier: "bankier",
  bankier_pl: "bankier",
  systempartnerski: "bankier",
};

function normalizeSlug(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function testAllegro(_: unknown, log: (m: string) => void): Promise<TestResult> {
  const start = Date.now();
  const id = Deno.env.get("ALLEGRO_CLIENT_ID");
  const secret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
  log(`Allegro: client_id=${id ? "OBECNY" : "BRAK"}, client_secret=${secret ? "OBECNY" : "BRAK"}`);
  if (!id || !secret) {
    return { ok: false, message: "Brak sekretów ALLEGRO_CLIENT_ID / ALLEGRO_CLIENT_SECRET", latency_ms: Date.now() - start };
  }
  try {
    log("Allegro: POST https://allegro.pl/auth/oauth/token (client_credentials)");
    const r = await fetch("https://allegro.pl/auth/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${id}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const j = await r.json().catch(() => ({}));
    log(`Allegro: HTTP ${r.status}`);
    if (r.ok && j.access_token) {
      return { ok: true, message: `OAuth OK (token ważny ${j.expires_in}s)`, latency_ms: Date.now() - start };
    }
    return {
      ok: false,
      message: `Odrzucone (HTTP ${r.status}): ${j.error_description || j.error || "brak szczegółów"}`,
      latency_ms: Date.now() - start,
      details: j,
    };
  } catch (e) {
    return { ok: false, message: `Błąd sieci: ${(e as Error).message}`, latency_ms: Date.now() - start };
  }
}

async function testAliexpress(_: unknown, log: (m: string) => void): Promise<TestResult> {
  const start = Date.now();
  const key = Deno.env.get("ALIEXPRESS_APP_KEY");
  const secret = Deno.env.get("ALIEXPRESS_APP_SECRET");
  const tracking = Deno.env.get("ALIEXPRESS_TRACKING_ID");
  log(`AliExpress: app_key=${key ? "OBECNY" : "BRAK"}, app_secret=${secret ? "OBECNY" : "BRAK"}, tracking=${tracking ? "OBECNY" : "BRAK"}`);
  if (!key || !secret) {
    return { ok: false, message: "Brak sekretów ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET", latency_ms: Date.now() - start };
  }
  return {
    ok: true,
    message: `Sekrety obecne${tracking ? " (+tracking_id)" : ""}. Realny handshake wymaga podpisu MD5 – pominięto.`,
    latency_ms: Date.now() - start,
  };
}

async function testAmazon(_: unknown, log: (m: string) => void): Promise<TestResult> {
  const start = Date.now();
  const ak = Deno.env.get("AMAZON_ACCESS_KEY");
  const sk = Deno.env.get("AMAZON_SECRET_KEY");
  const tag = Deno.env.get("AMAZON_ASSOCIATE_TAG");
  log(`Amazon: access_key=${ak ? "OBECNY" : "BRAK"}, secret_key=${sk ? "OBECNY" : "BRAK"}, associate_tag=${tag ? "OBECNY" : "BRAK"}`);
  if (!ak || !sk || !tag) {
    return { ok: false, message: "Brak jednego z: AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_ASSOCIATE_TAG", latency_ms: Date.now() - start };
  }
  return {
    ok: true,
    message: "Sekrety PA-API obecne. Realny handshake wymaga podpisu AWS SigV4 – pominięto.",
    latency_ms: Date.now() - start,
  };
}

async function testTemu(_: unknown, log: (m: string) => void): Promise<TestResult> {
  const start = Date.now();
  const user = Deno.env.get("TRADEDOUBLER_USERNAME");
  const pass = Deno.env.get("TRADEDOUBLER_PASSWORD");
  const token = Deno.env.get("TRADEDOUBLER_TOKEN");
  log(`Tradedoubler: username=${user ? "OBECNY" : "BRAK"}, password=${pass ? "OBECNY" : "BRAK"}, token=${token ? "OBECNY" : "BRAK"}`);
  if (!token) {
    return { ok: false, message: "Brak sekretu TRADEDOUBLER_TOKEN", latency_ms: Date.now() - start };
  }
  try {
    log("Tradedoubler: GET https://api.tradedoubler.com/1.0/programs.json");
    const r = await fetch(`https://api.tradedoubler.com/1.0/programs.json?token=${token}`);
    log(`Tradedoubler: HTTP ${r.status}`);
    if (r.ok) return { ok: true, message: "Tradedoubler API odpowiedziało 200 OK", latency_ms: Date.now() - start };
    const body = await r.text().catch(() => "");
    return { ok: false, message: `Tradedoubler zwrócił HTTP ${r.status}`, latency_ms: Date.now() - start, details: body.slice(0, 300) };
  } catch (e) {
    return { ok: false, message: `Błąd sieci: ${(e as Error).message}`, latency_ms: Date.now() - start };
  }
}

async function testBankier(admin: ReturnType<typeof createClient>, log: (m: string) => void): Promise<TestResult> {
  return genericPartnerPing(admin, "bankier", log, "https://api.systempartnerski.pl/publishers/financial-products-api");
}

async function genericPartnerPing(
  admin: ReturnType<typeof createClient>,
  partnerId: string,
  log: (m: string) => void,
  defaultUrl?: string,
): Promise<TestResult> {
  const start = Date.now();
  log(`Fallback ping: pobieranie konfiguracji partnera '${partnerId}' z bazy`);
  const { data, error } = await admin
    .from("partner_integrations")
    .select("api_key, base_url, category_api_keys, enabled, display_name")
    .eq("id", partnerId)
    .maybeSingle();
  if (error) {
    log(`DB error: ${error.message}`);
    return { ok: false, message: `Błąd DB: ${error.message}`, latency_ms: Date.now() - start };
  }
  if (!data) {
    return {
      ok: false,
      message: `Partner '${partnerId}' nie istnieje w tabeli partner_integrations. Dodaj go w panelu admina (zakładka Integracje).`,
      latency_ms: Date.now() - start,
    };
  }
  log(`Partner znaleziony: ${data.display_name}, enabled=${data.enabled}`);
  const catKeys = (data.category_api_keys || {}) as Record<string, string>;
  const catKeyEntries = Object.entries(catKeys).filter(([, v]) => !!v);
  const hasAnyKey = !!data.api_key || catKeyEntries.length > 0;
  log(`Klucze: global=${data.api_key ? "TAK" : "NIE"}, per-kategoria=${catKeyEntries.length}`);
  if (!hasAnyKey) {
    return {
      ok: false,
      message: "Brak skonfigurowanego API key (globalnego ani per-kategoria). Uzupełnij w zakładce Integracje.",
      latency_ms: Date.now() - start,
    };
  }
  const url = data.base_url || defaultUrl;
  if (!url) {
    return {
      ok: false,
      message: "Brak base_url w konfiguracji partnera i brak domyślnego endpointu.",
      latency_ms: Date.now() - start,
    };
  }
  const key = data.api_key || catKeyEntries[0][1];
  try {
    log(`Ping: GET ${url}`);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    log(`HTTP ${r.status}`);
    if (r.status < 500) {
      return {
        ok: true,
        message: `Endpoint odpowiedział HTTP ${r.status}. Klucz(e) API obecne (${catKeyEntries.length + (data.api_key ? 1 : 0)}).`,
        latency_ms: Date.now() - start,
      };
    }
    const body = await r.text().catch(() => "");
    return {
      ok: false,
      message: `Endpoint zwrócił HTTP ${r.status} (błąd serwera partnera).`,
      latency_ms: Date.now() - start,
      details: body.slice(0, 300),
    };
  } catch (e) {
    return { ok: false, message: `Błąd sieci przy pingowaniu ${url}: ${(e as Error).message}`, latency_ms: Date.now() - start };
  }
}

const TESTERS: Record<string, (admin: ReturnType<typeof createClient>, log: (m: string) => void) => Promise<TestResult>> = {
  allegro: testAllegro,
  aliexpress: testAliexpress,
  amazon: testAmazon,
  temu: testTemu,
  bankier: testBankier,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const logs: string[] = [];
  const log = (m: string) => {
    console.log(`[test-partner-connection] ${m}`);
    logs.push(m);
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized", logs }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized", logs }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden", logs }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bodyJson = await req.json().catch(() => ({}));
    const rawSlug = (bodyJson as { partner_id?: unknown }).partner_id;
    const slug = normalizeSlug(rawSlug);
    log(`Otrzymano partner_id="${String(rawSlug)}" → znormalizowane="${slug}"`);
    if (!slug) {
      return new Response(JSON.stringify({
        ok: false,
        message: "Brak parametru partner_id w body żądania.",
        latency_ms: 0,
        logs,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const canonical = SLUG_ALIASES[slug] ?? slug;
    if (canonical !== slug) log(`Alias: '${slug}' → '${canonical}'`);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tester = TESTERS[canonical];
    if (!tester) {
      log(`Brak dedykowanego testera dla '${canonical}' — próba fallback generic ping z bazy`);
      // sprawdź czy partner istnieje w bazie, jeśli tak — ping generyczny
      const { data: exists } = await adminClient
        .from("partner_integrations")
        .select("id")
        .eq("id", canonical)
        .maybeSingle();
      if (!exists) {
        return new Response(JSON.stringify({
          ok: false,
          message: `Nieznany partner '${canonical}'. Obsługiwane dedykowane testery: ${Object.keys(TESTERS).join(", ")}. Aby dodać nowego partnera, wpisz go w tabeli partner_integrations (zakładka Integracje w panelu admina) — wtedy zostanie użyty uniwersalny ping.`,
          latency_ms: 0,
          supported: Object.keys(TESTERS),
          logs,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      tester = (admin, l) => genericPartnerPing(admin, canonical, l);
    }

    const result = await tester(adminClient, log);
    return new Response(JSON.stringify({ ...result, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log(`EXCEPTION: ${(e as Error).message}`);
    return new Response(JSON.stringify({ ok: false, message: (e as Error).message, latency_ms: 0, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
