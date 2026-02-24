import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Referral {
  id: string;
  referred_user_id: string;
  points_awarded_referrer: number;
  points_awarded_referred: number;
  created_at: string;
}

export const useReferral = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_or_create_referral_code");
    if (data) setReferralCode(data as string);
  };

  const fetchReferrals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("referral_codes" as any)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const { data: refs } = await supabase
        .from("referrals" as any)
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      setReferrals((refs as any as Referral[]) || []);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCode(), fetchReferrals()]);
      setLoading(false);
    };
    load();
  }, [user]);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : null;

  return { referralCode, referralLink, referrals, loading, refetch: () => { fetchCode(); fetchReferrals(); } };
};
