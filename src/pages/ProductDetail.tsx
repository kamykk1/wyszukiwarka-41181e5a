import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ExternalLink, TrendingDown, ShieldCheck, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getProductGroup, stores } from "@/data/mockProducts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FavoriteButton from "@/components/FavoriteButton";
import PriceAlertDialog from "@/components/PriceAlertDialog";
import { useFavorites } from "@/hooks/useFavorites";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useClickPoints } from "@/hooks/useClickPoints";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const offers = getProductGroup(id || "");

  if (offers.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl font-semibold text-foreground">Produkt nie został znaleziony</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Wróć do wyszukiwarki</Link>
          </Button>
        </div>
      </div>
    );
  }

  const product = offers[0];
  const cheapest = offers[0].price;
  const mostExpensive = offers[offers.length - 1].price;
  const savings = mostExpensive - cheapest;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { createAlert, getAlertForProduct } = usePriceAlerts();
  const existingAlert = getAlertForProduct(product.name);
  const { trackPurchaseClick } = useClickPoints();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Powrót do wyszukiwarki
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: Image + Info */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-product">
              <img
                src={product.image}
                alt={product.name}
                className="h-80 w-full object-cover"
              />
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-product">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold text-foreground leading-tight">{product.name}</h1>
                <FavoriteButton isFavorite={isFavorite(product.name)} onClick={() => toggleFavorite(product.name)} />
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{product.category}</Badge>
                <PriceAlertDialog
                  productName={product.name}
                  currentPrice={cheapest}
                  currency={product.currency}
                  existingTargetPrice={existingAlert ? Number(existingAlert.target_price) : undefined}
                  onSetAlert={createAlert}
                />
              </div>

              {savings > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <span className="text-foreground">
                    Oszczędzasz do <strong>{savings.toFixed(2)} {product.currency}</strong> wybierając najtańszą ofertę!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Price comparison */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">
              Porównanie cen ({offers.length} {offers.length === 1 ? "oferta" : offers.length < 5 ? "oferty" : "ofert"})
            </h2>

            {offers.map((offer, i) => {
              const store = stores.find(s => s.id === offer.store);
              const isCheapest = i === 0 && offers.length > 1;
              const discount = offer.originalPrice
                ? Math.round((1 - offer.price / offer.originalPrice) * 100)
                : null;

              return (
                <div
                  key={offer.id}
                  className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-product-hover hover:-translate-y-0.5 animate-fade-in ${
                    isCheapest ? "border-success/50 bg-success/5" : "bg-card"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {isCheapest && (
                    <div className="absolute -top-2.5 left-4 rounded-full bg-success px-3 py-0.5 text-xs font-bold text-success-foreground">
                      Najlepsza cena
                    </div>
                  )}

                  {/* Store badge */}
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${store?.color}15` }}
                  >
                    {store?.logo}
                  </div>

                  {/* Store info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{store?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {offer.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {offer.rating}
                        </span>
                      )}
                      {offer.reviews && (
                        <span className="text-xs text-muted-foreground">
                          ({offer.reviews.toLocaleString()} opinii)
                        </span>
                      )}
                      {discount && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-accent">
                          <TrendingDown className="h-3 w-3" />
                          -{discount}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-foreground">
                        {offer.price.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">{offer.currency}</span>
                      </p>
                      {offer.originalPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {offer.originalPrice.toFixed(2)} {offer.currency}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackPurchaseClick(product.name)}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          isCheapest
                            ? "bg-accent text-accent-foreground hover:bg-accent/90"
                            : "bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        Kup <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => confirmPurchase(product.name, store?.name || "")}
                        className="flex items-center justify-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                      >
                        <ShoppingBag className="h-3 w-3" /> +10 pkt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
