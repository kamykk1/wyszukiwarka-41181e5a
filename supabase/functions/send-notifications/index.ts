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

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Fetch email templates
    const { data: tplData } = await supabase
      .from("email_templates")
      .select("id, subject_template, html_template")
      .in("id", ["threshold_reached", "new_reward", "streak_expiring"]);

    const tplMap = new Map<string, { subject: string; html: string }>();
    (tplData || []).forEach((t: any) => tplMap.set(t.id, { subject: t.subject_template, html: t.html_template }));

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

            const tpl = tplMap.get("threshold_reached");
            const vars = {
              threshold: String(threshold),
              name_greeting: profile.name ? `, ${profile.name}` : "",
              total_earned: String(points.total_earned),
            };

            const emailSubject = tpl ? renderTemplate(tpl.subject, vars) : `🎉 Osiągnięto ${threshold} punktów!`;
            const emailHtml = tpl
              ? renderTemplate(tpl.html, vars)
              : `<h2>Gratulacje${vars.name_greeting}!</h2><p>Zdobyłeś już <strong>${points.total_earned}</strong> punktów.</p>`;

            await sendEmail(authUser.user.email, emailSubject, emailHtml);
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

              const tpl = tplMap.get("new_reward");
              const vars = {
                reward_name: reward.name,
                points_cost: String(reward.points_cost),
                reward_description: reward.description ? `<p>${reward.description}</p>` : "",
              };

              const emailSubject = tpl ? renderTemplate(tpl.subject, vars) : `🎁 Nowa nagroda: ${reward.name}`;
              const emailHtml = tpl
                ? renderTemplate(tpl.html, vars)
                : `<h2>Nowa nagroda!</h2><p><strong>${reward.name}</strong> — ${reward.points_cost} pkt</p>`;

              await sendEmail(authUser.user.email, emailSubject, emailHtml);
              results.push(`New reward email → ${authUser.user.email}: "${reward.name}"`);
            }
          }
        }
      }

      // --- Streak expiring notifications ---
      // Check if user has a streak >= 3 and last_activity_date = yesterday (i.e. they need to act TODAY)
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak, last_activity_date")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (streakData && streakData.current_streak >= 3) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActivity = new Date(streakData.last_activity_date);
        lastActivity.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // If last activity was yesterday, streak is at risk today
        if (diffDays === 1) {
          const todayStr = today.toISOString().split("T")[0];
          const { data: alreadySent } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("type", "streak_expiring")
            .eq("reference_id", todayStr)
            .maybeSingle();

          if (!alreadySent) {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            if (authUser?.user?.email) {
              await supabase.from("notification_log").insert({
                user_id: profile.user_id,
                type: "streak_expiring",
                reference_id: todayStr,
              });

              const tpl = tplMap.get("streak_expiring");
              const vars = {
                streak_days: String(streakData.current_streak),
                name_greeting: profile.name ? `, ${profile.name}` : "",
              };

              const emailSubject = tpl
                ? renderTemplate(tpl.subject, vars)
                : `🔥 Twoja seria ${streakData.current_streak} dni wygasa dziś!`;
              const emailHtml = tpl
                ? renderTemplate(tpl.html, vars)
                : `<h2>Nie trać swojej serii${vars.name_greeting}!</h2><p>Masz serię <strong>${streakData.current_streak} dni</strong> aktywności. Wejdź dziś na stronę, żeby jej nie stracić!</p><p><a href="https://wyszukiwarka.lovable.app/moje-punkty">Sprawdź swoje punkty →</a></p>`;

              await sendEmail(authUser.user.email, emailSubject, emailHtml);
              results.push(`Streak expiring email → ${authUser.user.email}: ${streakData.current_streak} days`);
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
