import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    // 1. Get all users with email notifications enabled
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email_notifications, points_threshold")
      .eq("email_notifications", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check for new rewards added in the last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newRewards } = await supabase
      .from("rewards")
      .select("id, name, points_cost, description")
      .eq("is_active", true)
      .gte("created_at", yesterday);

    // 3. Check point thresholds for each user
    for (const profile of profiles) {
      const { data: points } = await supabase
        .from("user_points")
        .select("balance, total_earned")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (!points) continue;

      const threshold = profile.points_threshold || 500;

      // Check if user just crossed their threshold
      if (points.total_earned >= threshold) {
        // Check if we already notified for this threshold
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("type", "threshold")
          .eq("reference_id", String(threshold))
          .maybeSingle();

        if (!existing) {
          // Get user email
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          if (authUser?.user?.email) {
            // Log notification (email would be sent via external service)
            await supabase.from("notification_log").insert({
              user_id: profile.user_id,
              type: "threshold",
              reference_id: String(threshold),
            });

            results.push(
              `Threshold notification for ${authUser.user.email}: reached ${points.total_earned}/${threshold} points`
            );

            console.log(
              `📧 [THRESHOLD] ${authUser.user.email} reached ${points.total_earned} points (threshold: ${threshold})`
            );
          }
        }
      }

      // Notify about new rewards
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

              results.push(
                `New reward notification for ${authUser.user.email}: "${reward.name}" (${reward.points_cost} pkt)`
              );

              console.log(
                `📧 [NEW REWARD] ${authUser.user.email}: "${reward.name}" available for ${reward.points_cost} points`
              );
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: results.length,
        details: results,
      }),
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
