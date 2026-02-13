import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MailingClick = () => {
  const [params] = useSearchParams();
  const campaignId = params.get("campaign");
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error" | "login">("loading");
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!campaignId) { setStatus("error"); return; }
    if (!user) { setStatus("login"); return; }

    const claim = async () => {
      const { data, error } = await supabase.rpc("award_mailing_click_points", {
        _campaign_id: campaignId,
      });

      if (error) { setStatus("error"); return; }
      const result = data as any;
      if (result?.success) {
        setPoints(result.points_awarded);
        setStatus("success");
      } else if (result?.reason === "already_clicked") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    };
    claim();
  }, [user, campaignId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        {status === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">+{points} punktów! 🎉</h1>
            <p className="mt-2 text-muted-foreground">Punkty zostały dodane do Twojego konta.</p>
          </>
        )}
        {status === "already" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Już odebrano</h1>
            <p className="mt-2 text-muted-foreground">Punkty za tę kampanię zostały już przyznane.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Błąd</h1>
            <p className="mt-2 text-muted-foreground">Nie udało się przyznać punktów.</p>
          </>
        )}
        {status === "login" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Zaloguj się</h1>
            <p className="mt-2 text-muted-foreground">Musisz być zalogowany, aby odebrać punkty.</p>
            <Button asChild className="mt-4"><Link to="/login">Zaloguj się</Link></Button>
          </>
        )}
        <Button asChild variant="outline" className="mt-6"><Link to="/">Wróć na stronę główną</Link></Button>
      </div>
    </div>
  );
};

export default MailingClick;
