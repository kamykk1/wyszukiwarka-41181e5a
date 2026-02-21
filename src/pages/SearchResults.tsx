import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, SlidersHorizontal, ExternalLink, Percent, Loader2 } from "lucide-react";
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

interface TDProgram {
  id: string;
  name: string;
  cashback_rate: number | null;
  cashback_type: string | null;
  logo_url: string | null;
  category: string | null;
  url: string | null;
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

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [sortBy, setSortBy] = useState("price-asc");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [tdPrograms, setTdPrograms] = useState<TDProgram[]>([]);
  const [tdLoading, setTdLoading] = useState(false);
  const { user } = useAuth();

  const results = useMemo(
    () => searchProducts(query, selectedStores.length > 0 ? selectedStores : undefined, sortBy),
    [query, selectedStores, sortBy]
  );

  // Search Tradedoubler programs matching query
  const filteredPrograms = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return tdPrograms.filter(p => p.name.toLowerCase().includes(q));
  }, [query, tdPrograms]);

  useEffect(() => {
    const fetchPrograms = async () => {
      setTdLoading(true);
      const { data } = await supabase
        .from("tradedoubler_programs")
        .select("id, name, cashback_rate, cashback_type, logo_url, category, url")
        .order("name");
      if (data) setTdPrograms(data);
      setTdLoading(false);
    };
    fetchPrograms();
  }, []);

  const toggleStore = (storeId: string) => {
    setSelectedStores(prev =>
      prev.includes(storeId) ? prev.filter(s => s !== storeId) : [...prev, storeId]
    );
  };

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
              Znaleziono {results.length} ofert
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">Cena: od najniższej</SelectItem>
                <SelectItem value="price-desc">Cena: od najwyższej</SelectItem>
                <SelectItem value="rating">Najlepiej oceniane</SelectItem>
                <SelectItem value="reviews">Najwięcej opinii</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

        {results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xl font-semibold text-foreground">Brak wyników</p>
            <p className="mt-2 text-muted-foreground">
              Spróbuj zmienić frazę wyszukiwania lub filtry sklepów.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchResults;
