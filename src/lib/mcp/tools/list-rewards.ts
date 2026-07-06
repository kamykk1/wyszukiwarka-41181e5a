import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Lista nagród w programie lojalnościowym netszukacz.pl.
 * Wspiera wyszukiwanie po nazwie, zakres punktów, filtr dostępności
 * (stan magazynowy) oraz stronicowanie (limit + offset)
 * z sortowaniem rosnąco/malejąco po cenie lub dacie utworzenia.
 */
export default defineTool({
  name: "list_rewards",
  title: "Lista nagród",
  description:
    "Zwraca aktywne nagrody dostępne do wymiany za punkty. Obsługuje wyszukiwanie tekstowe, filtr dostępności, zakres kosztu w punktach, sortowanie i stronicowanie (limit + offset).",
  inputSchema: {
    search: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe("Fraza filtrująca po nazwie nagrody (ILIKE)."),
    in_stock_only: z
      .boolean()
      .optional()
      .describe("Jeśli true – zwraca wyłącznie nagrody z dostępnym stanem magazynowym (stock > 0 lub NULL = nielimitowane)."),
    min_points: z.number().int().min(0).optional().describe("Minimalny koszt w punktach."),
    max_points: z.number().int().min(1).optional().describe("Maksymalny koszt w punktach."),
    sort: z
      .enum(["points_asc", "points_desc", "newest"])
      .optional()
      .describe("Kolejność sortowania (domyślnie 'points_asc')."),
    limit: z.number().int().min(1).max(100).optional().describe("Rozmiar strony (domyślnie 25, max 100)."),
    offset: z.number().int().min(0).optional().describe("Przesunięcie strony (domyślnie 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Wymagane zalogowanie (OAuth)." }], isError: true };
    }
    const {
      search,
      in_stock_only,
      min_points,
      max_points,
      sort = "points_asc",
      limit = 25,
      offset = 0,
    } = args;

    const env = (globalThis as any).process?.env ?? {};
    const url = env.SUPABASE_URL!;
    const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("rewards")
      .select("id, name, description, points_cost, stock, image_url, created_at", { count: "exact" })
      .eq("is_active", true);

    if (search) q = q.ilike("name", `%${search}%`);
    if (typeof min_points === "number") q = q.gte("points_cost", min_points);
    if (typeof max_points === "number") q = q.lte("points_cost", max_points);
    if (in_stock_only) q = q.or("stock.is.null,stock.gt.0");

    if (sort === "points_desc") q = q.order("points_cost", { ascending: false });
    else if (sort === "newest") q = q.order("created_at", { ascending: false });
    else q = q.order("points_cost", { ascending: true });

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Błąd: ${error.message}` }], isError: true };
    }

    const total = count ?? 0;
    return {
      content: [{
        type: "text",
        text: `Zwrócono ${data?.length ?? 0} z ${total} nagród (offset=${offset}, limit=${limit}).`,
      }],
      structuredContent: {
        total,
        offset,
        limit,
        has_more: offset + (data?.length ?? 0) < total,
        rewards: data ?? [],
      },
    };
  },
});
