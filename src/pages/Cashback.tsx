import { useState, useEffect } from "react";
import { Percent, ExternalLink, TrendingUp, Loader2, Store } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CashbackStore {
  id: string;
  name: string;
  logo: string;
  color: string;
  cashback_rate: number;
  cashback_type: string | null;
  affiliate_url: string | null;
  partner_source: string | null;
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

const Cashback = () => {
  const [stores, setStores] = useState<CashbackStore[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo, color, cashback_rate, cashback_type, affiliate_url, partner_source")
        .eq("enabled", true)
        .not("cashback_rate", "is", null)
        .gt("cashback_rate", 0)
        .order("cashback_rate", { ascending: false });

      if (!error && data) {
        setStores(data as CashbackStore[]);
      }
      setLoading(false);
    };
    fetchStores();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-accent/50 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 py-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <Percent className="h-3.5 w-3.5" />
            Program Cashback
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-gradient md:text-5xl">
            Zarabiaj kupując online
          </h1>
          <p className="mx-auto mb-6 max-w-lg text-lg text-primary-foreground/60">
            Klikaj przez nasze linki partnerskie i otrzymuj cashback za każde zakupy.
            Pieniądze wracają do Twojej kieszeni.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span>Do <strong className="text-accent">kilkunastu %</strong> zwrotu</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-accent" />
              <span><strong className="text-accent">{stores.length}</strong> sklepów partnerskich</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            {[
              { step: "1", title: "Wybierz sklep", desc: "Znajdź sklep z najwyższym cashbackiem na tej liście" },
              { step: "2", title: "Kliknij link", desc: "Przejdź do sklepu przez nasz link partnerski" },
              { step: "3", title: "Zdobądź punkty", desc: "Po zakupie otrzymujesz cashback w postaci punktów" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-black text-lg">
                  {step}
                </div>
                <h3 className="font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stores grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Sklepy z cashbackiem</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Sortowane według najwyższego zwrotu</p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {stores.length} {stores.length === 1 ? "sklep" : stores.length < 5 ? "sklepy" : "sklepów"}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Brak sklepów z cashbackiem</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Administrator musi skonfigurować programy Tradedoubler w panelu sklepów.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store, i) => (
              <div
                key={store.id}
                className="group relative rounded-xl border bg-card p-5 shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Top cashback badge */}
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
                      {store.partner_source === "tradedoubler" && (
                        <Badge variant="secondary" className="mt-0.5 text-xs px-1.5 py-0 h-4">
                          Tradedoubler
                        </Badge>
                      )}
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
