import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
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
    console.error(`Resend error [${res.status}]: ${body}`);
  }
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
    const { campaign_id, subject, message, audience, points_reward, html_template } = await req.json();

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
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const appUrl = supabaseUrl.replace(".supabase.co", "").includes("rsfieaipypagioylevbp")
      ? "https://wyszukiwarka.lovable.app"
      : supabaseUrl;

    let sent = 0;
    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user?.email) continue;

      const userName = profile.first_name || profile.name || "";
      const clickButton = points_reward > 0
        ? `<p><a href="${appUrl}/mailing-click?campaign=${campaign_id}" style="display:inline-block;padding:10px 20px;background:#ff6b35;color:white;text-decoration:none;border-radius:6px;">Odbierz ${points_reward} punktów →</a></p>`
        : "";

      const finalHtml = template
        .replace(/\{\{subject\}\}/g, subject)
        .replace(/\{\{name\}\}/g, userName)
        .replace(/\{\{message\}\}/g, message.replace(/\n/g, "<br/>"))
        .replace(/\{\{click_button\}\}/g, clickButton);

      await sendEmail(authUser.user.email, subject, finalHtml);

      await supabase.from("notification_log").insert({
        user_id: profile.user_id,
        type: "mailing",
        reference_id: campaign_id,
      });

      sent++;
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mailing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
