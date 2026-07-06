import { defineMcp } from "@lovable.dev/mcp-js";
import searchOffersTool from "./tools/search-offers";
import listRewardsTool from "./tools/list-rewards";

export default defineMcp({
  name: "netszukacz-mcp",
  title: "netszukacz.pl MCP",
  version: "0.1.0",
  instructions:
    "Narzędzia netszukacz.pl – porównywarki ofert z wynagrodzeniem (cashback). " +
    "Użyj `search_offers`, aby znaleźć najlepsze oferty produktowe z partnerów " +
    "(Allegro, AliExpress, Amazon, Temu) posortowane po cenie efektywnej. " +
    "Użyj `list_rewards`, aby pobrać listę nagród dostępnych w programie lojalnościowym.",
  tools: [searchOffersTool, listRewardsTool],
});
