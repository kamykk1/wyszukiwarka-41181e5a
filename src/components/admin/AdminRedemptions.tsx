import { useState, useEffect } from "react";
import { Loader2, Gift, CheckCircle, Clock, XCircle, User, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

interface UserDetail {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Oczekuje na potwierdzenie", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  "paid-pending": { label: "Opłacone — oczekuje", icon: <Clock className="h-3 w-3" />, variant: "outline" },
  "paid-accepted": { label: "Opłacone — zaakceptowane", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  "paid-rejected": { label: "Opłacone — odrzucone", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
  approved: { label: "Zatwierdzone", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  rejected: { label: "Odrzucone", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
};

const AdminRedemptions = () => {
  const { toast } = useToast();
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRedemption, setDetailRedemption] = useState<RedemptionRow | null>(null);
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDetail = async (r: RedemptionRow) => {
    setDetailRedemption(r);
    setDetailOpen(true);
    setDetailLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, name, street, city, postal_code, country")
      .eq("user_id", r.user_id)
      .single();

    const { data: { session } } = await supabase.auth.getSession();
    let email = "";
    if (session) {
      const res = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.error && Array.isArray(res.data)) {
        const found = (res.data as any[]).find((u: any) => u.id === r.user_id);
        if (found) email = found.email;
      }
    }

    setDetailUser({ ...profile, email } as UserDetail);
    setDetailLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
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
                    <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(r)}>
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
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <Select value={r.status} onValueChange={val => updateStatus(r.id, val)}>
                          <SelectTrigger className="h-8 w-[200px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Oczekuje na potwierdzenie</SelectItem>
                            <SelectItem value="paid-pending">Opłacone — oczekuje</SelectItem>
                            <SelectItem value="paid-accepted">Opłacone — zaakceptowane</SelectItem>
                            <SelectItem value="paid-rejected">Opłacone — odrzucone</SelectItem>
                            <SelectItem value="approved">Zatwierdzone</SelectItem>
                            <SelectItem value="rejected">Odrzucone</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Szczegóły zamówienia
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : detailRedemption && detailUser ? (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Nagroda</h3>
                <p className="text-sm text-foreground">{detailRedemption.reward_name}</p>
                <p className="text-xs text-muted-foreground">{detailRedemption.points_spent} pkt • {new Date(detailRedemption.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <Badge variant={statusConfig[detailRedemption.status]?.variant || "secondary"}>
                  {statusConfig[detailRedemption.status]?.label || detailRedemption.status}
                </Badge>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Dane użytkownika</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Imię:</span>
                  <span className="text-foreground">{detailUser.first_name || "—"}</span>
                  <span className="text-muted-foreground">Nazwisko:</span>
                  <span className="text-foreground">{detailUser.last_name || "—"}</span>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{detailUser.email || "—"}</span>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Adres wysyłki</h3>
                <div className="text-sm text-foreground space-y-0.5">
                  <p>{detailUser.street || "—"}</p>
                  <p>{detailUser.postal_code || ""} {detailUser.city || "—"}</p>
                  <p>{detailUser.country || "Polska"}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Zmień status</h3>
                <Select value={detailRedemption.status} onValueChange={val => { updateStatus(detailRedemption.id, val); setDetailOpen(false); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Oczekuje na potwierdzenie</SelectItem>
                    <SelectItem value="paid-pending">Opłacone — oczekuje</SelectItem>
                    <SelectItem value="paid-accepted">Opłacone — zaakceptowane</SelectItem>
                    <SelectItem value="paid-rejected">Opłacone — odrzucone</SelectItem>
                    <SelectItem value="approved">Zatwierdzone</SelectItem>
                    <SelectItem value="rejected">Odrzucone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRedemptions;
