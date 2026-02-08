import { useState } from "react";
import { Search, MoreHorizontal, Ban, CheckCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockUsers = [
  { id: "1", name: "Jan Kowalski", email: "jan@example.com", role: "user", status: "active", joined: "2025-12-01" },
  { id: "2", name: "Anna Nowak", email: "anna@example.com", role: "admin", status: "active", joined: "2025-11-15" },
  { id: "3", name: "Piotr Wiśniewski", email: "piotr@example.com", role: "user", status: "blocked", joined: "2026-01-10" },
  { id: "4", name: "Maria Zielińska", email: "maria@example.com", role: "user", status: "active", joined: "2026-01-22" },
  { id: "5", name: "Tomasz Lewandowski", email: "tomasz@example.com", role: "user", status: "active", joined: "2026-02-01" },
];

const AdminUsers = () => {
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border bg-card shadow-product">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-bold text-foreground">Użytkownicy ({mockUsers.length})</h2>
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
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className={user.role === "admin" ? "bg-accent text-accent-foreground" : ""}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.status === "active" ? "outline" : "destructive"} className={user.status === "active" ? "border-success text-success" : ""}>
                    {user.status === "active" ? "Aktywny" : "Zablokowany"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{user.joined}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Aktywuj</DropdownMenuItem>
                      <DropdownMenuItem><Ban className="mr-2 h-4 w-4" /> Zablokuj</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Usuń</DropdownMenuItem>
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
