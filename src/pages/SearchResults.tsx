import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, SlidersHorizontal, ExternalLink, Percent, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import StoreFilter from "@/components/StoreFilter";
import { searchProducts } from "@/data/mockProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfferSearch, type SortKey } from "@/hooks/useOfferSearch";
import { OfferCard } from "@/components/search/OfferCard";
import { PartnerStatusBar } from "@/components/search/PartnerStatusBar";
import { applySeo } from "@/lib/seo";

interface TDProgram {
  id: string;
  name: string;
  cashback_rate: number | null;
  cashback_type: string | null;
  logo_url: string | null;
  category: string | null;
  url: string | null;
}

interface TDProduct {
  id: string;
  name: string;
  description: string;
  image: string | null;
  price: number | null;
  currency: string;
  store: string;
  url: string | null;
  brand: string | null;
  category: string | null;
}

const buildAffiliateUrl = (baseUrl: string, email: string | undefined) => {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (email) url.searchParams.set("epi1", email);
    return url.toString();
  } catch {
    return email ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}epi1=${encodeURIComponent(email)}` : baseUrl;
  }
};

const TDProductCard = ({ product, email, index }: { product: TDProduct; email?: string; index: number }) => (
  <div
    className="group relative flex gap-4 rounded-xl border bg-card p-4 shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-0.5 animate-fade-in"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
          <ShoppingBag className="h-8 w-8" />
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col justify-between min-w-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            <Percent className="h-3 w-3" />
            {product.store}
          </span>
          {product.brand && (
            <span className="text-xs text-muted-foreground">{product.brand}</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          {product.price != null ? (
            <>
              <span className="text-xl font-extrabold text-foreground">
                {product.price.toFixed(2)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {product.currency}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Sprawdź cenę</span>
          )}
        </div>
        {product.url && (
          <a
            href={buildAffiliateUrl(product.url, email)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground"
          >
            Kup z cashback <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  </div>
);

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [sortBy, setSortBy] = useState<SortKey>("price_effective");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [tdPrograms, setTdPrograms] = useState<TDProgram[]>([]);
  const [tdProducts, setTdProducts] = useState<TDProduct[]>([]);
  const [tdProductsLoading, setTdProductsLoading] = useState(false);
  const [tdProductsTotal, setTdProductsTotal] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const q = query.trim();
    applySeo({
      title: q
        ? `${q} — Najlepsze oferty z wynagrodzeniem | NetSzukacz.pl`
        : "Najlepsze oferty z wynagrodzeniem — wyniki wyszukiwania | NetSzukacz.pl",
      description: q
        ? `Najlepsze oferty z wynagrodzeniem dla „${q}” — porównaj ceny, cashback i punkty w NetSzukacz.pl.`
        : "Najlepsze oferty z wynagrodzeniem — przeszukuj sklepy partnerskie, sortuj po najniższej cenie i zdobywaj cashback.",
      canonicalPath: `/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    });
  }, [query]);

  const { offers: unifiedOffers, partners, loading: unifiedLoading } = useOfferSearch(query, sortBy);

  // Legacy sort mapping for lokalnych mock produktów
  const legacySortBy = sortBy === "price_effective" ? "price-asc" : sortBy === "price" ? "price-asc" : sortBy === "rating" ? "rating" : "price-asc";
  const results = useMemo(
    () => searchProducts(query, selectedStores.length > 0 ? selectedStores : undefined, legacySortBy),
    [query, selectedStores, legacySortBy]
  );

  // Search Tradedoubler programs matching query
  const filteredPrograms = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return tdPrograms.filter(p => p.name.toLowerCase().includes(q));
  }, [query, tdPrograms]);

  // Load TD programs once
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from("tradedoubler_programs")
        .select("id, name, cashback_rate, cashback_type, logo_url, category, url")
        .order("name");
      if (data) setTdPrograms(data);
    };
    fetchPrograms();
  }, []);

  // Search TD products when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setTdProducts([]);
      setTdProductsTotal(0);
      return;
    }

    const searchTDProducts = async () => {
      setTdProductsLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tradedoubler-products?q=${encodeURIComponent(query)}&pageSize=20`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const data = await res.json();
        setTdProducts(data.products || []);
        setTdProductsTotal(data.total || 0);
      } catch (err) {
        console.error("TD products search error:", err);
        setTdProducts([]);
      }
      setTdProductsLoading(false);
    };

    const debounce = setTimeout(searchTDProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Sort TD products
  const sortedTdProducts = useMemo(() => {
    const sorted = [...tdProducts];
    if (sortBy === "price" || sortBy === "price_effective") {
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    }
    return sorted;
  }, [tdProducts, sortBy]);

  const toggleStore = (storeId: string) => {
    setSelectedStores(prev =>
      prev.includes(storeId) ? prev.filter(s => s !== storeId) : [...prev, storeId]
    );
  };

  const totalResults = results.length + tdProducts.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="border-b bg-card py-4">
        <div className="container mx-auto px-4">
          <SearchBar initialQuery={query} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Wyniki dla „{query}"
            </h1>
            <p className="text-sm text-muted-foreground">
              {unifiedOffers.length} ofert od partnerów
              {results.length > 0 && ` · ${results.length} z porównywarki`}
              {tdProducts.length > 0 && ` · ${tdProducts.length} produktów TD`}
              {(tdProductsLoading || unifiedLoading) && " · wyszukiwanie…"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-56">
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_effective">Najniższa cena po cashbacku</SelectItem>
                <SelectItem value="price">Najniższa cena</SelectItem>
                <SelectItem value="cashback">Najwyższy cashback</SelectItem>
                <SelectItem value="rating">Najlepiej oceniane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pasek statusu partnerów */}
        <div className="mb-4">
          <PartnerStatusBar partners={partners} loading={unifiedLoading} />
        </div>

        {/* Zunifikowane oferty od partnerów (Allegro, AliExpress, Amazon, Temu) */}
        {(unifiedLoading || unifiedOffers.length > 0) && (
          <div className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="font-bold text-foreground">Najlepsze oferty od partnerów</h2>
              <Badge variant="secondary" className="text-xs">{unifiedOffers.length}</Badge>
            </div>
            {unifiedLoading && unifiedOffers.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-96 rounded-xl border bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unifiedOffers.map((o, i) => (
                  <OfferCard key={`${o.partner_id}-${o.external_id}`} offer={o} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <StoreFilter selectedStores={selectedStores} onToggleStore={toggleStore} />
        </div>


        {/* Tradedoubler partner programs */}
        {filteredPrograms.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Percent className="h-4 w-4 text-accent" />
              <h2 className="font-bold text-foreground">Programy partnerskie z cashbackiem</h2>
              <Badge variant="secondary" className="text-xs">{filteredPrograms.length}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map(prog => (
                <div key={prog.id} className="rounded-xl border bg-card p-4 shadow-product transition-all hover:shadow-product-hover hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    {prog.logo_url ? (
                      <img src={prog.logo_url} alt={prog.name} className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-lg">🏪</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{prog.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {prog.cashback_rate != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                            <Percent className="h-3 w-3" />
                            {prog.cashback_rate}% cashback
                          </span>
                        )}
                        {prog.category && (
                          <span className="text-xs text-muted-foreground">{prog.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {prog.url && (
                    <Button size="sm" className="w-full mt-3 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                      <a href={buildAffiliateUrl(prog.url, user?.email ?? undefined)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Przejdź do sklepu
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TD Products from API */}
        {(tdProductsLoading || sortedTdProducts.length > 0) && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-accent" />
              <h2 className="font-bold text-foreground">Produkty partnerów z cashbackiem</h2>
              {tdProductsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {tdProductsTotal > sortedTdProducts.length
                    ? `${sortedTdProducts.length} z ${tdProductsTotal}`
                    : sortedTdProducts.length}
                </Badge>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Kliknij „Kup z cashback" aby przejść do sklepu przez link partnerski. Punkty zostaną naliczone automatycznie od wartości zamówienia.
            </p>
            {sortedTdProducts.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedTdProducts.map((product, i) => (
                  <TDProductCard
                    key={product.id}
                    product={product}
                    email={user?.email ?? undefined}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local mock products */}
        {results.length > 0 && (
          <>
            {sortedTdProducts.length > 0 && (
              <div className="mb-3">
                <h2 className="font-bold text-foreground">Oferty z porównywarki</h2>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </>
        )}

        {totalResults === 0 && !tdProductsLoading && filteredPrograms.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-xl font-semibold text-foreground">Brak wyników</p>
            <p className="mt-2 text-muted-foreground">
              Spróbuj zmienić frazę wyszukiwania lub filtry sklepów.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
