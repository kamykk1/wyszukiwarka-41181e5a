import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  const env = (globalThis as any).process?.env ?? {};
  return createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_redemptions",
  title: "Moja historia wymian nagród",
  description:
    "Zwraca historię wymian nagród zalogowanego użytkownika (koszt punktowy, status, data). Wspiera stronicowanie i filtr statusu.",
  inputSchema: {
    status: z.enum(["pending", "processing", "shipped", "completed", "cancelled"]).optional()
      .describe("Opcjonalny filtr statusu wymiany."),
    limit: z.number().int().min(1).max(100).optional().describe("Rozmiar strony (domyślnie 25)."),
    offset: z.number().int().min(0).optional().describe("Przesunięcie strony (domyślnie 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit = 25, offset = 0 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    const supabase = userClient(ctx);

    let q = supabase
      .from("reward_redemptions")
      .select("id, points_spent, status, created_at, reward:rewards(id, name, points_cost, image_url)", { count: "exact" })
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const total = count ?? 0;
    const totalSpent = (data ?? []).reduce((sum: number, r: any) => sum + (r.points_spent ?? 0), 0);
    return {
      content: [{ type: "text", text: `Wymian: ${data?.length ?? 0} z ${total} (widoczne = ${totalSpent} pkt).` }],
      structuredContent: {
        total,
        offset,
        limit,
        has_more: offset + (data?.length ?? 0) < total,
        redemptions: data ?? [],
      },
    };
  },
});
