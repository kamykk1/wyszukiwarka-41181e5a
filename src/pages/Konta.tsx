import { useState, useEffect } from "react";
import { Landmark, ExternalLink, Star, Loader2, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClickPoints } from "@/hooks/useClickPoints";

interface FinancialProduct {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  interest_rate: number | null;
  annual_fee: number | null;
  features: string[];
  affiliate_url: string | null;
  image_url: string | null;
  is_active: boolean;
  category: string;
}

const subcategories = [
  { value: "konta_osobiste", label: "Konta osobiste" },
  { value: "konta_firmowe", label: "Konta firmowe" },
  { value: "konta_oszczednosciowe", label: "Konta oszczędnościowe" },
];

const Konta = () => {
  const [products, setProducts] = useState<FinancialProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("typ") || "konta_osobiste";
  const { user } = useAuth();
  const { trackPurchaseClick } = useClickPoints();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("financial_products")
        .select("*")
        .eq("category", activeTab)
        .eq("is_active", true)
        .order("interest_rate", { ascending: false });
      setProducts((data as any[]) || []);
      setLoading(false);
    };
    fetchProducts();
  }, [activeTab]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.provider.toLowerCase().includes(search.toLowerCase())
  );

  const handleClick = (product: FinancialProduct) => {
    if (user) trackPurchaseClick(`konto:${product.name}`);
    if (product.affiliate_url) window.open(product.affiliate_url, "_blank");
  };

  const setTab = (val: string) => {
    setSearchParams({ typ: val });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <Landmark className="h-3.5 w-3.5" />
            Porównywarka kont bankowych
          </div>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">Konta Bankowe</h1>
          <p className="mt-2 text-muted-foreground">Porównaj najlepsze konta osobiste, firmowe i oszczędnościowe</p>
        </div>

        <Tabs value={activeTab} onValueChange={setTab} className="mx-auto mb-8 max-w-lg">
          <TabsList className="w-full grid grid-cols-3">
            {subcategories.map(s => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs sm:text-sm">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mx-auto mb-8 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Szukaj konta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Landmark className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-semibold text-foreground">Brak kont w bazie</p>
            <p className="text-sm text-muted-foreground">Administrator może dodać oferty w panelu zarządzania.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(product => (
              <div key={product.id} className="rounded-xl border bg-card p-6 shadow-product transition-all hover:shadow-product-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.provider} className="h-8 w-8 rounded object-contain bg-white p-0.5" />
                    )}
                    <div>
                      <h3 className="font-bold text-foreground">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.provider}</p>
                    </div>
                  </div>
                  {product.interest_rate != null && (
                    <Badge variant="secondary" className="text-accent font-bold">{product.interest_rate}%</Badge>
                  )}
                </div>
                {product.description && <p className="text-sm text-muted-foreground mb-3">{product.description}</p>}
                {product.annual_fee != null && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Opłata roczna: <span className="font-semibold text-foreground">{product.annual_fee === 0 ? "0 zł" : `${product.annual_fee} zł`}</span>
                  </p>
                )}
                {Array.isArray(product.features) && product.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {product.features.map((f: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                )}
                <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleClick(product)}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Sprawdź ofertę
                </Button>
              </div>
            ))}
          </div>
        )}

        <section className="mt-16 rounded-xl border bg-card p-8 shadow-product">
          <h2 className="text-xl font-bold text-foreground mb-4">Jak wybrać najlepsze konto?</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Star className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Oprocentowanie</h3>
              <p className="text-sm text-muted-foreground">Sprawdź oprocentowanie na koncie oszczędnościowym — im wyższe, tym lepiej dla Twoich oszczędności.</p>
            </div>
            <div>
              <Landmark className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Opłaty</h3>
              <p className="text-sm text-muted-foreground">Upewnij się, że konto jest bezpłatne lub ma niskie opłaty za prowadzenie i przelewy.</p>
            </div>
            <div>
              <ExternalLink className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Dodatkowe korzyści</h3>
              <p className="text-sm text-muted-foreground">Zwrot za zakupy, cashback, darmowe wypłaty z bankomatów — to ważne benefity.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Konta;
