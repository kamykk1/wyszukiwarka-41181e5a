import { useState, useEffect } from "react";
import { User, Mail, Bell, BellOff, Save, Loader2, Settings2, MapPin, AtSign } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pointsThreshold, setPointsThreshold] = useState(500);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("name, first_name, last_name, street, city, postal_code, phone, email_notifications, points_threshold, username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUsername((data as any).username || "");
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setStreet(data.street || "");
        setCity(data.city || "");
        setPostalCode(data.postal_code || "");
        setPhone(data.phone || "");
        setEmailNotifications(data.email_notifications ?? true);
        setPointsThreshold(data.points_threshold ?? 500);
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        street,
        city,
        postal_code: postalCode,
        phone: phone || null,
        email_notifications: emailNotifications,
        points_threshold: pointsThreshold,
        username: username || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Błąd", description: "Nie udało się zapisać ustawień.", variant: "destructive" });
    } else {
      toast({ title: "Zapisano ✓", description: "Ustawienia profilu zostały zaktualizowane." });
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Zaloguj się</p>
          <p className="mt-1 text-muted-foreground">Musisz być zalogowany, aby zobaczyć profil.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/login">Zaloguj się</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <User className="h-6 w-6" /> Mój Profil
        </h1>

        {/* Account settings */}
        <div className="rounded-xl border bg-card p-6 shadow-product mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Dane osobowe
          </h2>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Login / nazwa użytkownika</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="jankowalski" className="pl-10 max-w-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Imię</Label>
                <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jan" className="max-w-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Kowalski" className="max-w-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Numer telefonu</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 123 456 789" className="max-w-sm" />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Adres do wysyłki
              </p>
              <div className="space-y-3 max-w-sm">
                <Input placeholder="Ulica i numer" value={street} onChange={e => setStreet(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Kod pocztowy" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                  <Input placeholder="Miasto" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between max-w-sm">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    {emailNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    Powiadomienia email
                  </Label>
                  <p className="text-xs text-muted-foreground">Otrzymuj info o nowych nagrodach i progach punktowych</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              {emailNotifications && (
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="threshold" className="text-sm font-medium">Próg punktowy do powiadomienia</Label>
                  <Input id="threshold" type="number" min={10} max={100000} value={pointsThreshold} onChange={e => setPointsThreshold(Number(e.target.value))} className="max-w-[200px]" />
                  <p className="text-xs text-muted-foreground">Otrzymasz email gdy osiągniesz ten próg punktów</p>
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Zapisz zmiany
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
