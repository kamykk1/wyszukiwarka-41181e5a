import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PriceAlert {
  id: string;
  product_name: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
}

export function usePriceAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    const { data } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts((data as PriceAlert[]) ?? []);
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const createAlert = async (productName: string, targetPrice: number) => {
    if (!user) {
      toast({ title: "Zaloguj się", description: "Musisz być zalogowany.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("price_alerts").upsert(
      { user_id: user.id, product_name: productName, target_price: targetPrice, is_active: true },
      { onConflict: "user_id,product_name" }
    );
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Alert cenowy ustawiony 🔔", description: `Powiadomimy Cię gdy cena spadnie poniżej ${targetPrice.toFixed(2)} PLN` });
      await fetchAlerts();
    }
    setLoading(false);
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast({ title: "Alert usunięty" });
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    await supabase.from("price_alerts").update({ is_active: !isActive }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
  };

  const getAlertForProduct = (productName: string) => alerts.find(a => a.product_name === productName);

  return { alerts, createAlert, deleteAlert, toggleAlert, getAlertForProduct, loading };
}
