import { useState } from "react";
import { Gift, Copy, Check, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/hooks/useReferral";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Referral = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { referralLink, referrals, loading: refLoading } = useReferral();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Skopiowano! 📋", description: "Link polecający został skopiowany do schowka." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Gift className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby korzystać z programu polecającego.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="container mx-auto px-4 py-12 max-w-lg animate-fade-in">
        <div className="rounded-xl border bg-card p-6 shadow-product">
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Gift className="h-6 w-6" /> Program polecający
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            Poleć NetSzukacz znajomym i zdobądźcie bonusowe punkty!
          </p>
          {referralLink && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-2.5 font-mono text-sm text-foreground truncate">
                {referralLink}
              </div>
              <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {referrals.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                <Users className="h-4 w-4" /> Polecone osoby ({referrals.length})
              </p>
              <div className="space-y-2">
                {referrals.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pl-PL")}
                    </span>
                    <span className="font-bold text-success">+{r.points_awarded_referrer} pkt</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {referrals.length === 0 && !refLoading && (
            <p className="text-xs text-muted-foreground">Jeszcze nie poleciłeś nikogo. Udostępnij link i zarabiaj punkty!</p>
          )}
        </div>
      </section>
      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          © 2026 NetSzukacz.pl — Porównywarka cen i finansów. Wszystkie prawa zastrzeżone.
        </div>
      </footer>
    </div>
  );
};

export default Referral;
