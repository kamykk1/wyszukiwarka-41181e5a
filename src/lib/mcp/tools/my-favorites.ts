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
  name: "my_favorites",
  title: "Moje ulubione oferty",
  description:
    "Zwraca listę produktów dodanych do ulubionych przez zalogowanego użytkownika, z sortowaniem po dacie dodania oraz stronicowaniem.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Rozmiar strony (domyślnie 25)."),
    offset: z.number().int().min(0).optional().describe("Przesunięcie strony (domyślnie 0)."),
    sort: z.enum(["newest", "oldest"]).optional().describe("Kolejność (domyślnie 'newest')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit = 25, offset = 0, sort = "newest" }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data, error, count } = await supabase
      .from("favorites")
      .select("id, product_name, created_at", { count: "exact" })
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: sort === "oldest" })
      .range(offset, offset + limit - 1);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const total = count ?? 0;
    return {
      content: [{ type: "text", text: `Ulubione: ${data?.length ?? 0} z ${total}.` }],
      structuredContent: {
        total,
        offset,
        limit,
        has_more: offset + (data?.length ?? 0) < total,
        favorites: data ?? [],
      },
    };
  },
});
