import { useState, useEffect } from "react";
import { User, Mail, Bell, BellOff, Save, Loader2, History, MousePointerClick, ShoppingBag, ArrowDownCircle, ArrowUpCircle, Settings2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useRewards } from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  click: { label: "Kliknięcie", icon: <MousePointerClick className="h-4 w-4" />, color: "text-blue-500" },
  purchase: { label: "Zakup", icon: <ShoppingBag className="h-4 w-4" />, color: "text-success" },
  earned: { label: "Zdobyte", icon: <ArrowUpCircle className="h-4 w-4" />, color: "text-success" },
  redeemed: { label: "Wydane", icon: <ArrowDownCircle className="h-4 w-4" />, color: "text-destructive" },
  adjusted: { label: "Korekta", icon: <Settings2 className="h-4 w-4" />, color: "text-muted-foreground" },
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userPoints, transactions, loading } = useRewards();
  const [profileName, setProfileName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pointsThreshold, setPointsThreshold] = useState(500);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("name, email_notifications, points_threshold")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileName(data.name || "");
        setEmailNotifications(data.email_notifications ?? true);
        setPointsThreshold(data.points_threshold ?? 500);
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profileName,
        email_notifications: emailNotifications,
        points_threshold: pointsThreshold,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się zapisać ustawień.", variant: "destructive" });
    } else {
      toast({ title: "Zapisano ✓", description: "Ustawienia profilu zostały zaktualizowane." });
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby zobaczyć profil.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Stats from transactions
  const clickPoints = transactions.filter(t => t.type === "click").reduce((sum, t) => sum + t.amount, 0);
  const purchasePoints = transactions.filter(t => t.type === "purchase").reduce((sum, t) => sum + t.amount, 0);
  const _redeemedPoints = Math.abs(transactions.filter(t => t.type === "redeemed").reduce((sum, t) => sum + t.amount, 0));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <User className="h-6 w-6" /> Mój Profil
        </h1>

        {/* Points summary cards */}
        <div className="grid gap-4 sm:grid-cols-4 mb-8">
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-accent">{userPoints.balance}</p>
            <p className="text-xs text-muted-foreground mt-1">Dostępne</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-foreground">{userPoints.total_earned}</p>
            <p className="text-xs text-muted-foreground mt-1">Łącznie zdobyte</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-blue-500">{clickPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Za kliknięcia</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-product text-center">
            <p className="text-2xl font-extrabold text-success">{purchasePoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Za zakupy</p>
          </div>
        </div>

        {/* Account settings */}
        <div className="rounded-xl border bg-card p-6 shadow-product mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Ustawienia konta
          </h2>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Nazwa wyświetlana</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Twoja nazwa"
                className="max-w-sm"
              />
            </div>

            <div className="flex items-center justify-between max-w-sm">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  {emailNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  Powiadomienia email
                </Label>
                <p className="text-xs text-muted-foreground">Otrzymuj info o nowych nagrodach i progach punktowych</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            {emailNotifications && (
              <div className="space-y-1.5">
                <Label htmlFor="threshold" className="text-sm font-medium">Próg punktowy do powiadomienia</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={10}
                  max={100000}
                  value={pointsThreshold}
                  onChange={(e) => setPointsThreshold(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">Otrzymasz email gdy osiągniesz ten próg punktów</p>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Zapisz zmiany
            </Button>
          </div>
        </div>

        {/* Activity history */}
        {transactions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="h-5 w-5" /> Historia aktywności
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
