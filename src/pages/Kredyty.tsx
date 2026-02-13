import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, Calculator, Loader2, Search, TrendingDown } from "lucide-react";
import { formatDescription } from "@/lib/formatDescription";
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
  min_amount: number | null;
  max_amount: number | null;
  features: string[];
  affiliate_url: string | null;
  image_url: string | null;
  is_active: boolean;
  category: string;
}

const subcategories = [
  { value: "kredyty_gotowkowe", label: "Kredyty gotówkowe" },
  { value: "kredyty_konsolidacyjne", label: "Kredyty konsolidacyjne" },
  { value: "kredyty_hipoteczne", label: "Kredyty hipoteczne" },
];

const Kredyty = () => {
  const [products, setProducts] = useState<FinancialProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subtitle, setSubtitle] = useState("Znajdź najkorzystniejszy kredyt gotówkowy, konsolidacyjny lub hipoteczny");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("typ") || "kredyty_gotowkowe";
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
        .order("interest_rate", { ascending: true });
      setProducts((data as any[]) || []);
      setLoading(false);
    };
    fetchProducts();
  }, [activeTab]);

  useEffect(() => {
    supabase.from("page_settings").select("subtitle").eq("id", "kredyty").maybeSingle().then(({ data }) => {
      if (data?.subtitle) setSubtitle(data.subtitle);
    });
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.provider.toLowerCase().includes(search.toLowerCase())
  );

  const handleClick = (product: FinancialProduct) => {
    if (user) trackPurchaseClick(`kredyt:${product.name}`);
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
            <CreditCard className="h-3.5 w-3.5" />
            Porównywarka kredytów
          </div>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">Kredyty</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
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

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-semibold text-foreground">Brak kredytów w bazie</p>
            <p className="text-sm text-muted-foreground">Administrator może dodać oferty w panelu zarządzania.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(product => (
              <div key={product.id} className="rounded-xl border bg-card p-6 shadow-product transition-all hover:shadow-product-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.provider} className="h-20 w-20 rounded-lg object-contain bg-white p-1 border" />
                    )}
                    <div>
                      <h3 className="font-bold text-foreground">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.provider}</p>
                    </div>
                  </div>
                  {product.interest_rate != null && (
                    <Badge variant="secondary" className="text-accent font-bold">RRSO {product.interest_rate}%</Badge>
                  )}
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                    {formatDescription(product.description)}
                  </p>
                )}
                {(product.min_amount || product.max_amount) && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Kwota: {product.min_amount ? `${product.min_amount.toLocaleString()} zł` : "—"} – {product.max_amount ? `${product.max_amount.toLocaleString()} zł` : "—"}
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
          <h2 className="text-xl font-bold text-foreground mb-4">Na co zwrócić uwagę przy kredycie?</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <TrendingDown className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">RRSO</h3>
              <p className="text-sm text-muted-foreground">Rzeczywista Roczna Stopa Oprocentowania to najważniejszy wskaźnik — uwzględnia wszystkie koszty.</p>
            </div>
            <div>
              <Calculator className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Rata miesięczna</h3>
              <p className="text-sm text-muted-foreground">Sprawdź czy rata nie przekracza 30% Twoich dochodów — to bezpieczny próg.</p>
            </div>
            <div>
              <CreditCard className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Dodatkowe opłaty</h3>
              <p className="text-sm text-muted-foreground">Prowizja za udzielenie, ubezpieczenie, opłata za wcześniejszą spłatę — wszystko ma znaczenie.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Kredyty;
