import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Plug, Coins, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PartnerView {
  id: string;
  name: string;
  display_name: string;
  enabled: boolean;
  base_url: string | null;
  task_points: number;
  description: string | null;
  has_api_key: boolean;
  category_api_keys_configured: Record<string, boolean>;
  category_points: Record<string, number>;
}

const AdminPartners = () => {
  const [partners, setPartners] = useState<PartnerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetchingOffers, setFetchingOffers] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ api_key: string; api_secret: string; task_points: number; base_url: string }>({
    api_key: "", api_secret: "", task_points: 10, base_url: ""
  });
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-partners?action=list", {
        method: "GET",
        headers: await getAuthHeaders(),
      });
      if (error) throw error;
      setPartners(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({ title: "Błąd", description: e instanceof Error ? e.message : "Nieznany błąd", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      await supabase.functions.invoke("admin-partners?action=toggle", {
        body: { id, enabled: !current },
        headers: await getAuthHeaders(),
      });
      setPartners(prev => prev.map(p => p.id === id ? { ...p, enabled: !current } : p));
      toast({ title: !current ? "Integracja włączona ✓" : "Integracja wyłączona" });
    } catch (e) {
      toast({ title: "Błąd", description: e instanceof Error ? e.message : "Nieznany błąd", variant: "destructive" });
    }
  };

  const startEditing = (partner: PartnerView) => {
    setEditingId(partner.id);
    setEditValues({
      api_key: "",
      api_secret: "",
      task_points: partner.task_points,
      base_url: partner.base_url || "",
    });
  };

  const saveSettings = async (id: string) => {
    try {
      const body: Record<string, any> = {
        id,
        task_points: editValues.task_points,
        base_url: editValues.base_url || null,
      };
      // Only send credentials if user typed new values
      if (editValues.api_key) body.api_key = editValues.api_key;
      if (editValues.api_secret) body.api_secret = editValues.api_secret;

      const { error } = await supabase.functions.invoke("admin-partners?action=update", {
        body,
        headers: await getAuthHeaders(),
      });
      if (error) throw error;
      toast({ title: "Ustawienia zapisane ✓" });
      setEditingId(null);
      fetchPartners();
    } catch (e) {
      toast({ title: "Błąd", description: e instanceof Error ? e.message : "Nieznany błąd", variant: "destructive" });
    }
  };

  const fetchOffers = async (partnerId: string) => {
    setFetchingOffers(partnerId);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("fetch-partner-offers", {
        body: { partner_id: partnerId },
      });
      if (err) {
        toast({ title: "Błąd pobierania ofert", description: err.message, variant: "destructive" });
      } else {
        toast({ title: `Pobrano oferty ✓`, description: `Zaimportowano ${result?.imported || 0} ofert od ${partners.find(p => p.id === partnerId)?.display_name}` });
      }
    } catch (e) {
      toast({ title: "Błąd", description: e instanceof Error ? e.message : "Nieznany błąd", variant: "destructive" });
    }
    setFetchingOffers(null);
  };

  // Stats
  const [stats, setStats] = useState<Record<string, { tasks: number; points: number }>>({});
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("partner_tasks")
        .select("partner_id, points_awarded, status");
      if (data) {
        const s: Record<string, { tasks: number; points: number }> = {};
        for (const t of data) {
          if (t.status !== "confirmed") continue;
          if (!s[t.partner_id]) s[t.partner_id] = { tasks: 0, points: 0 };
          s[t.partner_id].tasks++;
          s[t.partner_id].points += t.points_awarded || 0;
        }
        setStats(s);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-product">
        <h2 className="mb-2 text-lg font-bold text-foreground flex items-center gap-2">
          <Plug className="h-5 w-5" /> Integracje Partnerskie
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Włączaj/wyłączaj integracje z serwisami partnerskimi i konfiguruj punkty za zadania.
        </p>

        <div className="space-y-3">
          {partners.map(partner => {
            const pStats = stats[partner.id];
            return (
              <div key={partner.id} className="rounded-lg border bg-background p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Plug className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{partner.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {partner.enabled ? "Aktywna" : "Wyłączona"}
                        {partner.has_api_key ? " · API skonfigurowane" : ""}
                        {pStats ? ` · ${pStats.tasks} zadań · ${pStats.points} pkt` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={partner.enabled ? "default" : "secondary"} className={partner.enabled ? "bg-success text-success-foreground" : ""}>
                      {partner.task_points} pkt/zadanie
                    </Badge>
                    <Button 
                      variant="ghost" size="icon" className="h-8 w-8" 
                      disabled={!partner.enabled || !partner.base_url || fetchingOffers === partner.id}
                      onClick={() => fetchOffers(partner.id)}
                      title="Pobierz oferty z API partnera"
                    >
                      {fetchingOffers === partner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                    <Switch checked={partner.enabled} onCheckedChange={() => toggleEnabled(partner.id, partner.enabled)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editingId === partner.id ? setEditingId(null) : startEditing(partner)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {partner.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{partner.description}</p>
                )}

                {editingId === partner.id && (
                  <div className="mt-4 space-y-3 border-t pt-4 animate-fade-in">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>API Key</Label>
                        <Input type="password" placeholder="Wpisz nowy klucz API..." value={editValues.api_key} onChange={e => setEditValues(prev => ({ ...prev, api_key: e.target.value }))} className="mt-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">Pozostaw puste, aby zachować istniejący klucz</p>
                      </div>
                      <div>
                        <Label>API Secret</Label>
                        <Input type="password" placeholder="Wpisz nowy sekret API..." value={editValues.api_secret} onChange={e => setEditValues(prev => ({ ...prev, api_secret: e.target.value }))} className="mt-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">Pozostaw puste, aby zachować istniejący sekret</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Base URL</Label>
                        <Input placeholder="https://api.example.com" value={editValues.base_url} onChange={e => setEditValues(prev => ({ ...prev, base_url: e.target.value }))} className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" /> Punkty za zadanie</Label>
                        <Input type="number" min={0} max={10000} value={editValues.task_points} onChange={e => setEditValues(prev => ({ ...prev, task_points: Number(e.target.value) }))} className="mt-1.5" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveSettings(partner.id)}>
                        <Save className="mr-1.5 h-3.5 w-3.5" /> Zapisz
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminPartners;
