import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Mail, Lock, User, MapPin, AtSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePostalCode = (v: string) => !v || /^\d{2}-\d{3}$/.test(v);
const validatePhone = (v: string) => !v || /^(\+?\d[\d\s-]{6,})$/.test(v);

const Register = () => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const mark = (f: string) => setTouched(p => ({ ...p, [f]: true }));

  const emailErr = touched.email && email && !validateEmail(email) ? "Nieprawidłowy format email" : "";
  const postalErr = touched.postalCode && postalCode && !validatePostalCode(postalCode) ? "Format: XX-XXX" : "";
  const phoneErr = touched.phone && phone && !validatePhone(phone) ? "Nieprawidłowy numer telefonu" : "";
  const passwordErr = touched.password && password && password.length < 8 ? "Min. 8 znaków" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || (postalCode && !validatePostalCode(postalCode)) || (phone && !validatePhone(phone))) {
      toast.error("Popraw błędy w formularzu");
      return;
    }
    setLoading(true);
    setUsernameError("");

    // Validate username uniqueness
    if (username.trim()) {
      const { data: taken } = await supabase.rpc("is_username_taken", { _username: username.trim() });
      if (taken) {
        setUsernameError("Ta nazwa użytkownika jest już zajęta");
        setLoading(false);
        return;
      }
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName, {
      first_name: firstName,
      last_name: lastName,
      street,
      city,
      postal_code: postalCode,
      phone,
      username: username || undefined,
      referral_code: referralCode.trim() || undefined,
    });
    setLoading(false);
    if (error) {
      toast.error("Błąd rejestracji", { description: error.message });
    } else {
      toast.success("Konto utworzone! Sprawdź email, aby potwierdzić rejestrację.");
      navigate("/login");
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
                NS
              </div>
              <h1 className="text-2xl font-bold text-foreground">Stwórz konto</h1>
              <p className="mt-1 text-sm text-muted-foreground">Dołącz do NetSzukacz i oszczędzaj</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Login / nazwa użytkownika</Label>
                <div className="relative mt-1.5">
                  <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="username" placeholder="jankowalski" value={username} onChange={e => { setUsername(e.target.value); setUsernameError(""); }} className={`pl-10 ${usernameError ? "border-destructive" : ""}`} required />
                </div>
                {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">Imię</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="firstName" placeholder="Jan" value={firstName} onChange={e => setFirstName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastName">Nazwisko</Label>
                  <Input id="lastName" placeholder="Kowalski" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1.5" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="jan@example.com" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => mark("email")} className={`pl-10 ${emailErr ? "border-destructive" : ""}`} required />
                </div>
                {emailErr && <p className="text-xs text-destructive mt-1">{emailErr}</p>}
              </div>
              <div>
                <Label htmlFor="password">Hasło</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Min. 8 znaków" value={password} onChange={e => setPassword(e.target.value)} onBlur={() => mark("password")} className={`pl-10 ${passwordErr ? "border-destructive" : ""}`} minLength={8} required />
                </div>
                {passwordErr && <p className="text-xs text-destructive mt-1">{passwordErr}</p>}
                <PasswordStrengthIndicator password={password} />
              </div>

              <div>
                <Label htmlFor="phone">Numer telefonu (opcjonalnie)</Label>
                <div className="relative mt-1.5">
                  <Input id="phone" type="tel" placeholder="+48 123 456 789" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => mark("phone")} className={phoneErr ? "border-destructive" : ""} />
                </div>
                {phoneErr && <p className="text-xs text-destructive mt-1">{phoneErr}</p>}
              </div>

              <div>
                <Label htmlFor="referralCode">Kod polecający (opcjonalnie)</Label>
                <div className="relative mt-1.5">
                  <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="referralCode" placeholder="np. A1B2C3D4" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} className="pl-10 font-mono tracking-wider" maxLength={8} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Wpisz kod znajomego i oboje otrzymacie bonus punktowy!</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Adres do wysyłki (opcjonalnie)
                </p>
                <div className="space-y-3">
                  <Input placeholder="Ulica i numer" value={street} onChange={e => setStreet(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Kod pocztowy" value={postalCode} onChange={e => setPostalCode(e.target.value)} onBlur={() => mark("postalCode")} className={postalErr ? "border-destructive" : ""} />
                    <Input placeholder="Miasto" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  {postalErr && <p className="text-xs text-destructive mt-1">{postalErr}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Rejestracja..." : "Zarejestruj się"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Masz już konto?{" "}
              <Link to="/login" className="font-medium text-accent hover:underline">
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
