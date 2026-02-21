import { useState, useEffect, useMemo } from "react";
import { Loader2, TrendingUp, Users, Coins, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  amount: number;
  type: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  click: "Kliknięcia",
  purchase: "Zakupy",
  partner_task: "Zadania partnerów",
  earned: "Mailing",
  redeemed: "Wymiana nagród",
  adjusted: "Korekty",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

const chartConfig: ChartConfig = {
  points: { label: "Punkty", color: "hsl(var(--primary))" },
  users: { label: "Użytkownicy", color: "hsl(var(--accent))" },
};

const AdminDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - parseInt(period));

      const [txRes, profilesRes, pointsRes] = await Promise.all([
        supabase
          .from("points_transactions")
          .select("amount, type, created_at")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true })
          .limit(1000),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_points").select("balance, total_earned"),
      ]);

      setTransactions(txRes.data || []);
      setUserCount(profilesRes.count || 0);

      const pts = pointsRes.data || [];
      setTotalBalance(pts.reduce((s, p) => s + p.balance, 0));
      setTotalPoints(pts.reduce((s, p) => s + p.total_earned, 0));
      setLoading(false);
    };
    fetch();
  }, [period]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { earned: number; spent: number; count: number }>();
    transactions.forEach((t) => {
      const day = t.created_at.slice(0, 10);
      const entry = map.get(day) || { earned: 0, spent: 0, count: 0 };
      if (t.amount > 0) entry.earned += t.amount;
      else entry.spent += Math.abs(t.amount);
      entry.count++;
      map.set(day, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        day: day.slice(5),
        earned: v.earned,
        spent: v.spent,
        count: v.count,
      }));
  }, [transactions]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.amount > 0) {
        map.set(t.type, (map.get(t.type) || 0) + t.amount);
      }
    });
    return Array.from(map.entries()).map(([type, value]) => ({
      name: TYPE_LABELS[type] || type,
      value,
    }));
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const earnedInPeriod = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Dashboard
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90">Ostatnie 90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Użytkownicy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Punkty w obiegu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalBalance.toLocaleString("pl-PL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Łącznie przyznano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalPoints.toLocaleString("pl-PL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> W okresie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">+{earnedInPeriod.toLocaleString("pl-PL")}</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transakcji</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily points bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Punkty dziennie</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="earned" name="Przyznane" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Wydane" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Brak danych w wybranym okresie</p>
            )}
          </CardContent>
        </Card>

        {/* Type distribution pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Źródła punktów</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {typeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">Brak danych</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity line chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Aktywność (transakcje dziennie)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Transakcje"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Brak danych</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
