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
  has_api_key: boolean;
  has_api_secret: boolean;
}

const AdminStores = () => {
  const [storeList, setStoreList] = useState<StoreRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<{ api_key: string; api_secret: string }>({ api_key: "", api_secret: "" });
  const { toast } = useToast();

  const callEdgeFunction = async (action: string, method: string, body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stores?action=${action}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await callEdgeFunction("list", "GET");
      setStoreList(data as StoreRow[]);
    } catch (error: any) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      await callEdgeFunction("toggle", "POST", { id, enabled: !currentEnabled });
      setStoreList(prev => prev.map(s => s.id === id ? { ...s, enabled: !currentEnabled } : s));
      toast({ title: !currentEnabled ? "Sklep włączony" : "Sklep wyłączony" });
    } catch (error: any) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    }
  };

  const startEditing = (store: StoreRow) => {
    setEditingId(store.id);
    setEditValues({ api_key: "", api_secret: "" });
  };

  const saveApiKeys = async (id: string) => {
    try {
      await callEdgeFunction("update-keys", "POST", {
        id,
        api_key: editValues.api_key || null,
        api_secret: editValues.api_secret || null,
      });
      toast({ title: "Zapisano klucze API ✓" });
      setEditingId(null);
      fetchStores();
    } catch (error: any) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
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
                      {store.has_api_key ? " · API skonfigurowane" : ""}
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
                        placeholder="Wprowadź nowy klucz API..."
                        value={editValues.api_key}
                        onChange={e => setEditValues(prev => ({ ...prev, api_key: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        placeholder="Wprowadź nowy sekret API..."
                        value={editValues.api_secret}
                        onChange={e => setEditValues(prev => ({ ...prev, api_secret: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pozostaw puste, aby usunąć klucz. Istniejące klucze nie są wyświetlane ze względów bezpieczeństwa.
                  </p>
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
