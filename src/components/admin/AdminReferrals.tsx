import { useState, useEffect } from "react";
import { Users, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  points_awarded_referrer: number;
  points_awarded_referred: number;
  created_at: string;
}

const AdminReferrals = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ptsReferrer, setPtsReferrer] = useState(50);
  const [ptsReferred, setPtsReferred] = useState(25);
  const [totalCodes, setTotalCodes] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: refs }, { data: settings }, { count }] = await Promise.all([
      supabase.from("referrals" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("reward_settings").select("referral_points_referrer, referral_points_referred").eq("id", "default").maybeSingle(),
      supabase.from("referral_codes" as any).select("id", { count: "exact", head: true }),
    ]);
    setReferrals((refs as any as ReferralRow[]) || []);
    if (settings) {
      setPtsReferrer((settings as any).referral_points_referrer ?? 50);
      setPtsReferred((settings as any).referral_points_referred ?? 25);
    }
    setTotalCodes(count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSettings = async () => {
    await supabase.from("reward_settings").update({
      referral_points_referrer: ptsReferrer,
      referral_points_referred: ptsReferred,
    } as any).eq("id", "default");
    toast({ title: "Zapisano ustawienia poleceń" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPointsAwarded = referrals.reduce((s, r) => s + r.points_awarded_referrer + r.points_awarded_referred, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-product text-center">
          <p className="text-2xl font-extrabold text-accent">{totalCodes}</p>
          <p className="text-xs text-muted-foreground mt-1">Kodów polecających</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-product text-center">
          <p className="text-2xl font-extrabold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Udane polecenia</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-product text-center">
          <p className="text-2xl font-extrabold text-success">{totalPointsAwarded}</p>
          <p className="text-xs text-muted-foreground mt-1">Łączne pkt wydane</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border bg-card p-5 shadow-product">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4" /> Ustawienia programu polecającego
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Punkty dla polecającego:</span>
            <Input type="number" min="0" max="10000" value={ptsReferrer} onChange={e => setPtsReferrer(parseInt(e.target.value) || 0)} className="w-24" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Punkty dla poleconego:</span>
            <Input type="number" min="0" max="10000" value={ptsReferred} onChange={e => setPtsReferred(parseInt(e.target.value) || 0)} className="w-24" />
          </div>
          <Button size="sm" onClick={saveSettings}>Zapisz</Button>
        </div>
      </div>

      {/* Referrals list */}
      <div className="rounded-xl border bg-card shadow-product">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" /> Historia poleceń ({referrals.length})
          </h2>
        </div>
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Brak poleceń.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Polecający (ID)</th>
                  <th className="px-4 py-3">Polecony (ID)</th>
                  <th className="px-4 py-3">Pkt polecający</th>
                  <th className="px-4 py-3">Pkt polecony</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-foreground font-mono">{r.referrer_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-sm text-foreground font-mono">{r.referred_user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-sm font-bold text-success">+{r.points_awarded_referrer}</td>
                    <td className="px-4 py-3 text-sm font-bold text-success">+{r.points_awarded_referred}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReferrals;
