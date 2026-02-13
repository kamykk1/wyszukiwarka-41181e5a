import { useState, useEffect } from "react";
import { Search, MoreHorizontal, Shield, Loader2, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Points dialog
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDesc, setPointsDesc] = useState("");
  const [pointsLoading, setPointsLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await supabase.functions.invoke("admin-users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.error) {
      toast({ title: "Błąd", description: "Nie udało się pobrać użytkowników.", variant: "destructive" });
    } else {
      setUsers(res.data as AdminUser[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (userId: string, currentRoles: string[]) => {
    const isAdmin = currentRoles.includes("admin");
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as const });
    }
    toast({ title: isAdmin ? "Usunięto rolę admina" : "Nadano rolę admina" });
    fetchUsers();
  };

  const openPointsDialog = (user: AdminUser) => {
    setPointsUser(user);
    setPointsAmount(0);
    setPointsDesc("");
    setPointsOpen(true);
  };

  const handleAddPoints = async () => {
    if (!pointsUser || pointsAmount === 0) return;
    setPointsLoading(true);
    const { data, error } = await supabase.rpc("admin_add_points", {
      _user_id: pointsUser.id,
      _amount: pointsAmount,
      _description: pointsDesc || `Korekta przez admina`,
    });
    setPointsLoading(false);

    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Punkty zaktualizowane", description: `${pointsAmount > 0 ? "+" : ""}${pointsAmount} pkt dla ${pointsUser.name || pointsUser.email}` });
      setPointsOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-product">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold text-foreground">Użytkownicy ({users.length})</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Szukaj użytkowników..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Użytkownik</th>
                <th className="px-4 py-3">Rola</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dołączył</th>
                <th className="px-4 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map(role => (
                        <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className={role === "admin" ? "bg-accent text-accent-foreground" : ""}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.banned ? "destructive" : "outline"} className={!user.banned ? "border-success text-success" : ""}>
                      {user.banned ? "Zablokowany" : "Aktywny"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pl-PL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleRole(user.id, user.roles)}>
                          <Shield className="mr-2 h-4 w-4" />
                          {user.roles.includes("admin") ? "Usuń admina" : "Nadaj admina"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPointsDialog(user)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Dodaj/Odejmij punkty
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add points dialog */}
      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj/Odejmij punkty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Użytkownik: <strong>{pointsUser?.name || pointsUser?.email}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Liczba punktów (ujemna = odejmij)</Label>
              <Input type="number" value={pointsAmount} onChange={e => setPointsAmount(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Opis</Label>
              <Textarea placeholder="Powód korekty punktów..." value={pointsDesc} onChange={e => setPointsDesc(e.target.value)} />
            </div>
            <Button onClick={handleAddPoints} disabled={pointsLoading || pointsAmount === 0} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {pointsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : pointsAmount >= 0 ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
              {pointsAmount >= 0 ? "Dodaj" : "Odejmij"} punkty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsers;
