import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Błąd", { description: error.message });
    } else {
      setSent(true);
      toast.success("Link do resetowania hasła został wysłany na podany adres email.");
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
                🔑
              </div>
              <h1 className="text-2xl font-bold text-foreground">Zapomniałem hasła</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Podaj swój adres email, a wyślemy Ci link do zresetowania hasła
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-foreground">
                    Sprawdź swoją skrzynkę email (<strong>{email}</strong>). Kliknij w link, aby ustawić nowe hasło.
                  </p>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Wróć do logowania
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Adres email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jan@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-accent hover:underline">
                <ArrowLeft className="inline mr-1 h-3 w-3" />
                Wróć do logowania
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
