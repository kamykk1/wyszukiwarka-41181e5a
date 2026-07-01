// Test połączenia z API partnera. Admin-only.
// Zwraca {ok, message, latency_ms, details?}.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TestResult = { ok: boolean; message: string; latency_ms: number; details?: unknown };

async function testAllegro(): Promise<TestResult> {
  const start = Date.now();
  const id = Deno.env.get("ALLEGRO_CLIENT_ID");
  const secret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
  if (!id || !secret) {
    return { ok: false, message: "Brak sekretów ALLEGRO_CLIENT_ID / ALLEGRO_CLIENT_SECRET", latency_ms: Date.now() - start };
  }
  try {
    const r = await fetch("https://allegro.pl/auth/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${id}:${secret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.access_token) {
      return { ok: true, message: `OAuth OK (token ważny ${j.expires_in}s)`, latency_ms: Date.now() - start };
    }
    return { ok: false, message: `Odrzucone: ${j.error_description || j.error || r.status}`, latency_ms: Date.now() - start };
  } catch (e) {
    return { ok: false, message: `Błąd sieci: ${(e as Error).message}`, latency_ms: Date.now() - start };
  }
}

async function testAliexpress(): Promise<TestResult> {
  const start = Date.now();
  const key = Deno.env.get("ALIEXPRESS_APP_KEY");
  const secret = Deno.env.get("ALIEXPRESS_APP_SECRET");
  const tracking = Deno.env.get("ALIEXPRESS_TRACKING_ID");
  if (!key || !secret) {
    return { ok: false, message: "Brak sekretów ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET", latency_ms: Date.now() - start };
  }
  return {
    ok: true,
    message: `Sekrety obecne${tracking ? " (+tracking_id)" : ""}. Realny handshake wymaga podpisu MD5 – pominięto.`,
    latency_ms: Date.now() - start,
  };
}

async function testAmazon(): Promise<TestResult> {
  const start = Date.now();
  const ak = Deno.env.get("AMAZON_ACCESS_KEY");
  const sk = Deno.env.get("AMAZON_SECRET_KEY");
  const tag = Deno.env.get("AMAZON_ASSOCIATE_TAG");
  if (!ak || !sk || !tag) {
    return { ok: false, message: "Brak jednego z: AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_ASSOCIATE_TAG", latency_ms: Date.now() - start };
  }
  return {
    ok: true,
    message: "Sekrety PA-API obecne. Realny handshake wymaga podpisu AWS SigV4 – pominięto.",
    latency_ms: Date.now() - start,
  };
}

async function testTemu(): Promise<TestResult> {
  const start = Date.now();
  const user = Deno.env.get("TRADEDOUBLER_USERNAME");
  const pass = Deno.env.get("TRADEDOUBLER_PASSWORD");
  const token = Deno.env.get("TRADEDOUBLER_TOKEN");
  if (!user || !pass || !token) {
    return { ok: false, message: "Brak sekretów Tradedoubler (TRADEDOUBLER_USERNAME/PASSWORD/TOKEN)", latency_ms: Date.now() - start };
  }
  try {
    const r = await fetch(`https://api.tradedoubler.com/1.0/programs.json?token=${token}`);
    if (r.ok) return { ok: true, message: "Tradedoubler API odpowiedziało 200 OK", latency_ms: Date.now() - start };
    return { ok: false, message: `Tradedoubler zwrócił ${r.status}`, latency_ms: Date.now() - start };
  } catch (e) {
    return { ok: false, message: `Błąd sieci: ${(e as Error).message}`, latency_ms: Date.now() - start };
  }
}

const TESTERS: Record<string, () => Promise<TestResult>> = {
  allegro: testAllegro,
  aliexpress: testAliexpress,
  amazon: testAmazon,
  temu: testTemu,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { partner_id } = await req.json().catch(() => ({ partner_id: "" }));
    const tester = TESTERS[partner_id as string];
    if (!tester) {
      return new Response(JSON.stringify({ error: "unknown_partner", supported: Object.keys(TESTERS) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await tester();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: (e as Error).message, latency_ms: 0 }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
