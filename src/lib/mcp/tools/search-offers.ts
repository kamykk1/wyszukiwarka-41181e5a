import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Wyszukiwarka ofert – wywołuje edge function `search-offers`
 * i zwraca ujednoliconą listę produktów z partnerów (Allegro,
 * AliExpress, Amazon, Temu) posortowaną wg ceny efektywnej
 * (cena po odjęciu cashbacku).
 */
export default defineTool({
  name: "search_offers",
  title: "Wyszukaj oferty",
  description:
    "Szuka najlepszych ofert produktowych z wynagrodzeniem (cashback) u partnerów zintegrowanych z netszukacz.pl. Zwraca listę ujednoliconą i posortowaną po cenie efektywnej.",
  inputSchema: {
    query: z.string().min(2).max(100).describe("Fraza wyszukiwania, np. 'iPhone 15'."),
    limit: z.number().int().min(1).max(50).optional().describe("Maksymalna liczba wyników (domyślnie 20)."),
    sort: z
      .enum(["price_effective", "price", "cashback", "rating"])
      .optional()
      .describe("Kolejność sortowania. Domyślnie 'price_effective' (najniższa cena po cashbacku)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit, sort }) => {
    const projectRef =
      (globalThis as any).process?.env?.VITE_SUPABASE_PROJECT_ID ||
      "rsfieaipypagioylevbp";
    const url = `https://${projectRef}.supabase.co/functions/v1/search-offers`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: limit ?? 20, sort: sort ?? "price_effective" }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        content: [{ type: "text", text: `Błąd wyszukiwarki (${res.status}): ${text}` }],
        isError: true,
      };
    }

    const data = await res.json();
    const offers = (data.offers ?? []).map((o: any) => ({
      title: o.title,
      partner: o.partner_id,
      price: o.price_total,
      currency: o.currency,
      cashback_rate: o.cashback_rate,
      cashback_amount: o.cashback_amount,
      price_effective: o.price_effective,
      rating: o.rating,
      url: o.product_url,
      image: o.image_url,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            offers.length === 0
              ? `Brak wyników dla "${query}".`
              : `Znaleziono ${offers.length} ofert dla "${query}" (sort: ${sort ?? "price_effective"}).`,
        },
      ],
      structuredContent: { query, count: offers.length, offers },
    };
  },
});
