import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserPoints() {
  const { user } = useAuth();
  const [totalEarned, setTotalEarned] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setTotalEarned(null); return; }
    supabase
      .from("user_points")
      .select("total_earned")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setTotalEarned(data?.total_earned ?? 0));
  }, [user]);

  return totalEarned;
}
