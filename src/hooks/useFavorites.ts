import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites([]); return; }
    const { data } = await supabase
      .from("favorites")
      .select("product_name")
      .eq("user_id", user.id);
    setFavorites(data?.map(f => f.product_name) ?? []);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = async (productName: string) => {
    if (!user) {
      toast({ title: "Zaloguj się", description: "Musisz być zalogowany, aby dodawać do ulubionych.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const isFav = favorites.includes(productName);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_name", productName);
      setFavorites(prev => prev.filter(f => f !== productName));
      toast({ title: "Usunięto z ulubionych" });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, product_name: productName });
      setFavorites(prev => [...prev, productName]);
      toast({ title: "Dodano do ulubionych ❤️" });
    }
    setLoading(false);
  };

  const isFavorite = (productName: string) => favorites.includes(productName);

  return { favorites, toggleFavorite, isFavorite, loading };
}
