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
 * Zwraca pełne szczegóły nagrody: opis, wymagane punkty, stan magazynowy,
 * status aktywności, program (globalne `reward_settings`), pozostałe limity
 * (dostępność względem stanu magazynowego) oraz saldo punktów zalogowanego
 * użytkownika, jeśli podpięty jest ważny token.
 */
export default defineTool({
  name: "reward_details",
  title: "Szczegóły nagrody",
  description:
    "Zwraca szczegóły pojedynczej nagrody po `reward_id`: opis, koszt w punktach, dostępność (stock, is_active), globalne ustawienia programu lojalnościowego oraz — jeśli użytkownik jest zalogowany — jego saldo punktów i informację, czy stać go na wymianę. Zwraca czytelny błąd, gdy nagroda nie istnieje lub jest nieaktywna.",
  inputSchema: {
    reward_id: z.string().uuid().describe("UUID nagrody w tabeli `rewards`."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ reward_id }, ctx) => {
    // reward_details działa też bez logowania (katalog jest publiczny),
    // ale saldo użytkownika dołączamy tylko dla zalogowanych.
    const env = (globalThis as any).process?.env ?? {};
    const supabase = ctx.isAuthenticated()
      ? userClient(ctx)
      : createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

    const { data: reward, error } = await supabase
      .from("rewards")
      .select("id, name, description, points_cost, stock, image_url, is_active, created_at, updated_at")
      .eq("id", reward_id)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Błąd bazy danych: ${error.message}` }], isError: true };
    }
    if (!reward) {
      return {
        content: [{ type: "text", text: `Nagroda ${reward_id} nie została znaleziona.` }],
        isError: true,
        structuredContent: { error: "not_found", reward_id },
      };
    }
    if (!reward.is_active) {
      return {
        content: [{ type: "text", text: `Nagroda "${reward.name}" jest obecnie nieaktywna.` }],
        isError: true,
        structuredContent: { error: "inactive", reward },
      };
    }

    const in_stock = reward.stock === null || (reward.stock ?? 0) > 0;

    const { data: settings } = await supabase
      .from("reward_settings")
      .select("point_value_pln, click_points, purchase_points")
      .limit(1)
      .maybeSingle();

    let user_balance: number | null = null;
    let can_afford: boolean | null = null;
    if (ctx.isAuthenticated()) {
      const { data: points } = await supabase
        .from("user_points")
        .select("balance")
        .eq("user_id", ctx.getUserId())
        .maybeSingle();
      user_balance = points?.balance ?? 0;
      can_afford = user_balance >= reward.points_cost;
    }

    const value_pln =
      settings?.point_value_pln != null ? Number(settings.point_value_pln) * reward.points_cost : null;

    return {
      content: [
        {
          type: "text",
          text:
            `Nagroda "${reward.name}" – ${reward.points_cost} pkt` +
            (in_stock ? "" : " (BRAK w magazynie)") +
            (user_balance != null
              ? ` · Twoje saldo: ${user_balance} pkt (${can_afford ? "wystarcza" : "brakuje"}).`
              : ""),
        },
      ],
      structuredContent: {
        reward,
        availability: {
          is_active: reward.is_active,
          in_stock,
          stock: reward.stock,
          unlimited: reward.stock === null,
        },
        program: settings ?? null,
        pricing: {
          points_cost: reward.points_cost,
          approx_value_pln: value_pln,
        },
        user: ctx.isAuthenticated()
          ? { user_id: ctx.getUserId(), balance: user_balance, can_afford }
          : null,
      },
    };
  },
});
