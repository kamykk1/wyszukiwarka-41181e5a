import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { escapeHtml, sanitizeHtml } from "./sanitize.ts";

// Re-export for backwards compatibility (older tests import from index.ts)
export { escapeHtml, sanitizeHtml };


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------- Input validation ----------------

const BodySchema = z.object({
  campaign_id: z.string().uuid("campaign_id must be a UUID"),
  subject: z.string().trim().min(1, "subject required").max(300, "subject too long"),
  message: z.string().max(20000, "message too long").default(""),
  audience: z.enum(["all", "active", "new"]).default("all"),
  points_reward: z.number().int().min(0).max(10000).default(0),
  html_template: z.string().max(100000, "html_template too long").optional(),
});

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("[send-mailing] RESEND_API_KEY not set, skipping email");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
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
    console.error(`[send-mailing] Resend error [${res.status}]: ${body}`);
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 500)}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabaseUser.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // -------- Parse & validate body --------
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_e) {
      console.warn("[send-mailing] invalid JSON body", { userId });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      console.warn("[send-mailing] validation failed", {
        userId,
        fieldErrors,
        received_keys: rawBody && typeof rawBody === "object" ? Object.keys(rawBody as object) : [],
      });
      // Best-effort audit row if we at least have a campaign_id
      const maybeCampaign =
        rawBody && typeof rawBody === "object" && "campaign_id" in rawBody
          ? String((rawBody as Record<string, unknown>).campaign_id ?? "")
          : "";
      if (maybeCampaign && /^[0-9a-f-]{36}$/i.test(maybeCampaign)) {
        await supabase.from("mailing_send_audit").insert({
          campaign_id: maybeCampaign,
          status: "validation_error",
          error_message: JSON.stringify(fieldErrors).slice(0, 2000),
          sent_by: userId,
        });
      }
      return new Response(
        JSON.stringify({ error: "Validation failed", details: fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { campaign_id, subject, message, audience, points_reward, html_template } = parsed.data;

    console.log("[send-mailing] starting", { campaign_id, audience, points_reward, sent_by: userId });

    // If no custom template provided, fetch from DB
    let template = html_template;
    if (!template) {
      const { data: tplData } = await supabase
        .from("email_templates")
        .select("html_template")
        .eq("id", "mailing_default")
        .maybeSingle();
      template = tplData?.html_template || `<h2>{{subject}}</h2><p>Cześć {{name}}!</p><div>{{message}}</div>{{click_button}}<hr/><p style="color:#999;font-size:12px;">NetSzukacz.pl — porównywarka cen i finansów</p>`;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, first_name")
      .eq("email_notifications", true);

    if (!profiles || profiles.length === 0) {
      console.log("[send-mailing] no recipients", { campaign_id });
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const appUrl = supabaseUrl.replace(".supabase.co", "").includes("rsfieaipypagioylevbp")
      ? "https://wyszukiwarka.lovable.app"
      : supabaseUrl;

    // Sanitize admin-provided template and message; escape plain-text fields
    const safeTemplate = sanitizeHtml(template);
    const safeSubject = escapeHtml(subject);
    const safeMessage = sanitizeHtml(String(message ?? "")).replace(/\n/g, "<br/>");

    const auditRows: Array<Record<string, unknown>> = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) {
        skipped++;
        auditRows.push({
          campaign_id,
          recipient_user_id: profile.user_id,
          recipient_email: null,
          status: "skipped_no_email",
          sent_by: userId,
        });
        continue;
      }

      const userName = escapeHtml(profile.first_name || profile.name || "");
      const clickButton = points_reward > 0
        ? `<p><a href="${appUrl}/mailing-click?campaign=${encodeURIComponent(campaign_id)}" style="display:inline-block;padding:10px 20px;background:#ff6b35;color:white;text-decoration:none;border-radius:6px;">Odbierz ${Number(points_reward) || 0} punktów →</a></p>`
        : "";

      const finalHtml = safeTemplate
        .replace(/\{\{subject\}\}/g, safeSubject)
        .replace(/\{\{name_greeting\}\}/g, userName ? `, ${userName}` : "")
        .replace(/\{\{name\}\}/g, userName)
        .replace(/\{\{message\}\}/g, safeMessage)
        .replace(/\{\{click_button\}\}/g, clickButton);

      const result = await sendEmail(email, subject, finalHtml);

      if (result.ok) {
        sent++;
        auditRows.push({
          campaign_id,
          recipient_user_id: profile.user_id,
          recipient_email: email,
          status: "sent",
          sent_by: userId,
        });

        await supabase.from("notification_log").insert({
          user_id: profile.user_id,
          type: "mailing",
          reference_id: campaign_id,
        });
      } else {
        failed++;
        auditRows.push({
          campaign_id,
          recipient_user_id: profile.user_id,
          recipient_email: email,
          status: "failed",
          error_message: result.error?.slice(0, 2000) ?? "unknown",
          sent_by: userId,
        });
      }
    }

    // Bulk-insert audit rows in chunks
    if (auditRows.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < auditRows.length; i += CHUNK) {
        const { error: auditError } = await supabase
          .from("mailing_send_audit")
          .insert(auditRows.slice(i, i + CHUNK));
        if (auditError) {
          console.error("[send-mailing] audit insert failed", auditError);
        }
      }
    }

    console.log("[send-mailing] done", { campaign_id, sent, failed, skipped, total: profiles.length });

    return new Response(
      JSON.stringify({ success: true, sent, failed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-mailing] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
