import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock @supabase/supabase-js so handlers work without a real backend ----
type Row = Record<string, any>;
const state = {
  favorites: [] as Row[],
  rewards: [] as Row[],
  reward_settings: [] as Row[],
  user_points: [] as Row[],
  lastInsert: null as Row | null,
  lastDeleteFilters: null as Row | null,
};

function makeQuery(table: string, opts?: { deleteCount?: boolean }) {
  const filters: Row = {};
  let mode: "select" | "insert" | "delete" = "select";
  let inserted: Row[] = [];
  let orderCfg: { col: string; asc: boolean } | null = null;
  let rangeCfg: { from: number; to: number } | null = null;
  let single = false;
  let maybe = false;

  const apply = () => {
    let rows: Row[] = ((state as any)[table] ?? []).filter((r: Row) =>
      Object.entries(filters).every(([k, v]) => r[k] === v),
    );
    if (orderCfg) {
      rows = [...rows].sort((a, b) =>
        orderCfg!.asc
          ? String(a[orderCfg!.col]).localeCompare(String(b[orderCfg!.col]))
          : String(b[orderCfg!.col]).localeCompare(String(a[orderCfg!.col])),
      );
    }
    const total = rows.length;
    if (rangeCfg) rows = rows.slice(rangeCfg.from, rangeCfg.to + 1);
    return { rows, total };
  };

  const thenable: any = {
    select: (_cols?: string, o?: { count?: string }) => {
      if (mode === "delete") {
        const { rows } = apply();
        (state as any)[table] = (state as any)[table].filter((r: Row) => !rows.includes(r));
        return Promise.resolve({ data: rows, error: null, count: rows.length });
      }
      if (mode === "insert") {
        (state as any)[table].push(...inserted);
        return Promise.resolve({ data: inserted, error: null });
      }
      void o;
      return thenable;
    },
    insert: (row: Row | Row[]) => {
      mode = "insert";
      inserted = Array.isArray(row) ? row : [row];
      state.lastInsert = inserted[0];
      // Chainable, but also awaitable to resolve as insert
      const p: any = Promise.resolve({ data: inserted, error: null });
      p.select = thenable.select;
      return p;
    },
    delete: (_opts?: any) => {
      mode = "delete";
      state.lastDeleteFilters = filters;
      return thenable;
    },
    eq: (k: string, v: any) => {
      filters[k] = v;
      state.lastDeleteFilters = { ...filters };
      return thenable;
    },
    order: (col: string, o: { ascending: boolean }) => {
      orderCfg = { col, asc: o.ascending };
      return thenable;
    },
    range: (from: number, to: number) => {
      rangeCfg = { from, to };
      return thenable;
    },
    limit: (_n: number) => thenable,
    maybeSingle: () => {
      maybe = true;
      void maybe;
      const { rows } = apply();
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    single: () => {
      single = true;
      void single;
      const { rows } = apply();
      return Promise.resolve({ data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } });
    },
    then: (resolve: any) => {
      const { rows, total } = apply();
      resolve({ data: rows, error: null, count: total });
    },
  };
  return thenable;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => makeQuery(table),
  }),
}));

// ---- Import tools AFTER mock is registered ----
import addFavorite from "./add-favorite";
import removeFavorite from "./remove-favorite";
import rewardDetails from "./reward-details";
import myFavorites from "./my-favorites";
import myPoints from "./my-points";
import myRedemptions from "./my-redemptions";
import listRewards from "./list-rewards";

const authedCtx = (userId = "user-1") => ({
  isAuthenticated: () => true,
  getUserId: () => userId,
  getUserEmail: () => "u@example.com",
  getClientId: () => "client-1",
  getClaims: () => ({}),
  getToken: () => "test.jwt.token",
});
const anonCtx = () => ({
  isAuthenticated: () => false,
  getUserId: () => "",
  getUserEmail: () => "",
  getClientId: () => "",
  getClaims: () => ({}),
  getToken: () => "",
});

beforeEach(() => {
  state.favorites = [];
  state.rewards = [];
  state.reward_settings = [];
  state.user_points = [];
  state.lastInsert = null;
  state.lastDeleteFilters = null;
  (globalThis as any).process = { env: { SUPABASE_URL: "https://x.supabase.co", SUPABASE_PUBLISHABLE_KEY: "anon" } };
});

