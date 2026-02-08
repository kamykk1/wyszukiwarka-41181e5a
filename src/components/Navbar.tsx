import { Link, useLocation } from "react-router-dom";
import { Search, User, Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

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

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <Search className="mr-1.5 h-4 w-4" />
              Szukaj
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <Shield className="mr-1.5 h-4 w-4" />
              Admin
            </Link>
          </Button>
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
