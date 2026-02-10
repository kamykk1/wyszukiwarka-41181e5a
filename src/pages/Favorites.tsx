import { Link } from "react-router-dom";
import { Heart, Bell, Trash2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { mockProducts } from "@/data/mockProducts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const Favorites = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { alerts, deleteAlert, toggleAlert } = usePriceAlerts();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby zobaczyć ulubione.</p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Map favorite product names to product data
  const favoriteProducts = favorites.map(name => {
    const products = mockProducts.filter(p => p.name === name);
    const minPrice = Math.min(...products.map(p => p.price));
    const rep = products[0];
    return rep ? { name, image: rep.image, category: rep.category, minPrice, currency: rep.currency, id: rep.id, offersCount: products.length } : null;
  }).filter(Boolean) as { name: string; image: string; category: string; minPrice: number; currency: string; id: string; offersCount: number }[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Powrót
          </Link>
        </div>

        {/* Favorites section */}
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" /> Ulubione ({favoriteProducts.length})
        </h1>

        {favoriteProducts.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nie masz jeszcze ulubionych produktów.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.map(p => (
              <div key={p.name} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-product">
                <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${p.id}`} className="text-sm font-semibold text-foreground line-clamp-2 hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">od {p.minPrice.toFixed(2)} {p.currency} · {p.offersCount} ofert</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => toggleFavorite(p.name)}>
                  <Heart className="h-4 w-4 fill-current" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Alerts section */}
        <h2 className="mt-10 text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent" /> Alerty cenowe ({alerts.length})
        </h2>

        {alerts.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nie masz jeszcze żadnych alertów cenowych.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-product">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{a.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alert: poniżej <strong>{Number(a.target_price).toFixed(2)} PLN</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.is_active ? "default" : "secondary"} className={a.is_active ? "bg-success text-success-foreground" : ""}>
                    {a.is_active ? "Aktywny" : "Wstrzymany"}
                  </Badge>
                  <Switch checked={a.is_active} onCheckedChange={() => toggleAlert(a.id, a.is_active)} />
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteAlert(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
