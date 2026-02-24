import { Link } from "react-router-dom";
import { Gift, Star, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const GuestBenefitsBanner = () => (
  <div className="mb-8 rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 p-6 md:p-8">
    <div className="text-center mb-4">
      <h2 className="text-lg font-bold text-foreground md:text-xl">
        🎁 Dołącz do <span className="text-accent">netszukacz.pl</span> i zyskaj więcej!
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Zarejestrowani użytkownicy korzystają z dodatkowych korzyści
      </p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
      <div className="flex items-start gap-2.5 rounded-lg bg-card/80 p-3 border">
        <Star className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">Zbieraj punkty</p>
          <p className="text-xs text-muted-foreground">Klikaj w oferty i zbieraj punkty za każdą aktywność</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-card/80 p-3 border">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">Wymieniaj na nagrody</p>
          <p className="text-xs text-muted-foreground">Punkty wymieniaj na realne nagrody i vouchery</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-card/80 p-3 border">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">Polecaj znajomym</p>
          <p className="text-xs text-muted-foreground">Zaproś znajomych i otrzymaj dodatkowe punkty</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-card/80 p-3 border">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">Bonus za produkty</p>
          <p className="text-xs text-muted-foreground">Zdobywaj punkty bonusowe za założenie konta lub kredytu</p>
        </div>
      </div>
    </div>
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Link to="/register">Zarejestruj się za darmo</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/login">Mam już konto — zaloguj się</Link>
      </Button>
    </div>
  </div>
);

export default GuestBenefitsBanner;
