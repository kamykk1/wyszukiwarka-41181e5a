import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Publiczna lista nagród dostępnych w programie lojalnościowym
 * netszukacz.pl (do wymiany za punkty).
 */
export default defineTool({
  name: "list_rewards",
  title: "Lista nagród",
  description:
    "Zwraca listę nagród dostępnych do wymiany za punkty w programie lojalnościowym netszukacz.pl.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Maksymalna liczba nagród (domyślnie 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const env = (globalThis as any).process?.env ?? {};
    const url = env.SUPABASE_URL || "https://rsfieaipypagioylevbp.supabase.co";
    const key =
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZmllYWlweXBhZ2lveWxldmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjY4NzMsImV4cCI6MjA4NjI0Mjg3M30.jSWFy1LoKw1hSBnsNQaLx_ud-rYyV0Frc1R3mCV--OA";

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("rewards")
      .select("id, name, description, points_cost, stock, image_url, category")
      .eq("active", true)
      .order("points_cost", { ascending: true })
      .limit(limit ?? 25);

    if (error) {
      return {
        content: [{ type: "text", text: `Błąd pobierania nagród: ${error.message}` }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Dostępnych nagród: ${data?.length ?? 0}.`,
        },
      ],
      structuredContent: { count: data?.length ?? 0, rewards: data ?? [] },
    };
  },
});
