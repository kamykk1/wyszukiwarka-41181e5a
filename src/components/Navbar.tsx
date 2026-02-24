import { Link } from "react-router-dom";
import { User, LogIn, LogOut, Menu, Heart, Gift, Trophy, Landmark, CreditCard, PiggyBank, Percent, ChevronDown, Dices, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState, useRef } from "react";
import logo from "@/assets/logo.png";

const kontaSubpages = [
  { label: "Konta osobiste", path: "/konta?typ=konta_osobiste" },
  { label: "Konta firmowe", path: "/konta?typ=konta_firmowe" },
  { label: "Konta oszczędnościowe", path: "/konta?typ=konta_oszczednosciowe" },
];

const kredytySubpages = [
  { label: "Kredyty gotówkowe", path: "/kredyty?typ=kredyty_gotowkowe" },
  { label: "Kredyty konsolidacyjne", path: "/kredyty?typ=kredyty_konsolidacyjne" },
  { label: "Kredyty hipoteczne", path: "/kredyty?typ=kredyty_hipoteczne" },
];

interface HoverDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const HoverDropdown = ({ trigger, children }: HoverDropdownProps) => {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const enter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      {trigger}
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-md animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
  >
    {children}
  </Link>
);

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const profileItems = (
    <>
      <DropdownItem to="/profile">
        <User className="mr-2 h-4 w-4" /> Profil
      </DropdownItem>
      <DropdownItem to="/favorites">
        <Heart className="mr-2 h-4 w-4" /> Ulubione
      </DropdownItem>
      <DropdownItem to="/rewards">
        <Gift className="mr-2 h-4 w-4" /> Nagrody
      </DropdownItem>
      <DropdownItem to="/leaderboard">
        <Trophy className="mr-2 h-4 w-4" /> Ranking
      </DropdownItem>
      <DropdownItem to="/kolo-fortuny">
        <Dices className="mr-2 h-4 w-4" /> Koło fortuny
      </DropdownItem>
      <DropdownItem to="/polecaj">
        <Share2 className="mr-2 h-4 w-4" /> Program polecający
      </DropdownItem>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="NetSzukacz" className="h-20 w-auto rounded-lg" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-lg font-black text-accent">netszukacz.pl</span>
            <span className="text-[10px] text-muted-foreground">otrzymuj punkty za codzienne czynności</span>
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cashback">
              <Percent className="mr-1.5 h-4 w-4" />
              Cashback
            </Link>
          </Button>

          {/* Konta - hover */}
          <HoverDropdown
            trigger={
              <Button variant="ghost" size="sm">
                <Landmark className="mr-1.5 h-4 w-4" />
                Konta Bankowe
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            }
          >
            {kontaSubpages.map(s => (
              <DropdownItem key={s.path} to={s.path}>{s.label}</DropdownItem>
            ))}
          </HoverDropdown>

          {/* Kredyty - hover */}
          <HoverDropdown
            trigger={
              <Button variant="ghost" size="sm">
                <CreditCard className="mr-1.5 h-4 w-4" />
                Kredyty
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            }
          >
            {kredytySubpages.map(s => (
              <DropdownItem key={s.path} to={s.path}>{s.label}</DropdownItem>
            ))}
          </HoverDropdown>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/lokaty">
              <PiggyBank className="mr-1.5 h-4 w-4" />
              Lokaty
            </Link>
          </Button>

          {user ? (
            <>
              {/* Profile hover dropdown */}
              <HoverDropdown
                trigger={
                  <Button variant="ghost" size="sm">
                    <User className="mr-1.5 h-4 w-4" />
                    Profil
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                }
              >
                {profileItems}
                <div className="my-1 border-t" />
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent/10 transition-colors text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Wyloguj
                </button>
              </HoverDropdown>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Zaloguj
                </Link>
              </Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link to="/register">
                  <User className="mr-1.5 h-4 w-4" />
                  Rejestracja
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 overflow-y-auto">
            <SheetTitle className="text-lg font-bold">Menu</SheetTitle>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                <Link to="/cashback">
                  <Percent className="mr-1.5 h-4 w-4" /> Cashback
                </Link>
              </Button>

              {/* Konta mobile */}
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                  <Link to="/konta">
                    <Landmark className="mr-1.5 h-4 w-4" /> Konta Bankowe
                  </Link>
                </Button>
                <div className="pl-6 flex flex-col gap-0.5">
                  {kontaSubpages.map(s => (
                    <Button key={s.path} variant="ghost" size="sm" className="justify-start text-xs h-8" asChild onClick={() => setOpen(false)}>
                      <Link to={s.path}>{s.label}</Link>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Kredyty mobile */}
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                  <Link to="/kredyty">
                    <CreditCard className="mr-1.5 h-4 w-4" /> Kredyty
                  </Link>
                </Button>
                <div className="pl-6 flex flex-col gap-0.5">
                  {kredytySubpages.map(s => (
                    <Button key={s.path} variant="ghost" size="sm" className="justify-start text-xs h-8" asChild onClick={() => setOpen(false)}>
                      <Link to={s.path}>{s.label}</Link>
                    </Button>
                  ))}
                </div>
              </div>

              <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                <Link to="/lokaty">
                  <PiggyBank className="mr-1.5 h-4 w-4" /> Lokaty
                </Link>
              </Button>

              {user && (
                <>
                  <div className="my-1 border-t" />
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/profile"><User className="mr-1.5 h-4 w-4" /> Profil</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/favorites"><Heart className="mr-1.5 h-4 w-4" /> Ulubione</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/rewards"><Gift className="mr-1.5 h-4 w-4" /> Nagrody</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/leaderboard"><Trophy className="mr-1.5 h-4 w-4" /> Ranking</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/kolo-fortuny"><Dices className="mr-1.5 h-4 w-4" /> Koło fortuny</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/polecaj"><Share2 className="mr-1.5 h-4 w-4" /> Program polecający</Link>
                  </Button>
                </>
              )}

              {user ? (
                <Button variant="outline" size="sm" onClick={() => { signOut(); setOpen(false); }}>
                  <LogOut className="mr-1.5 h-4 w-4" /> Wyloguj
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
                    <Link to="/login"><LogIn className="mr-1.5 h-4 w-4" /> Zaloguj</Link>
                  </Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild onClick={() => setOpen(false)}>
                    <Link to="/register"><User className="mr-1.5 h-4 w-4" /> Rejestracja</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navbar;
