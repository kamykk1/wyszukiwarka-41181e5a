import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
}

export interface UserPoints {
  balance: number;
  total_earned: number;
}

export interface Redemption {
  id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  rewards?: Reward;
}

export const useRewards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints>({ balance: 0, total_earned: 0 });
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = async () => {
    const { data } = await supabase
      .from("rewards")
      .select("*")
      .eq("is_active", true)
      .order("points_cost", { ascending: true });
    setRewards((data as Reward[]) || []);
  };

  const fetchUserPoints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_points")
      .select("balance, total_earned")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setUserPoints(data);
  };

  const fetchRedemptions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reward_redemptions")
      .select("*, rewards(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRedemptions((data as Redemption[]) || []);
  };

  const redeemReward = async (reward: Reward) => {
    if (!user) return;
    if (userPoints.balance < reward.points_cost) {
      toast({ title: "Za mało punktów", description: "Nie masz wystarczającej liczby punktów.", variant: "destructive" });
      return;
    }

    // Insert redemption
    const { error: redemptionError } = await supabase.from("reward_redemptions").insert({
      user_id: user.id,
      reward_id: reward.id,
      points_spent: reward.points_cost,
    });
    if (redemptionError) {
      toast({ title: "Błąd", description: "Nie udało się odebrać nagrody.", variant: "destructive" });
      return;
    }

    // Deduct points
    const { error: pointsError } = await supabase
      .from("user_points")
      .update({ balance: userPoints.balance - reward.points_cost })
      .eq("user_id", user.id);

    if (pointsError) {
      toast({ title: "Błąd", description: "Problem z aktualizacją punktów.", variant: "destructive" });
      return;
    }

    // Log transaction
    await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: -reward.points_cost,
      type: "redeemed",
      description: `Odebrano: ${reward.name}`,
    });

    toast({ title: "Sukces! 🎉", description: `Odebrano nagrodę: ${reward.name}` });
    fetchUserPoints();
    fetchRedemptions();
    fetchRewards();
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchUserPoints(), fetchRedemptions()]);
      setLoading(false);
    };
    loadAll();
  }, [user]);

  return { rewards, userPoints, redemptions, loading, redeemReward, refetch: () => { fetchRewards(); fetchUserPoints(); fetchRedemptions(); } };
};
