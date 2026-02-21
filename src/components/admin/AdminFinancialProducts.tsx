import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Save, X, Landmark, CreditCard, PiggyBank, Coins, Key, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const allCategories = [
  { value: "konta_osobiste", label: "Konta osobiste", group: "konta", icon: Landmark },
  { value: "konta_firmowe", label: "Konta firmowe", group: "konta", icon: Landmark },
  { value: "konta_oszczednosciowe", label: "Konta oszczędnościowe", group: "konta", icon: Landmark },
  { value: "kredyty_gotowkowe", label: "Kredyty gotówkowe", group: "kredyty", icon: CreditCard },
  { value: "kredyty_konsolidacyjne", label: "Kredyty konsolidacyjne", group: "kredyty", icon: CreditCard },
  { value: "kredyty_hipoteczne", label: "Kredyty hipoteczne", group: "kredyty", icon: CreditCard },
  { value: "lokaty", label: "Lokaty", group: "lokaty", icon: PiggyBank },
];

const groupTabs = [
  { value: "all", label: "Wszystkie" },
  { value: "konta", label: "Konta" },
  { value: "kredyty", label: "Kredyty" },
  { value: "lokaty", label: "Lokaty" },
];

interface Product {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string | null;
  interest_rate: number | null;
  annual_fee: number | null;
  min_amount: number | null;
  max_amount: number | null;
  features: string[];
  affiliate_url: string | null;
  image_url: string | null;
  is_active: boolean;
  partner_id: string | null;
  source: string | null;
  points_reward: number | null;
}

interface PartnerIntegration {
  id: string;
  display_name: string;
  enabled: boolean;
  category_points: Record<string, number>;
  category_api_keys: Record<string, string>;
}

const emptyForm = {
  name: "", provider: "", category: "konta_osobiste", description: "",
  interest_rate: "", annual_fee: "", min_amount: "", max_amount: "",
  features: "", affiliate_url: "", image_url: "", is_active: true, partner_id: "",
  points_reward: "",
};

const AdminFinancialProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<PartnerIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Per-category points editing
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerIntegration | null>(null);
  const [categoryPoints, setCategoryPoints] = useState<Record<string, number>>({});

  // Per-category API keys editing
  const [keysDialogOpen, setKeysDialogOpen] = useState(false);
  const [editingKeysPartner, setEditingKeysPartner] = useState<PartnerIntegration | null>(null);
  const [categoryApiKeys, setCategoryApiKeys] = useState<Record<string, string>>({});

  // Product history
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from("partner_tasks")
      .select("id, user_id, points_awarded, task_type, created_at, status")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    // Fetch user emails for the tasks
    const tasks = data || [];
    if (tasks.length > 0) {
      const userIds = [...new Set(tasks.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      for (const t of tasks) {
        const profile = profileMap.get(t.user_id);
        (t as any).email = profile?.email || "—";
        (t as any).user_name = profile?.name || null;
      }
    }
    setHistoryData(tasks);
    setHistoryLoading(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [prodRes, partRes] = await Promise.all([
      supabase.from("financial_products").select("*").order("category").order("name"),
      supabase.from("partner_integrations").select("id, display_name, enabled, category_points, category_api_keys"),
    ]);
    setProducts((prodRes.data as any[]) || []);
    setPartners((partRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredProducts = products.filter(p => {
    if (groupFilter === "all") return true;
    const cat = allCategories.find(c => c.value === p.category);
    return cat?.group === groupFilter;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      provider: p.provider,
      category: p.category,
      description: p.description || "",
      interest_rate: p.interest_rate?.toString() || "",
      annual_fee: p.annual_fee?.toString() || "",
      min_amount: p.min_amount?.toString() || "",
      max_amount: p.max_amount?.toString() || "",
      features: Array.isArray(p.features) ? p.features.join(", ") : "",
      affiliate_url: p.affiliate_url || "",
      image_url: p.image_url || "",
      is_active: p.is_active,
      partner_id: p.partner_id || "",
      points_reward: p.points_reward?.toString() || "",
    });
    setDialogOpen(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.provider || !form.category) {
      toast({ title: "Uzupełnij nazwę, dostawcę i kategorię", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      provider: form.provider,
      category: form.category,
      description: form.description || null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      annual_fee: form.annual_fee ? parseFloat(form.annual_fee) : null,
      min_amount: form.min_amount ? parseFloat(form.min_amount) : null,
      max_amount: form.max_amount ? parseFloat(form.max_amount) : null,
      features: form.features ? form.features.split(",").map(f => f.trim()).filter(Boolean) : [],
      affiliate_url: form.affiliate_url || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      partner_id: form.partner_id || null,
      points_reward: form.points_reward ? parseInt(form.points_reward) : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("financial_products").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("financial_products").insert(payload));
    }

    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Produkt zaktualizowany ✓" : "Produkt dodany ✓" });
      setDialogOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("financial_products").delete().eq("id", id);
    toast({ title: "Produkt usunięty" });
    fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("financial_products").update({ is_active: !current }).eq("id", id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
  };

  // Per-category points
  const openPointsDialog = (partner: PartnerIntegration) => {
    setEditingPartner(partner);
    setCategoryPoints({ ...partner.category_points });
    setPointsDialogOpen(true);
  };

  const saveCategoryPoints = async () => {
    if (!editingPartner) return;
    const { error } = await supabase.from("partner_integrations")
      .update({ category_points: categoryPoints })
      .eq("id", editingPartner.id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Punkty per kategoria zapisane ✓" });
      setPointsDialogOpen(false);
      fetchAll();
    }
  };

  // Per-category API keys
  const openKeysDialog = (partner: PartnerIntegration) => {
    setEditingKeysPartner(partner);
    setCategoryApiKeys({ ...partner.category_api_keys });
    setKeysDialogOpen(true);
  };

  const saveCategoryApiKeys = async () => {
    if (!editingKeysPartner) return;
    const { error } = await supabase.from("partner_integrations")
      .update({ category_api_keys: categoryApiKeys } as any)
      .eq("id", editingKeysPartner.id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Klucze API per kategoria zapisane ✓" });
      setKeysDialogOpen(false);
      fetchAll();
    }
  };

  const getCategoryLabel = (val: string) => allCategories.find(c => c.value === val)?.label || val;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Per-category points per API partner */}
      {partners.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-product">
          <h3 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
            <Coins className="h-4 w-4" /> Punkty za ofertę per kategoria (per API)
          </h3>
          <div className="space-y-2">
            {partners.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
                <div>
                  <p className="font-medium text-foreground text-sm">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(p.category_points || {}).length > 0
                      ? Object.entries(p.category_points).map(([k, v]) => `${getCategoryLabel(k)}: ${v} pkt`).join(" · ")
                      : "Brak ustawień per kategoria"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPointsDialog(p)}>
                    <Coins className="mr-1.5 h-3.5 w-3.5" /> Punkty
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openKeysDialog(p)}>
                    <Key className="mr-1.5 h-3.5 w-3.5" /> Klucze API
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="rounded-xl border bg-card shadow-product">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">Oferty finansowe ({filteredProducts.length})</h2>
          <div className="flex items-center gap-2">
            <Tabs value={groupFilter} onValueChange={setGroupFilter}>
              <TabsList className="h-8">
                {groupTabs.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-1">{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Dodaj
            </Button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Brak ofert w wybranej kategorii.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Nazwa</th>
                  <th className="px-4 py-3">Dostawca</th>
                  <th className="px-4 py-3">Kategoria</th>
                  <th className="px-4 py-3">Oprocentowanie</th>
                  <th className="px-4 py-3">Punkty</th>
                  <th className="px-4 py-3">Aktywna</th>
                  <th className="px-4 py-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.provider}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{getCategoryLabel(p.category)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{p.interest_rate != null ? `${p.interest_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {(p as any).points_reward != null
                        ? <Badge className="bg-accent/10 text-accent text-xs">{(p as any).points_reward} pkt</Badge>
                        : <span className="text-muted-foreground text-xs">domyślne</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Historia punktów" onClick={() => openHistory(p)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj ofertę" : "Dodaj nową ofertę"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nazwa *</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Dostawca *</Label>
                <Input value={form.provider} onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Kategoria *</Label>
              <Select value={form.category} onValueChange={val => setForm(prev => ({ ...prev, category: val }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Oprocentowanie (%)</Label>
                <Input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(prev => ({ ...prev, interest_rate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Opłata roczna (zł)</Label>
                <Input type="number" step="0.01" value={form.annual_fee} onChange={e => setForm(prev => ({ ...prev, annual_fee: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Min. kwota (zł)</Label>
                <Input type="number" value={form.min_amount} onChange={e => setForm(prev => ({ ...prev, min_amount: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Max. kwota (zł)</Label>
                <Input type="number" value={form.max_amount} onChange={e => setForm(prev => ({ ...prev, max_amount: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Cechy (oddzielone przecinkami)</Label>
              <Input value={form.features} onChange={e => setForm(prev => ({ ...prev, features: e.target.value }))} className="mt-1" placeholder="Bez opłat, Cashback, Darmowe przelewy" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Link afiliacyjny</Label>
                <Input value={form.affiliate_url} onChange={e => setForm(prev => ({ ...prev, affiliate_url: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>URL obrazka</Label>
                <Input value={form.image_url} onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Punkty za produkt</Label>
              <Input
                type="number"
                min={0}
                max={1000000}
                value={form.points_reward}
                onChange={e => setForm(prev => ({ ...prev, points_reward: e.target.value }))}
                className="mt-1"
                placeholder="Puste = domyślne z kategorii"
              />
              <p className="text-xs text-muted-foreground mt-1">Jeśli puste, zostaną użyte punkty z konfiguracji kategorii partnera.</p>
            </div>
            <div>
              <Label>API Partner</Label>
              <Select value={form.partner_id || "none"} onValueChange={val => setForm(prev => ({ ...prev, partner_id: val === "none" ? "" : val }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak (ręczna oferta)</SelectItem>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={val => setForm(prev => ({ ...prev, is_active: val }))} />
              <Label>Aktywna</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="mr-1.5 h-3.5 w-3.5" /> Anuluj</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveProduct} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Zapisz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Per-category Points Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" /> Punkty per kategoria — {editingPartner?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {allCategories.map(cat => (
              <div key={cat.value} className="flex items-center justify-between gap-4">
                <Label className="text-sm">{cat.label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  className="w-24"
                  value={categoryPoints[cat.value] ?? ""}
                  placeholder="0"
                  onChange={e => setCategoryPoints(prev => ({
                    ...prev,
                    [cat.value]: e.target.value ? Number(e.target.value) : 0,
                  }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>Anuluj</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveCategoryPoints}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Zapisz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Per-category API Keys Dialog */}
      <Dialog open={keysDialogOpen} onOpenChange={setKeysDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> Klucze API per kategoria — {editingKeysPartner?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {allCategories.map(cat => (
              <div key={cat.value} className="space-y-1">
                <Label className="text-sm">{cat.label}</Label>
                <Input
                  type="text"
                  className="font-mono text-xs"
                  value={categoryApiKeys[cat.value] ?? ""}
                  placeholder="Brak klucza"
                  onChange={e => setCategoryApiKeys(prev => ({
                    ...prev,
                    [cat.value]: e.target.value,
                  }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setKeysDialogOpen(false)}>Anuluj</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveCategoryApiKeys}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Zapisz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Points History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Historia punktów — {historyProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historyData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Brak przyznanych punktów dla tego produktu.
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Łącznie: <strong className="text-foreground">{historyData.length}</strong> transakcji</span>
                <span>Suma: <strong className="text-accent">{historyData.reduce((s, t) => s + (t.points_awarded || 0), 0)} pkt</strong></span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground bg-muted/50">
                      <th className="px-3 py-2">Użytkownik</th>
                      <th className="px-3 py-2">Punkty</th>
                      <th className="px-3 py-2">Typ</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((t: any) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="text-foreground text-xs font-medium">{t.user_name || "—"}</div>
                          <div className="text-muted-foreground text-xs">{t.email}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className="bg-accent/10 text-accent text-xs">{t.points_awarded} pkt</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{t.task_type}</td>
                        <td className="px-3 py-2">
                          <Badge variant={t.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("pl-PL")} {new Date(t.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinancialProducts;
