import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchOffersTool from "./tools/search-offers";
import listRewardsTool from "./tools/list-rewards";
import myPointsTool from "./tools/my-points";
import myFavoritesTool from "./tools/my-favorites";
import myRedemptionsTool from "./tools/my-redemptions";

// Wydawca (issuer) OAuth = bezpośredni host Supabase (nie proxy .lovable.cloud).
// Fallback pozwala poprawnie zbootstrapować manifest podczas budowania.
const projectRef =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "netszukacz-mcp",
  title: "netszukacz.pl MCP",
  version: "0.2.0",
  instructions:
    "Narzędzia netszukacz.pl – porównywarki ofert z wynagrodzeniem (cashback) i programu lojalnościowego. " +
    "Wszystkie wywołania wymagają zalogowania przez OAuth (Supabase Auth). " +
    "Publiczne: `search_offers` (wyszukiwanie ofert), `list_rewards` (katalog nagród). " +
    "Prywatne (na zalogowanym użytkowniku): `my_points`, `my_favorites`, `my_redemptions`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchOffersTool,
    listRewardsTool,
    myPointsTool,
    myFavoritesTool,
    myRedemptionsTool,
  ],
});
