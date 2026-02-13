import { useState, useEffect } from "react";
import { Bell, Loader2, Gift, Target, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: string;
  reference_id: string | null;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  threshold: { label: "Próg punktowy", icon: <Target className="h-4 w-4" />, color: "text-accent" },
  new_reward: { label: "Nowa nagroda", icon: <Gift className="h-4 w-4" />, color: "text-success" },
  mailing: { label: "Mailing", icon: <Mail className="h-4 w-4" />, color: "text-blue-500" },
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notification_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/login">Zaloguj się</Link></Button>
        </div>
      </div>
    );
  }

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
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Bell className="h-6 w-6" /> Powiadomienia
        </h1>

        {notifications.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center shadow-product">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">Brak powiadomień.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-product overflow-hidden">
            {notifications.map(n => {
              const cfg = typeConfig[n.type] || { label: n.type, icon: <Bell className="h-4 w-4" />, color: "text-muted-foreground" };
              return (
                <div key={n.id} className="flex items-center gap-4 border-b last:border-0 px-4 py-3">
                  <div className={`flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="text-xs">{cfg.label}</Badge>
                    {n.reference_id && <span className="ml-2 text-xs text-muted-foreground">Ref: {n.reference_id.substring(0, 8)}...</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
