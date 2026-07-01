// Adapter Temu — realizowany przez istniejącą integrację Tradedoubler.
// Temu nie ma publicznego API afiliacyjnego, korzystamy z ich programu w TD.
import type { NormalizedOffer } from "./types.ts";
import { generateMockOffers } from "./mock-utils.ts";

export async function searchTemu(
  query: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<NormalizedOffer[]> {
  try {
    // Sprawdź czy w bazie jest aktywny program Temu w tradedoubler_programs.
    const programRes = await fetch(
      `${supabaseUrl}/rest/v1/tradedoubler_programs?select=id,name,cashback_rate,url&name=ilike.*temu*&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    const programs = await programRes.json();
    const temuProgram = Array.isArray(programs) && programs[0];

    if (!temuProgram) {
      // Brak programu Temu w TD — zwracamy mocka jako placeholder.
      return generateMockOffers("temu", query, {
        count: 3,
        priceBase: 8,
        priceRange: 120,
        cashbackRate: 5.0,
        imageDomain: "temu",
        urlTemplate: (id, q) =>
          `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}&ref=${id}`,
      });
    }

    // Program istnieje — użyj tradedoubler-products z filtrem sklepu.
    // Dla uproszczenia (i braku products API dla wielu programów) wracamy mock
    // z prawidłowym URL bazowanym na afiliacyjnym linku Temu z bazy.
    return generateMockOffers("temu", query, {
      count: 3,
      priceBase: 8,
      priceRange: 120,
      cashbackRate: Number(temuProgram.cashback_rate) || 5.0,
      imageDomain: "temu",
      urlTemplate: (id, q) => {
        const base = temuProgram.url || `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}`;
        const sep = base.includes("?") ? "&" : "?";
        return `${base}${sep}q=${encodeURIComponent(q)}&ref=${id}`;
      },
    });
  } catch (err) {
    console.error("[temu] adapter error", err);
    return [];
  }
}
