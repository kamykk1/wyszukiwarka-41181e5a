import { Gift, Star, History, Loader2, MousePointerClick, ShoppingBag, ArrowDownCircle, ArrowUpCircle, Settings2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useRewards } from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  click: { label: "Kliknięcie", icon: <MousePointerClick className="h-4 w-4" />, color: "text-blue-500" },
  purchase: { label: "Zakup", icon: <ShoppingBag className="h-4 w-4" />, color: "text-success" },
  earned: { label: "Zdobyte", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-success" },
  redeemed: { label: "Wydane", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-destructive" },
  adjusted: { label: "Korekta", icon: <Settings2 className="h-4 w-4" />, color: "text-muted-foreground" },
};

const Rewards = () => {
  const { user } = useAuth();
  const { rewards, userPoints, redemptions, transactions, loading, redeemReward } = useRewards();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Gift className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby zobaczyć nagrody.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Points summary */}
        <div className="mb-8 rounded-xl border bg-card p-6 shadow-product">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">Twoje Punkty</h1>
          </div>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-3xl font-extrabold text-accent">{userPoints.balance}</p>
              <p className="text-sm text-muted-foreground">Dostępne punkty</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">{userPoints.total_earned}</p>
              <p className="text-sm text-muted-foreground">Łącznie zdobyte</p>
            </div>
          </div>
        </div>

        {/* Rewards catalog */}
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5" /> Katalog Nagród
        </h2>
        {rewards.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Gift className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">Brak dostępnych nagród. Wróć później!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {rewards.map(reward => (
              <div key={reward.id} className="rounded-xl border bg-card p-5 shadow-product transition-shadow hover:shadow-product-hover">
                {reward.image_url && (
                  <img src={reward.image_url} alt={reward.name} className="mb-3 h-32 w-full rounded-lg object-cover" />
                )}
                <h3 className="text-lg font-semibold text-foreground">{reward.name}</h3>
                {reward.description && <p className="mt-1 text-sm text-muted-foreground">{reward.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm">
                    <Star className="mr-1 h-3 w-3" /> {reward.points_cost} pkt
                  </Badge>
                  {reward.stock !== null && (
                    <span className="text-xs text-muted-foreground">Pozostało: {reward.stock}</span>
                  )}
                </div>
                <Button
                  className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={userPoints.balance < reward.points_cost || (reward.stock !== null && reward.stock <= 0)}
                  onClick={() => redeemReward(reward)}
                >
                  Odbierz nagrodę
                </Button>
              </div>
            ))}
          </div>
        )}


        {/* Points transaction history */}
        {transactions.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4 mt-8 flex items-center gap-2">
              <History className="h-5 w-5" /> Historia Punktów
            </h2>
            <div className="rounded-xl border bg-card shadow-product overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Opis</th>
                    <th className="px-4 py-3 text-right">Punkty</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const cfg = typeConfig[t.type] || typeConfig.adjusted;
                    return (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{t.description || "—"}</td>
                        <td className={`px-4 py-3 text-sm font-bold text-right ${t.amount > 0 ? "text-success" : "text-destructive"}`}>
                          {t.amount > 0 ? "+" : ""}{t.amount}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Redemption history */}
        {redemptions.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5" /> Historia Odbioru Nagród
            </h2>
            <div className="rounded-xl border bg-card shadow-product overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Nagroda</th>
                    <th className="px-4 py-3">Punkty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {(r.rewards as any)?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.points_spent}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === "completed" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>
                          {r.status === "pending" ? "Oczekuje" : r.status === "completed" ? "Zrealizowano" : "Anulowano"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pl-PL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Rewards;
