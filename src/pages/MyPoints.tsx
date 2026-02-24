import { useState, useEffect } from "react";
import { User, Loader2, History, MousePointerClick, ShoppingBag, ArrowDownCircle, ArrowUpCircle, Settings2, Landmark, CreditCard, PiggyBank, Clock, Gift, Flame, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useRewards } from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  click: { label: "Kliknięcie", icon: <MousePointerClick className="h-4 w-4" />, color: "text-blue-500" },
  purchase: { label: "Zakup", icon: <ShoppingBag className="h-4 w-4" />, color: "text-success" },
  earned: { label: "Zdobyte", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-success" },
  redeemed: { label: "Wydane", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-destructive" },
  adjusted: { label: "Korekta", icon: <Settings2 className="h-4 w-4" />, color: "text-muted-foreground" },
  partner_task: { label: "Zadanie partnera", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-accent" },
  referral: { label: "Polecenie", icon: <Gift className="h-4 w-4" />, color: "text-purple-500" },
  wheel: { label: "Koło fortuny", icon: <Zap className="h-4 w-4" />, color: "text-amber-500" },
};

const translateDescription = (desc: string | null): string => {
  if (!desc) return "—";
  return desc
    .replace(/account_opened/gi, "Otwarcie konta bankowego")
    .replace(/loan_application/gi, "Wniosek o kredyt")
    .replace(/deposit_opened/gi, "Założenie lokaty");
};

const MyPoints = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userPoints, transactions, loading } = useRewards();
  const [pendingPoints, setPendingPoints] = useState(0);
  const [streak, setStreak] = useState({ current: 0, longest: 0, bonus: 0, alreadyChecked: false });
  const [streakLoading, setStreakLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPending = async () => {
      const { data } = await supabase
        .from("partner_tasks")
        .select("points_awarded")
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (data) {
        setPendingPoints(data.reduce((sum, t) => sum + (t.points_awarded || 0), 0));
      }
    };

    const checkStreak = async () => {
      setStreakLoading(true);
      const { data } = await supabase.rpc("check_daily_streak");
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, unknown>;
        setStreak({
          current: (d.streak as number) || 0,
          longest: 0,
          bonus: (d.bonus as number) || 0,
          alreadyChecked: (d.already_checked as boolean) || false,
        });
        if (d.bonus && (d.bonus as number) > 0 && !(d.already_checked as boolean)) {
          toast({ title: `🔥 Seria ${d.streak} dni!`, description: `Otrzymujesz ${d.bonus} punktów bonusowych!` });
        }
      }
      // Fetch longest streak separately
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("longest_streak, current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      if (streakData) {
        setStreak(prev => ({ ...prev, longest: streakData.longest_streak, current: streakData.current_streak }));
      }
      setStreakLoading(false);
    };

    fetchPending();
    checkStreak();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby zobaczyć swoje punkty.</p>
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

  const clickPoints = transactions.filter(t => t.type === "click").reduce((sum, t) => sum + t.amount, 0);
  const purchasePoints = transactions.filter(t => t.type === "purchase").reduce((sum, t) => sum + t.amount, 0);
  const wheelPoints = transactions.filter(t => t.type === "wheel").reduce((sum, t) => sum + t.amount, 0);
  const kontaPoints = transactions.filter(t => t.description?.toLowerCase().includes("konto:") || t.description?.toLowerCase().includes("otwarcie konta") || t.description?.toLowerCase().includes("założenie konta")).reduce((sum, t) => sum + t.amount, 0);
  const kredytyPoints = transactions.filter(t => t.description?.toLowerCase().includes("kredyt:") || t.description?.toLowerCase().includes("wniosek o kredyt") || t.description?.toLowerCase().includes("zatwierdzenie kredytu")).reduce((sum, t) => sum + t.amount, 0);
  const lokatyPoints = transactions.filter(t => t.description?.toLowerCase().includes("lokata:") || t.description?.toLowerCase().includes("założenie lokaty")).reduce((sum, t) => sum + t.amount, 0);

  const streakProgress = Math.min((streak.current / 30) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Zap className="h-6 w-6" /> Moje Punkty
        </h1>

        {/* Streak card */}
        <div className="rounded-xl border bg-card p-5 shadow-product mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" /> Seria aktywności
            </h2>
            {!streakLoading && (
              <span className="text-sm text-muted-foreground">
                Najdłuższa seria: <strong>{streak.longest}</strong> dni
              </span>
            )}
          </div>
          {streakLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-orange-500">{streak.current}</span>
                  <span className="text-sm text-muted-foreground">dni z rzędu</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Bonus dzisiaj: <strong className="text-success">+{Math.min(streak.current, 50)} pkt</strong>
                </div>
              </div>
              <Progress value={streakProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {streak.current < 7 ? "Utrzymaj serię 7 dni po bonus x7!" :
                 streak.current < 30 ? `Świetnie! Jeszcze ${30 - streak.current} dni do mistrza streaka!` :
                 "🏆 Jesteś mistrzem streaka!"}
              </p>
            </>
          )}
        </div>

        {/* Points summary cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-4">
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-accent">{userPoints.balance}</p>
            <p className="text-xs text-muted-foreground mt-1">Dostępne punkty</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <Clock className="mx-auto h-5 w-5 text-amber-500 mb-1" />
            <p className="text-2xl font-extrabold text-amber-500">{pendingPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty oczekujące</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-blue-500">{clickPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty za kliknięcia</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-success">{purchasePoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty za zakupy</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <Landmark className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="text-xl font-extrabold text-foreground">{kontaPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty za konta</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <CreditCard className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="text-xl font-extrabold text-foreground">{kredytyPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty za kredyty</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <PiggyBank className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="text-xl font-extrabold text-foreground">{lokatyPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Punkty za lokaty</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <Zap className="mx-auto h-5 w-5 text-amber-500 mb-1" />
            <p className="text-xl font-extrabold text-foreground">{wheelPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Wykręcone punkty</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 mb-8">
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-foreground">{userPoints.total_earned}</p>
            <p className="text-xs text-muted-foreground mt-1">Łącznie zebrane punkty</p>
          </div>
        </div>

        {/* Activity history */}
        {transactions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="h-5 w-5" /> Historia punktów
            </h2>
            <div className="rounded-xl border bg-card shadow-product overflow-hidden">
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
                        <td className="px-4 py-3 text-sm text-foreground">{translateDescription(t.description)}</td>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPoints;
