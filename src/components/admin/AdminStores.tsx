import { useState, useEffect } from "react";
import { Settings, Save, Loader2, RefreshCw, Link2, Link2Off, Percent, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  partner_source: "manual" | "tradedoubler";
  tradedoubler_program_id: string | null;
  cashback_rate: number | null;
  cashback_type: string | null;
  affiliate_url: string | null;
}

interface TDProgram {
  id: string;
  name: string;
  cashback_rate: number | null;
  cashback_type: string | null;
  logo_url: string | null;
  category: string | null;
  synced_at: string;
}

const AdminStores = () => {
  const [storeList, setStoreList] = useState<StoreRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tdPrograms, setTdPrograms] = useState<TDProgram[]>([]);
  const [tdLoading, setTdLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ api_key: string; api_secret: string }>({ api_key: "", api_secret: "" });
  const { toast } = useToast();

  const callEdgeFunction = async (fnName: string, action: string, method: string, body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}?action=${action}`,
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
      const data = await callEdgeFunction("admin-stores", "list", "GET");
      setStoreList(data as StoreRow[]);
    } catch (error: any) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchCachedPrograms = async () => {
    try {
      const data = await callEdgeFunction("tradedoubler-sync", "cached-programs", "GET");
      setTdPrograms(data.programs || []);
    } catch {
      // silent - programs may not be synced yet
    }
  };

  useEffect(() => {
    fetchStores();
    fetchCachedPrograms();
  }, []);

  const syncTradedoubler = async () => {
    setTdLoading(true);
    try {
      const data = await callEdgeFunction("tradedoubler-sync", "programs", "GET");
      setTdPrograms(data.programs || []);
      toast({ title: `Zsynchronizowano ${data.count} programów z Tradedoubler ✓` });
    } catch (error: any) {
      toast({ title: "Błąd synchronizacji", description: error.message, variant: "destructive" });
    }
    setTdLoading(false);
  };

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      await callEdgeFunction("admin-stores", "toggle", "POST", { id, enabled: !currentEnabled });
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
      await callEdgeFunction("admin-stores", "update-keys", "POST", {
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

  const assignProgram = async (storeId: string, programId: string | null) => {
    setAssigningId(storeId);
    try {
      await callEdgeFunction("tradedoubler-sync", "assign", "POST", {
        store_id: storeId,
        program_id: programId,
      });
      const prog = programId ? tdPrograms.find(p => p.id === programId) : null;
      setStoreList(prev => prev.map(s =>
        s.id === storeId
          ? {
              ...s,
              partner_source: programId ? "tradedoubler" : "manual",
              tradedoubler_program_id: programId,
              cashback_rate: prog?.cashback_rate ?? null,
              cashback_type: prog?.cashback_type ?? null,
            }
          : s
      ));
      toast({ title: programId ? `Przypisano program: ${prog?.name} ✓` : "Odłączono program Tradedoubler" });
    } catch (error: any) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    }
    setAssigningId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tradedoubler-callback`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Skopiowano do schowka ✓" });
  };

  return (
    <div className="space-y-4">
      {/* Tradedoubler sync panel */}
      <div className="rounded-xl border bg-card p-4 shadow-product">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
              Tradedoubler — Synchronizacja programów
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tdPrograms.length > 0
                ? `${tdPrograms.length} programów w bazie · ostatnia sync: ${new Date(tdPrograms[0]?.synced_at).toLocaleString("pl-PL")}`
                : 'Wymaga TRADEDOUBLER_CLIENT_ID + TRADEDOUBLER_CLIENT_SECRET (OAuth 2.0)'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={syncTradedoubler}
            disabled={tdLoading}
            className="gap-2"
          >
            {tdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Synchronizuj
          </Button>
        </div>

        {/* OAuth setup info */}
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-muted/50 border px-3 py-2.5 text-xs space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-accent" />
              Wymagana konfiguracja OAuth 2.0
            </p>
            <p className="text-muted-foreground">
              Aby pobierać programy, skonfiguruj <strong>TRADEDOUBLER_CLIENT_ID</strong> i <strong>TRADEDOUBLER_CLIENT_SECRET</strong> jako sekrety projektu.
              Utwórz klienta OAuth na:{" "}
              <a href="https://publishers.tradedoubler.com/en/uaa/clients" target="_blank" rel="noopener" className="text-accent underline">
                publishers.tradedoubler.com/en/uaa/clients
              </a>
            </p>
          </div>

          {/* Callback URL */}
          <div className="rounded-lg bg-muted/50 border px-3 py-2.5 text-xs">
            <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-accent" />
              URL Callbacku transakcji (Postback URL)
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border rounded px-2 py-1 font-mono break-all">
                {callbackUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => copyToClipboard(callbackUrl)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1.5">
              Wklej ten URL w panelu Tradedoubler jako Postback URL.
              W linku afiliacyjnym przekazuj email użytkownika jako parametr <code className="bg-background px-1 rounded">epi1</code>.
            </p>
          </div>
        </div>

        {tdPrograms.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            Przypisz programy Tradedoubler do sklepów poniżej. Cashback rate zostanie automatycznie zaktualizowany.
          </div>
        )}
      </div>

      {/* Stores list */}
      <div className="rounded-xl border bg-card p-4 shadow-product">
        <h2 className="mb-4 text-lg font-bold text-foreground">Zarządzanie Sklepami</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Włączaj/wyłączaj sklepy, przypisuj programy Tradedoubler i konfiguruj klucze API.
        </p>

        <div className="space-y-3">
          {storeList.map(store => (
            <div key={store.id} className="rounded-lg border bg-background p-4 transition-all hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{store.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{store.name}</p>
                      {store.partner_source === "tradedoubler" && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">TD</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {store.enabled ? "Aktywny" : "Wyłączony"}
                      {store.cashback_rate != null && (
                        <span className="ml-1 text-primary font-medium">
                          · {store.cashback_rate}% cashback
                        </span>
                      )}
                      {store.has_api_key && store.partner_source === "manual" ? " · API skonfigurowane" : ""}
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
                <div className="mt-4 space-y-4 border-t pt-4 animate-fade-in">
                  {/* Tradedoubler program assignment */}
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium">Program partnerski Tradedoubler</Label>
                    <div className="flex gap-2">
                      <Select
                        value={store.tradedoubler_program_id || "none"}
                        onValueChange={(val) => {
                          if (assigningId !== store.id) {
                            assignProgram(store.id, val === "none" ? null : val);
                          }
                        }}
                        disabled={tdPrograms.length === 0 || assigningId === store.id}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={tdPrograms.length === 0 ? "Najpierw zsynchronizuj programy" : "Wybierz program…"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Link2Off className="h-3.5 w-3.5" /> Brak programu (ręczny)
                            </span>
                          </SelectItem>
                          {tdPrograms.map(prog => (
                            <SelectItem key={prog.id} value={prog.id}>
                              <span className="flex items-center gap-2">
                                <Link2 className="h-3.5 w-3.5 text-primary" />
                                {prog.name}
                                {prog.cashback_rate != null && (
                                  <span className="text-xs text-primary ml-1">{prog.cashback_rate}%</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assigningId === store.id && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                    </div>
                    {store.tradedoubler_program_id && (
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Cashback: {store.cashback_rate ?? "—"}% · Program ID: {store.tradedoubler_program_id}
                      </p>
                    )}
                  </div>

                  {/* Manual API keys */}
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Własne klucze API (opcjonalne)
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">API Key</Label>
                        <Input
                          type="password"
                          placeholder="Wprowadź nowy klucz API..."
                          value={editValues.api_key}
                          onChange={e => setEditValues(prev => ({ ...prev, api_key: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">API Secret</Label>
                        <Input
                          type="password"
                          placeholder="Wprowadź nowy sekret API..."
                          value={editValues.api_secret}
                          onChange={e => setEditValues(prev => ({ ...prev, api_secret: e.target.value }))}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Pozostaw puste, aby usunąć klucz. Istniejące klucze nie są wyświetlane ze względów bezpieczeństwa.
                    </p>
                    <div className="flex justify-end mt-3">
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveApiKeys(store.id)}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Zapisz klucze
                      </Button>
                    </div>
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
