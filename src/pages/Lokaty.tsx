import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { PiggyBank, ExternalLink, TrendingUp, Loader2, Search, Clock, Star } from "lucide-react";
import { formatDescription } from "@/lib/formatDescription";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClickPoints } from "@/hooks/useClickPoints";
import GuestBenefitsBanner from "@/components/GuestBenefitsBanner";

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
  points_reward: number | null;
  is_active: boolean;
}

const Lokaty = () => {
  const [products, setProducts] = useState<FinancialProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [headerHtml, setHeaderHtml] = useState("");
  const { user } = useAuth();
  const { trackPurchaseClick } = useClickPoints();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("financial_products")
        .select("*")
        .eq("category", "lokaty")
        .eq("is_active", true)
        .order("interest_rate", { ascending: false });
      setProducts((data as any[]) || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    supabase.from("page_settings").select("header_html").eq("id", "lokaty").maybeSingle().then(({ data }) => {
      if (data?.header_html) setHeaderHtml(data.header_html);
    });
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.provider.toLowerCase().includes(search.toLowerCase())
  );

  const handleClick = (product: FinancialProduct) => {
    if (user) trackPurchaseClick(`lokata:${product.name}`);
    if (product.affiliate_url) window.open(product.affiliate_url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          {headerHtml ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(headerHtml) }} />
          ) : (
            <>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                <PiggyBank className="h-3.5 w-3.5" />
                Porównywarka lokat
              </div>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">Lokaty</h1>
              <p className="mt-2 text-muted-foreground">Znajdź najwyższe oprocentowanie lokat terminowych</p>
            </>
          )}
        </div>

        {!user && <GuestBenefitsBanner />}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-semibold text-foreground">Brak lokat w bazie</p>
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
                    <Badge variant="secondary" className="text-accent font-bold text-lg">
                      {product.interest_rate}%
                    </Badge>
                  )}
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                    {formatDescription(product.description)}
                  </p>
                )}
                {product.min_amount != null && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Min. wpłata: <span className="font-semibold text-foreground">{product.min_amount.toLocaleString()} zł</span>
                  </p>
                )}
                {Array.isArray(product.features) && product.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {product.features.map((f: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                )}
                {product.points_reward != null && product.points_reward > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                    <Star className="h-4 w-4" />
                    +{product.points_reward} pkt za założenie
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
          <h2 className="text-xl font-bold text-foreground mb-4">Jak wybrać najlepszą lokatę?</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <TrendingUp className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Oprocentowanie</h3>
              <p className="text-sm text-muted-foreground">Wybieraj lokaty z najwyższym oprocentowaniem — nawet ułamek procenta robi różnicę.</p>
            </div>
            <div>
              <Clock className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Okres lokaty</h3>
              <p className="text-sm text-muted-foreground">Krótsze lokaty dają elastyczność, dłuższe — lepsze oprocentowanie.</p>
            </div>
            <div>
              <PiggyBank className="h-8 w-8 text-accent mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Gwarancja BFG</h3>
              <p className="text-sm text-muted-foreground">Upewnij się, że bank objęty jest gwarancją BFG do 100 000 EUR.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Lokaty;
