/**
 * Tradedoubler Transaction Callback / Webhook
 * 
 * Tradedoubler sends conversion notifications via pixel/postback URLs.
 * This endpoint receives them and awards points to matching users.
 *
 * URL format (configure in Tradedoubler panel):
 * https://<project>.supabase.co/functions/v1/tradedoubler-callback
 *
 * Tradedoubler postback parameters (standard):
 *   - orderNumber / orderId    - unique transaction ID
 *   - orderValue / orderAmount - order value
 *   - currency                 - currency code
 *   - programId                - TD program ID
 *   - publisherRef / epi1      - use this to pass user identifier (email or user_id)
 *   - status                   - transaction status (pending/approved/declined)
 *   - commissionAmount         - commission earned
 * 
 * Setup in Tradedoubler:
 * 1. Go to your program tracking settings
 * 2. Set postback URL to this endpoint
 * 3. Pass user email via epi1/publisherRef parameter in your affiliate links:
 *    https://track.tradedoubler.com/track?program=XXXXX&epi1=USER_EMAIL&...
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate shared secret
    const webhookSecret = Deno.env.get("TRADEDOUBLER_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("TRADEDOUBLER_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ success: false, error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check secret from header or query param
    const providedSecret = req.headers.get("x-webhook-secret") || new URL(req.url).searchParams.get("secret");
    if (providedSecret !== webhookSecret) {
      console.warn("Invalid or missing webhook secret");
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse params from GET (postback pixel) or POST (webhook)
    let params: Record<string, string> = {};

    if (req.method === "GET") {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { params[k] = v; });
    } else if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        params = await req.json();
      } else {
        const text = await req.text();
        new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
      }
    }

    console.log("TD callback received:", JSON.stringify(params));

    // Extract key fields (Tradedoubler uses various param names)
    const orderId = params.orderNumber || params.orderId || params.order_id || params.transactionId;
    const programId = params.programId || params.program_id || params.progId;
    const status = (params.status || params.transactionStatus || "pending").toLowerCase();
    const orderValue = parseFloat(params.orderValue || params.orderAmount || params.amount || "0") || 0;
    const currency = params.currency || "PLN";
    const commissionAmount = parseFloat(params.commissionAmount || params.commission || "0") || 0;

    // User identifier — passed as epi1 (extra parameter 1) or publisherRef in TD links
    const userRef = params.epi1 || params.publisherRef || params.publisher_ref || params.userRef || params.user_ref || params.userId || params.user_id;

    if (!orderId) {
      console.log("Missing orderId, returning 200 OK (TD requires 200 for all callbacks)");
      return new Response(JSON.stringify({ success: false, reason: "missing_order_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process approved/confirmed transactions
    if (status !== "approved" && status !== "confirmed" && status !== "a" && status !== "1") {
      console.log(`Skipping transaction with status: ${status}`);
      return new Response(JSON.stringify({ success: false, reason: `status_${status}_not_actionable` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find store linked to this TD program
    let storeInfo: { id: string; name: string; cashback_rate: number | null } | null = null;
    if (programId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, cashback_rate")
        .eq("tradedoubler_program_id", programId)
        .eq("enabled", true)
        .single();
      storeInfo = store;
    }

    // Resolve user by reference (email or UUID)
    let targetUserId: string | null = null;

    if (userRef) {
      // Try as UUID first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userRef)) {
        targetUserId = userRef;
      } else {
        // Treat as email
        const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const user = userList?.users?.find(u => u.email === userRef);
        if (user) targetUserId = user.id;
      }
    }

    if (!targetUserId) {
      console.log("Could not resolve user from ref:", userRef, "— storing as anonymous transaction");
      // Store the callback for manual review but don't award points
      return new Response(JSON.stringify({
        success: false,
        reason: "user_not_found",
        hint: "Pass user email or UUID as epi1 parameter in Tradedoubler tracking link",
        orderId,
        programId,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find partner integration for Tradedoubler
    const { data: partner } = await supabase
      .from("partner_integrations")
      .select("id, display_name, task_points")
      .eq("id", "tradedoubler")
      .eq("enabled", true)
      .single();

    // Calculate points: prefer cashback-based calculation, fallback to partner task_points
    let pointsToAward = partner?.task_points || 10;

    if (storeInfo?.cashback_rate && orderValue > 0) {
      // Convert cashback % to points: e.g. 5% of 200 PLN = 10 PLN ≈ 1000 points
      const cashbackPLN = (orderValue * storeInfo.cashback_rate) / 100;
      // Use reward settings for point_value_pln conversion
      const { data: rewardSettings } = await supabase
        .from("reward_settings")
        .select("point_value_pln")
        .eq("id", "default")
        .single();
      const pointValue = rewardSettings?.point_value_pln || 0.01;
      pointsToAward = Math.max(1, Math.round(cashbackPLN / pointValue));
    } else if (commissionAmount > 0) {
      // Use actual commission amount
      const { data: rewardSettings } = await supabase
        .from("reward_settings")
        .select("point_value_pln")
        .eq("id", "default")
        .single();
      const pointValue = rewardSettings?.point_value_pln || 0.01;
      pointsToAward = Math.max(1, Math.round(commissionAmount / pointValue));
    }

    // Award points via RPC (handles deduplication)
    const externalTaskId = `td_${orderId}`;
    const partnerId = partner?.id || "tradedoubler";
    const storeName = storeInfo?.name || `TD Program ${programId || "unknown"}`;

    const { data: result, error: rpcErr } = await supabase.rpc("award_partner_task_points", {
      _user_id: targetUserId,
      _partner_id: partnerId,
      _task_type: "purchase",
      _external_task_id: externalTaskId,
      _override_points: pointsToAward,
    });

    if (rpcErr) {
      console.error("RPC error:", rpcErr);
      // Still return 200 to TD
      return new Response(JSON.stringify({ success: false, error: rpcErr.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Points awarded:", result);

    return new Response(JSON.stringify({
      success: true,
      points_awarded: pointsToAward,
      order_id: orderId,
      store: storeName,
      order_value: orderValue,
      currency,
      ...result,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("TD callback error:", error);
    // Always return 200 to Tradedoubler — they retry on non-200
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
