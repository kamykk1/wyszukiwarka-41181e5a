import { useState, useEffect } from "react";
import { Search, MoreHorizontal, Ban, CheckCircle, Shield, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
