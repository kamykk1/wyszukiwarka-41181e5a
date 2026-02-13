import { useState, useEffect } from "react";
import { Loader2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PageSetting {
  id: string;
  subtitle: string;
}

const pageLabels: Record<string, string> = {
  konta: "Konta Bankowe",
  kredyty: "Kredyty",
  lokaty: "Lokaty",
};

const AdminPageSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("page_settings").select("*").order("id");
      setSettings((data as PageSetting[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateSubtitle = (id: string, subtitle: string) => {
    setSettings(prev => prev.map(s => (s.id === id ? { ...s, subtitle } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      await supabase.from("page_settings").update({ subtitle: s.subtitle }).eq("id", s.id);
    }
    toast({ title: "Zapisano ✓", description: "Opisy stron zostały zaktualizowane." });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-product">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" /> Opisy stron finansowych
      </h2>
      <div className="space-y-4">
        {settings.map(s => (
          <div key={s.id} className="space-y-1.5">
            <Label className="text-sm font-medium">{pageLabels[s.id] || s.id} — podtytuł</Label>
            <Input
              value={s.subtitle}
              onChange={e => updateSubtitle(s.id, e.target.value)}
              placeholder="Opis wyświetlany pod nagłówkiem strony"
            />
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Zapisz opisy
        </Button>
      </div>
    </div>
  );
};

export default AdminPageSettings;
