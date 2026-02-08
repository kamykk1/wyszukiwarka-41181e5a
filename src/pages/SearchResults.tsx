import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import StoreFilter from "@/components/StoreFilter";
import { searchProducts } from "@/data/mockProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [sortBy, setSortBy] = useState("price-asc");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const results = useMemo(
    () => searchProducts(query, selectedStores.length > 0 ? selectedStores : undefined, sortBy),
    [query, selectedStores, sortBy]
  );

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

        {results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : (
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
