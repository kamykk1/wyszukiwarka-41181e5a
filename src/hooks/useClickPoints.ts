import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useClickPoints = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const trackPurchaseClick = useCallback(
    async (productName: string) => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc("award_click_points", {
          _product_name: productName,
        });

        if (error) {
          console.error("Click points error:", error);
          return;
        }

        if (data && typeof data === "object" && "success" in data && (data as any).success) {
          toast({
            title: "+1 punkt! 🎉",
            description: "Zdobyłeś punkt za kliknięcie w link zakupowy.",
          });
        }
      } catch (err) {
        console.error("Click points error:", err);
      }
    },
    [user, toast]
  );

  return { trackPurchaseClick };
};
