import { useState, useEffect } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StoreRow {
  id: string;
  name: string;
  logo: string;
  color: string;
  enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
}

const AdminStores = () => {
  const [storeList, setStoreList] = useState<StoreRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<{ api_key: string; api_secret: string }>({ api_key: "", api_secret: "" });
  const { toast } = useToast();

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stores").select("*").order("name");
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      setStoreList(data as StoreRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    await supabase.from("stores").update({ enabled: !currentEnabled }).eq("id", id);
    setStoreList(prev => prev.map(s => s.id === id ? { ...s, enabled: !currentEnabled } : s));
    toast({ title: !currentEnabled ? "Sklep włączony" : "Sklep wyłączony" });
  };

  const startEditing = (store: StoreRow) => {
    setEditingId(store.id);
    setEditValues({ api_key: store.api_key || "", api_secret: store.api_secret || "" });
  };

  const saveApiKeys = async (id: string) => {
    const { error } = await supabase.from("stores").update({
      api_key: editValues.api_key || null,
      api_secret: editValues.api_secret || null,
    }).eq("id", id);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zapisano klucze API ✓" });
      setEditingId(null);
      fetchStores();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-product">
        <h2 className="mb-4 text-lg font-bold text-foreground">Zarządzanie Sklepami</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Włączaj/wyłączaj sklepy i konfiguruj dane API do programów partnerskich.
        </p>

        <div className="space-y-3">
          {storeList.map(store => (
            <div key={store.id} className="rounded-lg border bg-background p-4 transition-all hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{store.logo}</span>
                  <div>
                    <p className="font-semibold text-foreground">{store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {store.enabled ? "Aktywny" : "Wyłączony"}
                      {store.api_key ? " · API skonfigurowane" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={store.enabled} onCheckedChange={() => toggleEnabled(store.id, store.enabled)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editingId === store.id ? setEditingId(null) : startEditing(store)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingId === store.id && (
                <div className="mt-4 space-y-3 border-t pt-4 animate-fade-in">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        placeholder="Wprowadź klucz API..."
                        value={editValues.api_key}
                        onChange={e => setEditValues(prev => ({ ...prev, api_key: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        placeholder="Wprowadź sekret API..."
                        value={editValues.api_secret}
                        onChange={e => setEditValues(prev => ({ ...prev, api_secret: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveApiKeys(store.id)}>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Zapisz
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminStores;
