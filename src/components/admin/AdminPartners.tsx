import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Plug, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PartnerIntegration {
  id: string;
  name: string;
  display_name: string;
  enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
  base_url: string | null;
  task_points: number;
  description: string | null;
}

const AdminPartners = () => {
  const [partners, setPartners] = useState<PartnerIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ api_key: string; api_secret: string; task_points: number; base_url: string }>({
    api_key: "", api_secret: "", task_points: 10, base_url: ""
  });
  const { toast } = useToast();

  const fetchPartners = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("partner_integrations").select("*").order("display_name");
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      setPartners(data as PartnerIntegration[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const toggleEnabled = async (id: string, current: boolean) => {
    await supabase.from("partner_integrations").update({ enabled: !current }).eq("id", id);
    setPartners(prev => prev.map(p => p.id === id ? { ...p, enabled: !current } : p));
    toast({ title: !current ? "Integracja włączona ✓" : "Integracja wyłączona" });
  };

  const startEditing = (partner: PartnerIntegration) => {
    setEditingId(partner.id);
    setEditValues({
      api_key: partner.api_key || "",
      api_secret: partner.api_secret || "",
      task_points: partner.task_points,
      base_url: partner.base_url || "",
    });
  };

  const saveSettings = async (id: string) => {
    const { error } = await supabase.from("partner_integrations").update({
      api_key: editValues.api_key || null,
      api_secret: editValues.api_secret || null,
      task_points: editValues.task_points,
      base_url: editValues.base_url || null,
    }).eq("id", id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ustawienia zapisane ✓" });
      setEditingId(null);
      fetchPartners();
    }
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
          s[t.partner_id].points += t.points_awarded;
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
                        {partner.api_key ? " · API skonfigurowane" : ""}
                        {pStats ? ` · ${pStats.tasks} zadań · ${pStats.points} pkt` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={partner.enabled ? "default" : "secondary"} className={partner.enabled ? "bg-success text-success-foreground" : ""}>
                      {partner.task_points} pkt/zadanie
                    </Badge>
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
                        <Input type="password" placeholder="Klucz API..." value={editValues.api_key} onChange={e => setEditValues(prev => ({ ...prev, api_key: e.target.value }))} className="mt-1.5" />
                      </div>
                      <div>
                        <Label>API Secret</Label>
                        <Input type="password" placeholder="Sekret API..." value={editValues.api_secret} onChange={e => setEditValues(prev => ({ ...prev, api_secret: e.target.value }))} className="mt-1.5" />
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
