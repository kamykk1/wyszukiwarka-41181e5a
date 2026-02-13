import { useState, useEffect } from "react";
import { Send, Users, FileText, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  points_reward: number;
  sent_at: string | null;
  created_at: string;
}

const AdminMailing = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [pointsReward, setPointsReward] = useState(0);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data } = await supabase
      .from("mailing_campaigns")
      .select("id, subject, audience, points_reward, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setCampaigns((data as Campaign[]) || []);
    setLoadingCampaigns(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    // Save campaign
    const { data: campaign, error: insertError } = await supabase
      .from("mailing_campaigns")
      .insert({
        subject: subject.trim(),
        message: message.trim(),
        audience,
        points_reward: pointsReward,
        sent_by: session.user.id,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !campaign) {
      toast({ title: "Błąd", description: "Nie udało się utworzyć kampanii.", variant: "destructive" });
      setSending(false);
      return;
    }

    // Invoke send-mailing edge function
    const res = await supabase.functions.invoke("send-mailing", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { campaign_id: campaign.id, subject: subject.trim(), message: message.trim(), audience, points_reward: pointsReward },
    });

    setSending(false);
    if (res.error) {
      toast({ title: "Błąd wysyłki", description: res.error.message, variant: "destructive" });
    } else {
      toast({ title: "Mailing wysłany! ✉️", description: `Wysłano do grupy: ${audience}` });
      setSubject("");
      setMessage("");
      setPointsReward(0);
      fetchCampaigns();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-product">
        <h2 className="mb-1 text-lg font-bold text-foreground">Wyślij Mailing</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Wyślij wiadomość email do wybranej grupy użytkowników. Ustaw punkty za kliknięcie w link.
        </p>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <Label>Odbiorcy</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="mt-1.5">
                <Users className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                <SelectItem value="active">Tylko aktywni</SelectItem>
                <SelectItem value="new">Nowi (ostatnie 30 dni)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Temat</Label>
            <Input id="subject" placeholder="Temat wiadomości..." value={subject} onChange={e => setSubject(e.target.value)} className="mt-1.5" required />
          </div>

          <div>
            <Label htmlFor="message">Treść</Label>
            <Textarea id="message" placeholder="Napisz treść wiadomości..." value={message} onChange={e => setMessage(e.target.value)} className="mt-1.5 min-h-[200px]" required />
          </div>

          <div>
            <Label htmlFor="pointsReward" className="flex items-center gap-1.5">
              <Coins className="h-4 w-4" /> Punkty za kliknięcie w link
            </Label>
            <Input id="pointsReward" type="number" min={0} max={1000} value={pointsReward} onChange={e => setPointsReward(parseInt(e.target.value) || 0)} className="mt-1.5 max-w-[200px]" />
            <p className="text-xs text-muted-foreground mt-1">Użytkownicy otrzymają tyle punktów po kliknięciu w link w mailu (0 = brak punktów)</p>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <FileText className="mr-1 inline h-3 w-3" />
              Wiadomość zostanie wysłana do wybranych odbiorców
            </p>
            <Button type="submit" disabled={sending} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? "Wysyłanie..." : "Wyślij mailing"}
            </Button>
          </div>
        </form>
      </div>

      {/* Campaign history */}
      <div className="rounded-xl border bg-card shadow-product">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold text-foreground">Historia kampanii</h2>
        </div>
        {loadingCampaigns ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Brak kampanii.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Temat</th>
                  <th className="px-4 py-3">Odbiorcy</th>
                  <th className="px-4 py-3">Punkty</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.subject}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{c.audience}</Badge></td>
                    <td className="px-4 py-3 text-sm text-foreground">{c.points_reward > 0 ? `${c.points_reward} pkt` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
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

export default AdminMailing;