describe("MCP – autoryzacja (integration)", () => {
  it("wszystkie prywatne narzędzia odrzucają brak zalogowania", async () => {
    const ctx = anonCtx() as any;
    const tools = [addFavorite, removeFavorite, myFavorites, myPoints, myRedemptions, listRewards];
    for (const tool of tools) {
      const res: any = await (tool as any).handler({ product_name: "x" } as any, ctx);
      expect(res.isError, `Tool ${tool.name} powinien wymagać logowania`).toBe(true);
      expect(res.content[0].text).toMatch(/zalogowani/i);
    }
  });
});

describe("MCP – add_favorite / remove_favorite", () => {
  it("dodaje ofertę i zwraca odświeżoną listę", async () => {
    const res: any = await (addFavorite as any).handler({ product_name: "iPhone 15" }, authedCtx());
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent.status).toBe("added");
    expect(res.structuredContent.total).toBe(1);
    expect(res.structuredContent.favorites[0].product_name).toBe("iPhone 15");
    expect(state.favorites).toHaveLength(1);
  });

  it("zwraca already_exists, gdy ulubione już istnieje", async () => {
    state.favorites.push({ id: "f1", user_id: "user-1", product_name: "iPhone 15", created_at: "2026-01-01" });
    const res: any = await (addFavorite as any).handler({ product_name: "iPhone 15" }, authedCtx());
    expect(res.structuredContent.status).toBe("already_exists");
    expect(state.favorites).toHaveLength(1);
  });

  it("usuwa po product_name i zwraca zaktualizowaną listę", async () => {
    state.favorites.push(
      { id: "f1", user_id: "user-1", product_name: "A", created_at: "2026-01-01" },
      { id: "f2", user_id: "user-1", product_name: "B", created_at: "2026-01-02" },
    );
    const res: any = await (removeFavorite as any).handler({ product_name: "A" }, authedCtx());
    expect(res.structuredContent.status).toBe("removed");
    expect(res.structuredContent.total).toBe(1);
    expect(res.structuredContent.favorites[0].product_name).toBe("B");
  });

  it("zwraca not_found, gdy nic nie usunięto", async () => {
    const res: any = await (removeFavorite as any).handler({ product_name: "brak" }, authedCtx());
    expect(res.structuredContent.status).toBe("not_found");
    expect(res.structuredContent.removed_count).toBe(0);
  });

  it("odmawia usunięcia bez identyfikatora", async () => {
    const res: any = await (removeFavorite as any).handler({}, authedCtx());
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/favorite_id|product_name/);
  });
});

describe("MCP – reward_details", () => {
  it("zwraca szczegóły + saldo użytkownika, gdy zalogowany", async () => {
    state.rewards.push({
      id: "r1", name: "Voucher 50 zł", description: "opis", points_cost: 500,
      stock: 3, image_url: null, is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    state.reward_settings.push({ point_value_pln: 0.1, click_points: 1, purchase_points: 10 });
    state.user_points.push({ user_id: "user-1", balance: 600 });

    const res: any = await (rewardDetails as any).handler({ reward_id: "r1" }, authedCtx());
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent.reward.name).toBe("Voucher 50 zł");
    expect(res.structuredContent.availability.in_stock).toBe(true);
    expect(res.structuredContent.pricing.approx_value_pln).toBeCloseTo(50);
    expect(res.structuredContent.user.can_afford).toBe(true);
  });

  it("zwraca błąd not_found, gdy nagroda nie istnieje", async () => {
    const res: any = await (rewardDetails as any).handler({ reward_id: "r-missing" }, authedCtx());
    expect(res.isError).toBe(true);
    expect(res.structuredContent.error).toBe("not_found");
  });

  it("zwraca błąd inactive, gdy nagroda wyłączona", async () => {
    state.rewards.push({
      id: "r2", name: "Off", description: null, points_cost: 100, stock: null,
      image_url: null, is_active: false, created_at: "", updated_at: "",
    });
    const res: any = await (rewardDetails as any).handler({ reward_id: "r2" }, authedCtx());
    expect(res.isError).toBe(true);
    expect(res.structuredContent.error).toBe("inactive");
  });

  it("działa bez logowania (publiczny katalog) i nie zwraca salda", async () => {
    state.rewards.push({
      id: "r3", name: "Public", description: null, points_cost: 100, stock: null,
      image_url: null, is_active: true, created_at: "", updated_at: "",
    });
    const res: any = await (rewardDetails as any).handler({ reward_id: "r3" }, anonCtx());
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent.user).toBeNull();
    expect(res.structuredContent.availability.unlimited).toBe(true);
  });
});
