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
 * Dodaje ofertę do ulubionych zalogowanego użytkownika.
 * Zwraca status (`added` | `already_exists`) i aktualną listę ulubionych.
 */
export default defineTool({
  name: "add_favorite",
  title: "Dodaj do ulubionych",
  description:
    "Dodaje ofertę (product_name) do ulubionych zalogowanego użytkownika. Zwraca status ('added' lub 'already_exists') oraz aktualną listę ulubionych po operacji.",
  inputSchema: {
    product_name: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe("Identyfikator/nazwa produktu, który ma zostać zapisany w ulubionych."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_name }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    const supabase = userClient(ctx);
    const userId = ctx.getUserId();

    const { data: existing, error: existErr } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("product_name", product_name)
      .maybeSingle();
    if (existErr) return { content: [{ type: "text", text: existErr.message }], isError: true };

    let status: "added" | "already_exists" = "already_exists";
    if (!existing) {
      const { error: insErr } = await supabase
        .from("favorites")
        .insert({ user_id: userId, product_name });
      if (insErr) return { content: [{ type: "text", text: insErr.message }], isError: true };
      status = "added";
    }

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
            status === "added"
              ? `Dodano "${product_name}" do ulubionych (łącznie: ${count ?? 0}).`
              : `"${product_name}" był już w ulubionych (łącznie: ${count ?? 0}).`,
        },
      ],
      structuredContent: {
        status,
        product_name,
        total: count ?? 0,
        favorites: favorites ?? [],
      },
    };
  },
});
