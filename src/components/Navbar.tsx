import { Link, useLocation } from "react-router-dom";
import { Search, User, LogIn, LogOut, Menu, Heart, Gift, Trophy, Landmark, CreditCard, PiggyBank, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const navItems = (
    <>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/konta">
          <Landmark className="mr-1.5 h-4 w-4" />
          Konta Bankowe
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/kredyty">
          <CreditCard className="mr-1.5 h-4 w-4" />
          Kredyty
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/lokaty">
          <PiggyBank className="mr-1.5 h-4 w-4" />
          Lokaty
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/cashback">
          <Percent className="mr-1.5 h-4 w-4" />
          Cashback
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/leaderboard">
          <Trophy className="mr-1.5 h-4 w-4" />
          Ranking
        </Link>
      </Button>
      {user && (
        <>
          <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
            <Link to="/favorites">
              <Heart className="mr-1.5 h-4 w-4" />
              Ulubione
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
            <Link to="/rewards">
              <Gift className="mr-1.5 h-4 w-4" />
              Nagrody
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
            <Link to="/profile">
              <User className="mr-1.5 h-4 w-4" />
              Profil
            </Link>
          </Button>
        </>
      )}
      {user ? (
        <Button variant="outline" size="sm" onClick={() => { signOut(); setOpen(false); }}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Wyloguj
        </Button>
      ) : (
        <>
          <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
            <Link to="/login">
              <LogIn className="mr-1.5 h-4 w-4" />
              Zaloguj
            </Link>
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild onClick={() => setOpen(false)}>
            <Link to="/register">
              <User className="mr-1.5 h-4 w-4" />
              Rejestracja
            </Link>
          </Button>
        </>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="NetSzukacz" className="h-20 w-auto rounded-lg" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-lg font-black text-foreground">net szukacz.pl</span>
            <span className="text-[10px] text-muted-foreground">otrzymuj punkty za codzienne czynności</span>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          {navItems}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetTitle className="text-lg font-bold">Menu</SheetTitle>
            <div className="mt-6 flex flex-col gap-2">
              {navItems}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navbar;
