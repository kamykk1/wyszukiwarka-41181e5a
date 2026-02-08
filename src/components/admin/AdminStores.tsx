import { useState } from "react";
import { Settings, Eye, EyeOff, Save } from "lucide-react";
import { stores as initialStores, Store } from "@/data/mockProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const AdminStores = () => {
  const [storeList, setStoreList] = useState<Store[]>(initialStores);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleEnabled = (id: string) => {
    setStoreList(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

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
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={store.enabled} onCheckedChange={() => toggleEnabled(store.id)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingId(editingId === store.id ? null : store.id)}
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
                      <div className="relative mt-1.5">
                        <Input type="password" placeholder="Wprowadź klucz API..." defaultValue={store.apiKey} />
                      </div>
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <div className="relative mt-1.5">
                        <Input type="password" placeholder="Wprowadź sekret API..." defaultValue={store.apiSecret} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
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
