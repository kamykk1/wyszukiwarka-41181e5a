import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function userClient(ctx: ToolContext) {
  const env = (globalThis as any).process?.env ?? {};
  return createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_points",
  title: "Moje punkty",
  description:
    "Zwraca saldo punktów zalogowanego użytkownika (balance), sumę zdobytych punktów (total_earned), aktualną serię dni aktywności oraz kilka ostatnich transakcji punktowych.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    const supabase = userClient(ctx);

    const [pointsRes, streakRes, txRes] = await Promise.all([
      supabase.from("user_points").select("balance, total_earned, updated_at").eq("user_id", ctx.getUserId()).maybeSingle(),
      supabase.from("user_streaks").select("current_streak, longest_streak, last_activity_date").eq("user_id", ctx.getUserId()).maybeSingle(),
      supabase.from("points_transactions").select("amount, type, description, created_at").eq("user_id", ctx.getUserId()).order("created_at", { ascending: false }).limit(10),
    ]);

    if (pointsRes.error) return { content: [{ type: "text", text: pointsRes.error.message }], isError: true };

    const points = pointsRes.data ?? { balance: 0, total_earned: 0 };
    return {
      content: [{ type: "text", text: `Saldo: ${points.balance ?? 0} pkt · zdobyte łącznie: ${points.total_earned ?? 0} pkt.` }],
      structuredContent: {
        user_id: ctx.getUserId(),
        points,
        streak: streakRes.data ?? null,
        recent_transactions: txRes.data ?? [],
      },
    };
  },
});
