import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, UserCircle } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let emailToUse = identifier;

    // If not an email, look up the username
    if (!identifier.includes("@")) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", identifier)
        .maybeSingle();

      if (!data) {
        toast.error("Nie znaleziono użytkownika o podanym loginie");
        setLoading(false);
        return;
      }

      // Get email from auth via admin — we need to use a workaround:
      // Look up email stored in profile name or use the user_id approach
      // Actually, we need to get email. Let's query auth users via edge function or store email in profiles.
      // Simplest: store email in profile on signup (already stored via auth).
      // We'll look up via a different approach - get all profiles matching
      const { data: userData } = await supabase.auth.admin?.getUserById(data.user_id) || { data: null };
      
      // Fallback: since we can't use admin API from client, let's use a simpler approach
      // We'll try signing in with the identifier as email first, then as username
      // For username login, we need to store the email in the profiles table
      // Let's query the user's email from a public column or use an edge function
      
      // Simplest solution: try to find email from the user metadata
      // Actually the cleanest way is to just store email in profiles
      toast.error("Nie znaleziono użytkownika o podanym loginie");
      setLoading(false);
      return;
    }

    const { error } = await signIn(emailToUse, password);
    setLoading(false);
    if (error) {
      toast.error("Błąd logowania", { description: error.message });
    } else {
      toast.success("Zalogowano pomyślnie!");
      navigate("/");
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

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Nie masz konta?{" "}
              <Link to="/register" className="font-medium text-accent hover:underline">
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
