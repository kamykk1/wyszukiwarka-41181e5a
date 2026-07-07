import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchOffersTool from "./tools/search-offers";
import listRewardsTool from "./tools/list-rewards";
import rewardDetailsTool from "./tools/reward-details";
import myPointsTool from "./tools/my-points";
import myFavoritesTool from "./tools/my-favorites";
import addFavoriteTool from "./tools/add-favorite";
import removeFavoriteTool from "./tools/remove-favorite";
import myRedemptionsTool from "./tools/my-redemptions";

// Wydawca (issuer) OAuth = bezpośredni host Supabase (nie proxy .lovable.cloud).
// Fallback pozwala poprawnie zbootstrapować manifest podczas budowania.
const projectRef =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "netszukacz-mcp",
  title: "netszukacz.pl MCP",
  version: "0.3.0",
  instructions:
    "Narzędzia netszukacz.pl – porównywarki ofert z wynagrodzeniem (cashback) i programu lojalnościowego. " +
    "Publiczne: `search_offers`, `list_rewards`, `reward_details`. " +
    "Prywatne (wymagają OAuth): `my_points`, `my_favorites`, `add_favorite`, `remove_favorite`, `my_redemptions`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchOffersTool,
    listRewardsTool,
    rewardDetailsTool,
    myPointsTool,
    myFavoritesTool,
    addFavoriteTool,
    removeFavoriteTool,
    myRedemptionsTool,
  ],
});
