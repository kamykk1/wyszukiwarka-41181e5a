import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitize(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "NetSzukacz <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend error [${res.status}]: ${body}`);
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  konta_osobiste: "Konto osobiste",
  konta_firmowe: "Konto firmowe",
  konta_oszczednosciowe: "Konto oszczędnościowe",
  kredyty_hipoteczne: "Kredyt hipoteczny",
  kredyty_gotowkowe: "Kredyt gotówkowy",
  kredyty_konsolidacyjne: "Kredyt konsolidacyjny",
  lokaty: "Lokata",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), { status: 401, headers: corsHeaders });
    }

    // Validate API key format
    if (apiKey.length < 10 || apiKey.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid API key format" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }

    const { user_email, task_type, external_task_id, product_id, category, amount } = body;

    // Input validation
    if (!user_email || !task_type || !external_task_id) {
      return new Response(
        JSON.stringify({ error: "user_email, task_type, and external_task_id are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize inputs
    const cleanEmail = sanitize(user_email).toLowerCase();
    const cleanTaskType = sanitize(task_type);
    const cleanExternalId = sanitize(external_task_id);
    const cleanCategory = category ? sanitize(category) : null;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400, headers: corsHeaders });
    }

    // Validate amount if provided
    let numAmount: number | null = null;
    if (amount !== undefined && amount !== null) {
      numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 0 || numAmount > 100_000_000) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: corsHeaders });
      }
    }

    // Rate limiting: check for duplicate within 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTask } = await supabase
      .from("partner_tasks")
      .select("id")
      .eq("external_task_id", cleanExternalId)
      .eq("status", "confirmed")
      .gte("created_at", fiveMinAgo)
      .maybeSingle();

    if (recentTask) {
      return new Response(
        JSON.stringify({ error: "Duplicate task within dedup window" }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Fetch all enabled partners to match API key
    const { data: partners, error: partnersErr } = await supabase
      .from("partner_integrations")
      .select("id, display_name, enabled, task_points, category_points, api_key, category_api_keys, category_calc_mode")
      .eq("enabled", true);

    if (partnersErr || !partners || partners.length === 0) {
      return new Response(JSON.stringify({ error: "No enabled partners found" }), { status: 403, headers: corsHeaders });
    }

    // Match partner by: 1) category-specific API key, 2) global API key
    let matchedPartner: typeof partners[0] | null = null;
    let matchedCategory: string | null = cleanCategory;

    for (const p of partners) {
      if (cleanCategory && p.category_api_keys && typeof p.category_api_keys === "object") {
        const catKeys = p.category_api_keys as Record<string, string>;
        if (catKeys[cleanCategory] === apiKey) {
          matchedPartner = p;
          matchedCategory = cleanCategory;
          break;
        }
      }

      if (!matchedPartner && p.category_api_keys && typeof p.category_api_keys === "object") {
        const catKeys = p.category_api_keys as Record<string, string>;
        for (const [cat, key] of Object.entries(catKeys)) {
          if (key === apiKey) {
            matchedPartner = p;
            matchedCategory = cat;
            break;
          }
        }
        if (matchedPartner) break;
      }

      if (p.api_key === apiKey) {
        matchedPartner = p;
        break;
      }
    }

    if (!matchedPartner) {
      return new Response(JSON.stringify({ error: "Invalid or disabled partner API key" }), { status: 403, headers: corsHeaders });
    }

    // Find user by email
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = userList?.users?.find(u => u.email === cleanEmail);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
    }

    // Determine points: product-level > category_points > task_points
    let basePoints = matchedPartner.task_points;
    if (matchedCategory && matchedPartner.category_points && typeof matchedPartner.category_points === "object") {
      const catPoints = (matchedPartner.category_points as Record<string, number>)[matchedCategory];
      if (catPoints !== undefined && catPoints !== null) {
        basePoints = catPoints;
      }
    }

    // Check if a specific product has custom points_reward
    if (product_id) {
      const { data: productData } = await supabase
        .from("financial_products")
        .select("points_reward")
        .eq("id", product_id)
        .maybeSingle();
      if (productData?.points_reward != null) {
        basePoints = productData.points_reward;
      }
    }

    // Apply calculation mode: "flat" (default) or "per_1000"
    let points = basePoints;
    const calcModes = (matchedPartner.category_calc_mode || {}) as Record<string, string>;
    const calcMode = matchedCategory ? (calcModes[matchedCategory] || "flat") : "flat";

    if (calcMode === "per_1000" && numAmount && numAmount > 0) {
      points = Math.floor(basePoints * (numAmount / 1000));
      if (points < 1) points = 1;
    }

    // Cap maximum points per single transaction
    if (points > 1_000_000) points = 1_000_000;

    // Award points
    const { data: result, error: rpcErr } = await supabase.rpc("award_partner_task_points", {
      _user_id: targetUser.id,
      _partner_id: matchedPartner.id,
      _task_type: cleanTaskType,
      _external_task_id: cleanExternalId,
      _product_id: product_id || null,
      _override_points: points,
    });

    if (rpcErr) {
      console.error("RPC error:", rpcErr.message);
      return new Response(JSON.stringify({ error: "Failed to award points" }), { status: 500, headers: corsHeaders });
    }

    // Fetch email template from DB
    const { data: tplData } = await supabase
      .from("email_templates")
      .select("subject_template, html_template")
      .eq("id", "partner_points")
      .maybeSingle();

    const categoryLabel = matchedCategory ? (CATEGORY_LABELS[matchedCategory] || matchedCategory) : cleanTaskType;
    const amountInfo = calcMode === "per_1000" && numAmount
      ? `<p>Kwota transakcji: <strong>${numAmount.toLocaleString("pl-PL")} zł</strong></p>`
      : "";

    const tplVars: Record<string, string> = {
      points: String(points),
      category: categoryLabel,
      partner_name: matchedPartner.display_name,
      amount_info: amountInfo,
    };

    let emailSubject: string;
    let emailHtml: string;

    if (tplData) {
      emailSubject = tplData.subject_template;
      emailHtml = tplData.html_template;
      for (const [key, val] of Object.entries(tplVars)) {
        emailSubject = emailSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
        emailHtml = emailHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
      }
    } else {
      emailSubject = `🎉 Otrzymałeś ${points} punktów w NetSzukacz!`;
      emailHtml = `<div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #f97316;">Gratulacje! 🎉</h2>
        <p>Przyznano Ci <strong style="font-size: 1.3em; color: #f97316;">${points} punktów</strong> za:</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>${categoryLabel}</strong></p>
          <p style="margin: 4px 0 0; color: #666;">Partner: ${matchedPartner.display_name}</p>
          ${amountInfo}
        </div>
        <p>Punkty zostały dodane do Twojego konta.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">NetSzukacz.pl — Porównywarka cen i finansów</p>
      </div>`;
    }

    sendEmail(cleanEmail, emailSubject, emailHtml).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        partner: matchedPartner.display_name,
        category: matchedCategory,
        calc_mode: calcMode,
        amount: numAmount,
        points_awarded: points,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("partner-callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
