import { useState, useEffect } from "react";
import { Loader2, History, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const TYPE_LABELS: Record<string, string> = {
  click: "Kliknięcie",
  purchase: "Zakup",
  partner_task: "Zadanie partnera",
  earned: "Mailing",
  redeemed: "Wymiana nagrody",
  adjusted: "Korekta admina",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "Wszystkie" },
  { value: "partner_task", label: "Zadania partnerów" },
  { value: "click", label: "Kliknięcia" },
  { value: "purchase", label: "Zakupy" },
  { value: "earned", label: "Mailing" },
  { value: "redeemed", label: "Wymiana nagród" },
  { value: "adjusted", label: "Korekty admina" },
  // Financial sub-filters based on description
  { value: "fin:konta", label: "🏦 Konta bankowe" },
  { value: "fin:kredyty", label: "💳 Kredyty" },
  { value: "fin:lokaty", label: "🐷 Lokaty" },
];

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("points_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!error && data) {
        // Enrich with user emails from profiles
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, name, username")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, { email: p.email, name: p.name || p.username }])
        );

        setTransactions(
          data.map(t => ({
            ...t,
            user_email: profileMap.get(t.user_id)?.email || "—",
            user_name: profileMap.get(t.user_id)?.name || "—",
          }))
        );
      }
      setLoading(false);
    };
    fetchTransactions();
  }, []);

  const filtered = transactions.filter(t => {
    // Type/category filter
    if (typeFilter !== "all") {
      if (typeFilter.startsWith("fin:")) {
        const keyword = typeFilter.replace("fin:", "");
        const desc = (t.description || "").toLowerCase();
        if (keyword === "konta" && !desc.includes("kont")) return false;
        if (keyword === "kredyty" && !desc.includes("kredyt")) return false;
        if (keyword === "lokaty" && !desc.includes("lokat")) return false;
      } else {
        if (t.type !== typeFilter) return false;
      }
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        (t.user_email || "").toLowerCase().includes(q) ||
        (t.user_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPoints = filtered.reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-product">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b p-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia transakcji ({filtered.length})
          <Badge variant="outline" className={totalPoints >= 0 ? "border-success text-success" : "border-destructive text-destructive"}>
            {totalPoints > 0 ? "+" : ""}{totalPoints} pkt
          </Badge>
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Szukaj użytkownika..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 h-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Użytkownik</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Opis</th>
              <th className="px-4 py-3 text-right">Punkty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map(t => (
              <tr key={t.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(t.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.user_name}</p>
                    <p className="text-xs text-muted-foreground">{t.user_email}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[t.type] || t.type}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground max-w-xs truncate">
                  {t.description || "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-sm font-bold ${t.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Brak transakcji pasujących do filtrów
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTransactions;
