import { useState, useEffect, useMemo } from "react";
import { Percent, ExternalLink, TrendingUp, Loader2, Store } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DOMPurify from "dompurify";


interface CashbackStore {
  id: string;
  name: string;
  logo: string;
  color: string;
  cashback_rate: number;
  cashback_type: string | null;
  affiliate_url: string | null;
  partner_source: string | null;
  category: string | null;
}

const CashbackRateBadge = ({ rate, type }: { rate: number; type: string | null }) => {
  const label = type === "percent" || type === "percentage" || !type
    ? `${rate}% cashback`
    : `${rate} cashback`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-bold text-accent">
      <Percent className="h-3 w-3" />
      {label}
    </span>
  );
};

const buildAffiliateUrl = (baseUrl: string, email: string | undefined) => {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (email) {
      url.searchParams.set("epi1", email);
    }
    return url.toString();
  } catch {
    return email ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}epi1=${encodeURIComponent(email)}` : baseUrl;
  }
};

const defaultCashbackHeroHtml = `
<div class="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
  💰 Program Cashback
</div>
<h1 class="mb-4 text-4xl font-black tracking-tight text-gradient md:text-5xl">Zarabiaj kupując online</h1>
<p class="mx-auto mb-6 max-w-lg text-lg text-primary-foreground/60">Klikaj przez nasze linki partnerskie i otrzymuj cashback za każde zakupy. Pieniądze wracają do Twojej kieszeni.</p>
`;

const Cashback = () => {
  const [stores, setStores] = useState<CashbackStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroHtml, setHeroHtml] = useState<string>(defaultCashbackHeroHtml);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { user } = useAuth();

  const categories = useMemo(() => {
    const cats = new Set<string>();
    stores.forEach((s) => { if (s.category) cats.add(s.category); });
    return Array.from(cats).sort();
  }, [stores]);

  const filteredStores = useMemo(() => {
    if (selectedCategory === "all") return stores;
    return stores.filter((s) => s.category === selectedCategory);
  }, [stores, selectedCategory]);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);

      // Fetch manual stores
      const { data: storesData } = await supabase
        .from("stores_public")
        .select("id, name, logo, color, cashback_rate, cashback_type, affiliate_url, partner_source")
        .not("cashback_rate", "is", null)
        .gt("cashback_rate", 0);

      // Fetch Tradedoubler programs
      const { data: tdPrograms } = await supabase
        .from("tradedoubler_programs")
        .select("id, name, logo_url, cashback_rate, cashback_type, url, category")
        .not("cashback_rate", "is", null)
        .gt("cashback_rate", 0);

      const manualStores: CashbackStore[] = (storesData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        logo: s.logo,
        color: s.color || "#666666",
        cashback_rate: s.cashback_rate,
        cashback_type: s.cashback_type,
        affiliate_url: s.affiliate_url,
        partner_source: s.partner_source,
        category: null,
      }));

      // Deduplicate: skip TD programs already linked as stores (by name)
      const storeNames = new Set(manualStores.map((s) => s.name.toLowerCase()));
      const tdStores: CashbackStore[] = (tdPrograms || [])
        .filter((p: any) => !storeNames.has(p.name.toLowerCase()))
        .map((p: any) => ({
          id: `td-${p.id}`,
          name: p.name,
          logo: p.logo_url || "🏪",
          color: "#2563eb",
          cashback_rate: p.cashback_rate,
          cashback_type: p.cashback_type,
          affiliate_url: p.url,
          partner_source: "tradedoubler",
          category: p.category || null,
        }));

      const merged = [...manualStores, ...tdStores].sort((a, b) => b.cashback_rate - a.cashback_rate);
      setStores(merged);
      setLoading(false);
    };
    fetchStores();

    const fetchHero = async () => {
      const { data } = await supabase
        .from("page_settings")
        .select("header_html")
        .eq("id", "cashback")
        .single();
      if (data?.header_html && data.header_html.trim() !== "" && data.header_html !== "<p><br></p>") {
        setHeroHtml(data.header_html);
      }
    };
    fetchHero();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero - compact */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-48 w-48 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-5 right-20 h-64 w-64 rounded-full bg-accent/50 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 py-8 text-center">
          <div
            className="prose prose-sm max-w-none mx-auto mb-3
              [&_h1]:text-2xl [&_h1]:md:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-gradient [&_h1]:mb-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary-foreground [&_h2]:mb-2
              [&_p]:text-sm [&_p]:text-primary-foreground/60 [&_p]:mb-2 [&_p]:mx-auto [&_p]:max-w-lg
              [&_a]:text-accent [&_a]:underline
              [&_strong]:text-primary-foreground
              [&_*]:!bg-transparent [&_h1]:!text-gradient [&_h1_strong]:!text-inherit [&_h1_*]:!bg-transparent
              [&_p_span]:!text-primary-foreground/60 [&_p_span]:!bg-transparent"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(heroHtml) }}
          />
          <div className="flex flex-wrap justify-center gap-4 text-xs text-primary-foreground/50">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <span>Do <strong className="text-accent">kilkunastu %</strong> zwrotu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-accent" />
              <span><strong className="text-accent">{stores.length}</strong> sklepów partnerskich</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - blue accent bg */}
      <section className="bg-accent/10 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3 text-center">
            {[
              { step: "1", title: "Wybierz sklep", desc: "Znajdź sklep z najwyższym cashbackiem na tej liście" },
              { step: "2", title: "Kliknij link", desc: "Przejdź do sklepu przez nasz link partnerski" },
              { step: "3", title: "Zdobądź punkty", desc: "Po zakupie otrzymujesz cashback w postaci punktów" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-center gap-2 justify-center sm:flex-col">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs shrink-0">
                  {step}
                </div>
                <div className="sm:text-center">
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stores grid + wheel */}
      <section className="container mx-auto px-4 py-12">
        <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Sklepy z cashbackiem</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Sortowane według najwyższego zwrotu</p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="text-sm px-3 py-1 self-start">
              {filteredStores.length} {filteredStores.length === 1 ? "sklep" : filteredStores.length < 5 ? "sklepy" : "sklepów"}
            </Badge>
          )}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Wszystkie
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Brak sklepów z cashbackiem</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCategory !== "all" ? "Brak sklepów w tej kategorii." : "Administrator musi skonfigurować programy Tradedoubler w panelu sklepów."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStores.map((store, i) => (
              <div
                key={store.id}
                className="group relative rounded-xl border bg-card p-5 shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {i === 0 && (
                  <div className="absolute -top-2 -right-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground shadow-md">
                    Najwyższy
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm"
                      style={{ backgroundColor: store.color + "22", border: `1px solid ${store.color}44` }}
                    >
                      {store.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-accent transition-colors">
                        {store.name}
                      </h3>
                    </div>
                  </div>
                  <CashbackRateBadge rate={store.cashback_rate} type={store.cashback_type} />
                </div>

                <div className="mt-4">
                  {store.affiliate_url ? (
                    <Button
                      size="sm"
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      asChild
                    >
                      <a href={buildAffiliateUrl(store.affiliate_url, user?.email ?? undefined)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Przejdź do sklepu
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <Link to={`/search?q=${encodeURIComponent(store.name)}`}>
                        <Store className="mr-1.5 h-3.5 w-3.5" />
                        Szukaj w {store.name}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          © 2026 NetSzukacz.pl — Porównywarka cen i finansów. Wszystkie prawa zastrzeżone.
        </div>
      </footer>
    </div>
  );
};

export default Cashback;
