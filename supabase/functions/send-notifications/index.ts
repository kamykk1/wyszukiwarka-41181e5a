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
      from: "SmartPrice <onboarding@resend.dev>",
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
    // Authenticate cron invocation
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== Deno.env.get("CRON_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email_notifications, points_threshold")
      .eq("email_notifications", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newRewards } = await supabase
      .from("rewards")
      .select("id, name, points_cost, description")
      .eq("is_active", true)
      .gte("created_at", yesterday);

    for (const profile of profiles) {
      const { data: points } = await supabase
        .from("user_points")
        .select("balance, total_earned")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (!points) continue;

      const threshold = profile.points_threshold || 500;

      if (points.total_earned >= threshold) {
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("type", "threshold")
          .eq("reference_id", String(threshold))
          .maybeSingle();

        if (!existing) {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          if (authUser?.user?.email) {
            await supabase.from("notification_log").insert({
              user_id: profile.user_id,
              type: "threshold",
              reference_id: String(threshold),
            });

            await sendEmail(
              authUser.user.email,
              `🎉 Osiągnięto ${threshold} punktów w SmartPrice!`,
              `<h2>Gratulacje${profile.name ? `, ${profile.name}` : ""}!</h2>
               <p>Zdobyłeś już <strong>${points.total_earned}</strong> punktów w programie SmartPrice.</p>
               <p>Sprawdź dostępne nagrody w naszym katalogu!</p>`
            );

            results.push(`Threshold email → ${authUser.user.email}: ${points.total_earned}/${threshold}`);
          }
        }
      }

      if (newRewards && newRewards.length > 0) {
        for (const reward of newRewards) {
          const { data: existing } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("type", "new_reward")
            .eq("reference_id", reward.id)
            .maybeSingle();

          if (!existing) {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            if (authUser?.user?.email) {
              await supabase.from("notification_log").insert({
                user_id: profile.user_id,
                type: "new_reward",
                reference_id: reward.id,
              });

              await sendEmail(
                authUser.user.email,
                `🎁 Nowa nagroda w SmartPrice: ${reward.name}`,
                `<h2>Nowa nagroda dostępna!</h2>
                 <p><strong>${reward.name}</strong> — ${reward.points_cost} punktów</p>
                 ${reward.description ? `<p>${reward.description}</p>` : ""}
                 <p>Zaloguj się i odbierz swoją nagrodę!</p>`
              );

              results.push(`New reward email → ${authUser.user.email}: "${reward.name}"`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
