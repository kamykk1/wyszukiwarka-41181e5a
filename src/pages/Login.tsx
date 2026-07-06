import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn, Lock, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const registerHref = safeNext ? `/register?next=${encodeURIComponent(safeNext)}` : "/register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let emailToUse = identifier.trim();

    // If not an email, look up the username to find email
    if (!emailToUse.includes("@")) {
      const { data } = await supabase.rpc("get_email_by_username", { _username: emailToUse });

      if (!data) {
        toast.error("Nie znaleziono użytkownika o podanym loginie");
        setLoading(false);
        return;
      }
      emailToUse = data as string;
    }

    const { error } = await signIn(emailToUse, password);
    setLoading(false);
    if (error) {
      toast.error("Błąd logowania", { description: error.message });
    } else {
      toast.success("Zalogowano pomyślnie!");
      if (safeNext) window.location.href = safeNext;
      else navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md animate-fade-in">
          <div className="rounded-2xl border bg-card p-8 shadow-product">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-extrabold text-accent-foreground">
                SP
              </div>
              <h1 className="text-2xl font-bold text-foreground">Witaj z powrotem</h1>
              <p className="mt-1 text-sm text-muted-foreground">Zaloguj się do swojego konta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email lub login</Label>
                <div className="relative mt-1.5">
                  <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="identifier" type="text" placeholder="jan@example.com lub login" value={identifier} onChange={e => setIdentifier(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Hasło</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm">
              <Link to="/forgot-password" className="text-muted-foreground hover:text-accent hover:underline">
                Zapomniałem hasła
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Nie masz konta?{" "}
              <Link to={registerHref} className="font-medium text-accent hover:underline">
                Zarejestruj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
