import { useState, useEffect } from "react";
import { Gift, Plus, Trash2, Loader2, Settings, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
}

const AdminRewards = () => {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointValue, setPointValue] = useState(0.01);
  const [addOpen, setAddOpen] = useState(false);
  const [newReward, setNewReward] = useState({ name: "", description: "", points_cost: 100, stock: "", image_url: "" });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: rewardsData }, { data: settingsData }] = await Promise.all([
      supabase.from("rewards").select("*").order("created_at", { ascending: false }),
      supabase.from("reward_settings").select("point_value_pln").eq("id", "default").maybeSingle(),
    ]);
    setRewards((rewardsData as Reward[]) || []);
    if (settingsData) setPointValue(settingsData.point_value_pln);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const savePointValue = async () => {
    await supabase.from("reward_settings").update({ point_value_pln: pointValue }).eq("id", "default");
    toast({ title: "Zapisano wartość punktu" });
  };

  const addReward = async () => {
    const name = newReward.name.trim();
    const description = newReward.description.trim();
    const imageUrl = newReward.image_url.trim();
    const stock = newReward.stock ? parseInt(newReward.stock) : null;

    if (!name || name.length > 200) {
      toast({ title: "Błąd", description: "Nazwa nagrody musi mieć 1-200 znaków.", variant: "destructive" });
      return;
    }
    if (description && description.length > 1000) {
      toast({ title: "Błąd", description: "Opis może mieć max 1000 znaków.", variant: "destructive" });
      return;
    }
    if (newReward.points_cost <= 0 || newReward.points_cost > 10000000) {
      toast({ title: "Błąd", description: "Koszt punktowy musi być między 1 a 10 000 000.", variant: "destructive" });
      return;
    }
    if (stock !== null && (stock < 0 || stock > 1000000)) {
      toast({ title: "Błąd", description: "Stan magazynowy musi być między 0 a 1 000 000.", variant: "destructive" });
      return;
    }
    if (imageUrl && (imageUrl.length > 2000 || !/^https?:\/\/.+/.test(imageUrl))) {
      toast({ title: "Błąd", description: "Podaj poprawny URL obrazka (max 2000 znaków).", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("rewards").insert({
      name,
      description: description || null,
      points_cost: newReward.points_cost,
      stock,
      image_url: imageUrl || null,
    });
    if (error) {
      toast({ title: "Błąd", description: "Nie udało się dodać nagrody.", variant: "destructive" });
      return;
    }
    setNewReward({ name: "", description: "", points_cost: 100, stock: "", image_url: "" });
    setAddOpen(false);
    toast({ title: "Dodano nagrodę" });
    fetchAll();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("rewards").update({ is_active: !current }).eq("id", id);
    fetchAll();
  };

  const deleteReward = async (id: string) => {
    await supabase.from("rewards").delete().eq("id", id);
    toast({ title: "Usunięto nagrodę" });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Point value settings */}
      <div className="rounded-xl border bg-card p-5 shadow-product">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4" /> Ustawienia punktów
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">1 punkt =</span>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={pointValue}
            onChange={e => setPointValue(parseFloat(e.target.value) || 0)}
            className="w-28"
          />
          <span className="text-sm text-muted-foreground">PLN</span>
          <Button size="sm" onClick={savePointValue}>Zapisz</Button>
        </div>
      </div>

      {/* Rewards list */}
      <div className="rounded-xl border bg-card shadow-product">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Gift className="h-5 w-5" /> Katalog Nagród ({rewards.length})
          </h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-1 h-4 w-4" /> Dodaj
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nowa nagroda</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Nazwa nagrody" value={newReward.name} onChange={e => setNewReward(p => ({ ...p, name: e.target.value }))} />
                <Input placeholder="Opis (opcjonalnie)" value={newReward.description} onChange={e => setNewReward(p => ({ ...p, description: e.target.value }))} />
                <div className="flex gap-3">
                  <Input type="number" placeholder="Koszt (pkt)" value={newReward.points_cost} onChange={e => setNewReward(p => ({ ...p, points_cost: parseInt(e.target.value) || 0 }))} />
                  <Input type="number" placeholder="Stan (puste = ∞)" value={newReward.stock} onChange={e => setNewReward(p => ({ ...p, stock: e.target.value }))} />
                </div>
                <Input placeholder="URL obrazka (opcjonalnie)" value={newReward.image_url} onChange={e => setNewReward(p => ({ ...p, image_url: e.target.value }))} />
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={addReward}>Dodaj nagrodę</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {rewards.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Brak nagród w katalogu.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Nagroda</th>
                  <th className="px-4 py-3">Koszt</th>
                  <th className="px-4 py-3">Stan</th>
                  <th className="px-4 py-3">Aktywna</th>
                  <th className="px-4 py-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map(r => (
                  <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />{r.points_cost} pkt</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.stock ?? "∞"}</td>
                    <td className="px-4 py-3">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReward(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRewards;
