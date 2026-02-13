import { useState, useEffect } from "react";
import { Trophy, Medal, Loader2, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  name: string | null;
  avatar_url: string | null;
  total_earned: number;
  balance: number;
  rank: number;
}

const rankStyles: Record<number, { icon: React.ReactNode; color: string }> = {
  1: { icon: <Trophy className="h-5 w-5 text-yellow-500" />, color: "bg-yellow-500/10 border-yellow-500/30" },
  2: { icon: <Medal className="h-5 w-5 text-gray-400" />, color: "bg-gray-400/10 border-gray-400/30" },
  3: { icon: <Medal className="h-5 w-5 text-amber-700" />, color: "bg-amber-700/10 border-amber-700/30" },
};

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("leaderboard").select("*");
      setEntries((data as LeaderboardEntry[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Ranking Liderów
        </h1>

        {entries.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">Brak danych w rankingu. Zacznij zbierać punkty!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const style = rankStyles[entry.rank];
              return (
                <div
                  key={entry.rank + (entry.name || "")}
                  className={`flex items-center gap-4 rounded-xl border bg-card p-4 shadow-product transition-shadow hover:shadow-product-hover ${style?.color || ""}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-extrabold text-foreground">
                    {style?.icon || <span className="text-sm">{entry.rank}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {entry.name || "Anonim"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm font-bold">
                    {entry.total_earned} pkt
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
