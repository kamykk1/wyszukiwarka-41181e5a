import { useState, useEffect } from "react";
import { Loader2, Gift, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RedemptionRow {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward_name?: string;
  user_name?: string;
  user_email?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Oczekuje", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  approved: { label: "Zatwierdzone", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  rejected: { label: "Odrzucone", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
};

const AdminRedemptions = () => {
  const { toast } = useToast();
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRedemptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reward_redemptions")
      .select("*, rewards(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się pobrać zamówień.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get user profiles for names
    const userIds = [...new Set((data || []).map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, first_name, last_name")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.name || "—"])
    );

    const rows: RedemptionRow[] = (data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      reward_id: r.reward_id,
      points_spent: r.points_spent,
      status: r.status,
      created_at: r.created_at,
      reward_name: (r as any).rewards?.name || "—",
      user_name: profileMap.get(r.user_id) || "—",
    }));

    setRedemptions(rows);
    setLoading(false);
  };

  useEffect(() => { fetchRedemptions(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("reward_redemptions").update({ status }).eq("id", id);
    toast({ title: `Status zmieniony na: ${statusConfig[status]?.label || status}` });
    fetchRedemptions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-product">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Gift className="h-5 w-5" /> Zamówienia nagród ({redemptions.length})
        </h2>
      </div>

      {redemptions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Brak zamówień nagród.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Użytkownik</th>
                <th className="px-4 py-3">Nagroda</th>
                <th className="px-4 py-3">Punkty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map(r => {
                const cfg = statusConfig[r.status] || statusConfig.pending;
                return (
                  <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.user_name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.reward_name}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{r.points_spent}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                        {cfg.icon} {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-success text-success" onClick={() => updateStatus(r.id, "approved")}>
                            <CheckCircle className="mr-1 h-3 w-3" /> Zatwierdź
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive" onClick={() => updateStatus(r.id, "rejected")}>
                            <XCircle className="mr-1 h-3 w-3" /> Odrzuć
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRedemptions;
