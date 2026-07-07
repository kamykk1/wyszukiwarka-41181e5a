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

/**
 * Usuwa ofertę z ulubionych. Można podać `favorite_id` (UUID rekordu)
 * lub `product_name` (identyfikator produktu). Zwraca status i odświeżoną listę.
 */
export default defineTool({
  name: "remove_favorite",
  title: "Usuń z ulubionych",
  description:
    "Usuwa ofertę z ulubionych zalogowanego użytkownika po `favorite_id` lub `product_name`. Zwraca status ('removed' lub 'not_found') oraz aktualną listę ulubionych po operacji.",
  inputSchema: {
    favorite_id: z.string().uuid().optional().describe("UUID rekordu w tabeli favorites."),
    product_name: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe("Alternatywnie: identyfikator/nazwa produktu do usunięcia."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ favorite_id, product_name }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    if (!favorite_id && !product_name) {
      return {
        content: [{ type: "text", text: "Podaj `favorite_id` lub `product_name`." }],
        isError: true,
      };
    }
    const supabase = userClient(ctx);
    const userId = ctx.getUserId();

    let del = supabase.from("favorites").delete({ count: "exact" }).eq("user_id", userId);
    if (favorite_id) del = del.eq("id", favorite_id);
    if (product_name) del = del.eq("product_name", product_name);
    const { error: delErr, count: deleted } = await del.select("id");
    if (delErr) return { content: [{ type: "text", text: delErr.message }], isError: true };

    const status: "removed" | "not_found" = (deleted ?? 0) > 0 ? "removed" : "not_found";

    const { data: favorites, error: listErr, count } = await supabase
      .from("favorites")
      .select("id, product_name, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, 24);
    if (listErr) return { content: [{ type: "text", text: listErr.message }], isError: true };

    return {
      content: [
        {
          type: "text",
          text:
            status === "removed"
              ? `Usunięto z ulubionych (pozostało: ${count ?? 0}).`
              : `Nie znaleziono pasującego wpisu w ulubionych.`,
        },
      ],
      structuredContent: {
        status,
        removed_count: deleted ?? 0,
        total: count ?? 0,
        favorites: favorites ?? [],
      },
    };
  },
});
