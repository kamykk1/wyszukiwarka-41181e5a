import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Plug, Coins, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  category_calc_mode: Record<string, string>;
}

interface CategoryConfig {
  name: string;
  points: number;
  mode: "flat" | "per_1000";
  api_key: string;
}

const PRESET_CATEGORIES = [
  "konta_osobiste",
  "kredyty_hipoteczne",
  "kredyty_gotowkowe",
  "lokaty",
  "konta_oszczednosciowe",
  "karty_kredytowe",
  "ubezpieczenia",
];

const CATEGORY_LABELS: Record<string, string> = {
  konta_osobiste: "Konta osobiste",
  kredyty_hipoteczne: "Kredyty hipoteczne",
  kredyty_gotowkowe: "Kredyty gotówkowe",
  lokaty: "Lokaty",
  konta_oszczednosciowe: "Konta oszczędnościowe",
  karty_kredytowe: "Karty kredytowe",
  ubezpieczenia: "Ubezpieczenia",
};

const AdminPartners = () => {
  const [partners, setPartners] = useState<PartnerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetchingOffers, setFetchingOffers] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    api_key: string;
    api_secret: string;
    task_points: number;
    base_url: string;
    categories: CategoryConfig[];
  }>({
    api_key: "", api_secret: "", task_points: 10, base_url: "", categories: []
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
    // Build categories from existing data
    const catPoints = partner.category_points || {};
    const catModes = partner.category_calc_mode || {};
    const catKeysConfigured = partner.category_api_keys_configured || {};
    const allCats = new Set([...Object.keys(catPoints), ...Object.keys(catModes), ...Object.keys(catKeysConfigured)]);
    
    const categories: CategoryConfig[] = Array.from(allCats).map(cat => ({
      name: cat,
      points: catPoints[cat] || 0,
      mode: (catModes[cat] as "flat" | "per_1000") || "flat",
      api_key: "", // Don't show existing keys
    }));

    setEditValues({
      api_key: "",
      api_secret: "",
      task_points: partner.task_points,
      base_url: partner.base_url || "",
      categories,
    });
  };

  const addCategory = () => {
    const existing = editValues.categories.map(c => c.name);
    const available = PRESET_CATEGORIES.filter(c => !existing.includes(c));
    const newCat = available[0] || `custom_${Date.now()}`;
    setEditValues(prev => ({
      ...prev,
      categories: [...prev.categories, { name: newCat, points: 0, mode: "flat", api_key: "" }],
    }));
  };

  const removeCategory = (index: number) => {
    setEditValues(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index: number, field: keyof CategoryConfig, value: any) => {
    setEditValues(prev => ({
      ...prev,
      categories: prev.categories.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const saveSettings = async (id: string) => {
    try {
      const categoryPoints: Record<string, number> = {};
      const categoryCalcMode: Record<string, string> = {};
      const categoryApiKeys: Record<string, string> = {};

      for (const cat of editValues.categories) {
        categoryPoints[cat.name] = cat.points;
        categoryCalcMode[cat.name] = cat.mode;
        if (cat.api_key) categoryApiKeys[cat.name] = cat.api_key;
      }

      const body: Record<string, any> = {
        id,
        task_points: editValues.task_points,
        base_url: editValues.base_url || null,
        category_points: categoryPoints,
        category_calc_mode: categoryCalcMode,
      };
      if (editValues.api_key) body.api_key = editValues.api_key;
      if (editValues.api_secret) body.api_secret = editValues.api_secret;
      if (Object.keys(categoryApiKeys).length > 0) body.category_api_keys = categoryApiKeys;

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
                  <div className="mt-4 space-y-4 border-t pt-4 animate-fade-in">
                    {/* Global settings */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>API Key (globalny)</Label>
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
                        <Label className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" /> Domyślne punkty za zadanie</Label>
                        <Input type="number" min={0} max={10000} value={editValues.task_points} onChange={e => setEditValues(prev => ({ ...prev, task_points: Number(e.target.value) }))} className="mt-1.5" />
                      </div>
                    </div>

                    {/* Category-specific point config */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">Punkty per kategoria</Label>
                        <Button variant="outline" size="sm" onClick={addCategory}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Dodaj kategorię
                        </Button>
                      </div>

                      {editValues.categories.length === 0 && (
                        <p className="text-xs text-muted-foreground">Brak skonfigurowanych kategorii. Dodaj kategorię, aby ustawić indywidualne stawki punktowe.</p>
                      )}

                      <div className="space-y-3">
                        {editValues.categories.map((cat, idx) => (
                          <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Select value={cat.name} onValueChange={v => updateCategory(idx, "name", v)}>
                                <SelectTrigger className="w-48 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRESET_CATEGORIES.map(pc => (
                                    <SelectItem key={pc} value={pc}>{CATEGORY_LABELS[pc] || pc}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCategory(idx)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <Label className="text-xs">Tryb naliczania</Label>
                                <Select value={cat.mode} onValueChange={v => updateCategory(idx, "mode", v)}>
                                  <SelectTrigger className="h-8 text-xs mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="flat">Stała kwota (za akcję)</SelectItem>
                                    <SelectItem value="per_1000">Za każde 1000 zł</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">
                                  {cat.mode === "per_1000" ? "Punkty za 1000 zł" : "Punkty za akcję"}
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100000}
                                  value={cat.points}
                                  onChange={e => updateCategory(idx, "points", Number(e.target.value))}
                                  className="h-8 text-xs mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">API Key (kategorii)</Label>
                                <Input
                                  type="password"
                                  placeholder="Opcjonalnie..."
                                  value={cat.api_key}
                                  onChange={e => updateCategory(idx, "api_key", e.target.value)}
                                  className="h-8 text-xs mt-1"
                                />
                              </div>
                            </div>
                            {cat.mode === "per_1000" && (
                              <p className="text-xs text-muted-foreground">
                                Przykład: przy {cat.points} pkt/1000 zł → kredyt 50 000 zł = {Math.floor(cat.points * 50)} pkt
                              </p>
                            )}
                          </div>
                        ))}
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
