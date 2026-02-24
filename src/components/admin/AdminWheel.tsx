import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

interface WheelPrize {
  id: string;
  name: string;
  description: string | null;
  points_reward: number;
  probability_weight: number;
  color: string;
  icon: string;
  is_active: boolean;
}

const AdminWheel = () => {
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<WheelPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPrizes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wheel_prizes")
      .select("*")
      .order("probability_weight", { ascending: false });
    setPrizes((data as WheelPrize[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPrizes(); }, []);

  const updatePrize = async (prize: WheelPrize) => {
    setSaving(prize.id);
    const { error } = await supabase
      .from("wheel_prizes")
      .update({
        name: prize.name,
        points_reward: prize.points_reward,
        probability_weight: prize.probability_weight,
        color: prize.color,
        icon: prize.icon,
        is_active: prize.is_active,
      })
      .eq("id", prize.id);
    setSaving(null);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zapisano" });
    }
  };

  const addPrize = async () => {
    const { error } = await supabase
      .from("wheel_prizes")
      .insert({ name: "Nowa nagroda", points_reward: 5, probability_weight: 10, color: "#3b82f6", icon: "🎁" });
    if (!error) fetchPrizes();
  };

  const deletePrize = async (id: string) => {
    await supabase.from("wheel_prizes").delete().eq("id", id);
    fetchPrizes();
  };

  const setPrizeField = (id: string, field: string, value: any) => {
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const totalWeight = prizes.filter((p) => p.is_active).reduce((s, p) => s + p.probability_weight, 0);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">🎡 Koło Fortuny</h2>
          <p className="text-sm text-muted-foreground">Zarządzaj nagrodami i prawdopodobieństwami</p>
        </div>
        <Button onClick={addPrize} size="sm"><Plus className="h-4 w-4 mr-1" /> Dodaj nagrodę</Button>
      </div>

      <div className="space-y-3">
        {prizes.map((prize) => {
          const pct = totalWeight > 0 ? ((prize.probability_weight / totalWeight) * 100).toFixed(1) : "0";
          return (
            <div key={prize.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{prize.icon}</span>
                  <span className="font-semibold">{prize.name}</span>
                  <Badge variant={prize.is_active ? "default" : "secondary"}>
                    {prize.is_active ? "Aktywna" : "Wyłączona"}
                  </Badge>
                  {prize.is_active && (
                    <Badge variant="outline">{pct}% szans</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={prize.is_active} onCheckedChange={(v) => setPrizeField(prize.id, "is_active", v)} />
                  <Button variant="ghost" size="icon" onClick={() => deletePrize(prize.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">Nazwa</Label>
                  <Input value={prize.name} onChange={(e) => setPrizeField(prize.id, "name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Punkty</Label>
                  <Input type="number" value={prize.points_reward} onChange={(e) => setPrizeField(prize.id, "points_reward", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Waga</Label>
                  <Input type="number" value={prize.probability_weight} onChange={(e) => setPrizeField(prize.id, "probability_weight", parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label className="text-xs">Ikona</Label>
                  <Input value={prize.icon} onChange={(e) => setPrizeField(prize.id, "icon", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Kolor</Label>
                  <div className="flex gap-1">
                    <input type="color" value={prize.color} onChange={(e) => setPrizeField(prize.id, "color", e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
                    <Button size="sm" onClick={() => updatePrize(prize)} disabled={saving === prize.id} className="flex-1">
                      {saving === prize.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWheel;
