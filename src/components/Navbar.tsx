import { Link, useLocation } from "react-router-dom";
import { Search, User, Shield, LogIn, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const navItems = (
    <>
      <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
        <Link to="/">
          <Search className="mr-1.5 h-4 w-4" />
          Szukaj
        </Link>
      </Button>
      {user && (
        <Button variant="ghost" size="sm" asChild onClick={() => setOpen(false)}>
          <Link to="/admin">
            <Shield className="mr-1.5 h-4 w-4" />
            Admin
          </Link>
        </Button>
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
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-extrabold text-accent-foreground text-sm">
            SP
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SmartPrice
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {navItems}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
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
