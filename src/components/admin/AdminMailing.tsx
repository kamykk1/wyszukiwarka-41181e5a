import { useState, useEffect } from "react";
import { Send, Users, FileText, Loader2, Coins, Code, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  points_reward: number;
  sent_at: string | null;
  created_at: string;
  clicks_count?: number;
  total_points_awarded?: number;
}

const DEFAULT_TEMPLATE = `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
  <div style="background:#ff6b35;padding:20px;text-align:center;">
    <h1 style="color:white;margin:0;">SmartPrice</h1>
  </div>
  <div style="padding:24px;background:#fff;">
    <h2 style="color:#1a1a2e;">{{subject}}</h2>
    <p>Cześć {{name}}!</p>
    <div>{{message}}</div>
    {{click_button}}
  </div>
  <div style="padding:16px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
    SmartPrice — porównywarka cen
  </div>
</div>`;

const AdminMailing = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [pointsReward, setPointsReward] = useState(0);
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const { data } = await supabase
      .from("mailing_campaigns")
      .select("id, subject, audience, points_reward, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const campaignList = (data || []) as Campaign[];

    // Fetch click stats for each campaign
    if (campaignList.length > 0) {
      const ids = campaignList.map(c => c.id);
      const { data: clicks } = await supabase
        .from("mailing_clicks")
        .select("campaign_id, points_awarded")
        .in("campaign_id", ids);

      const statsMap = new Map<string, { count: number; points: number }>();
      (clicks || []).forEach(c => {
        const existing = statsMap.get(c.campaign_id) || { count: 0, points: 0 };
        existing.count++;
        existing.points += c.points_awarded;
        statsMap.set(c.campaign_id, existing);
      });

      campaignList.forEach(c => {
        const stats = statsMap.get(c.id);
        c.clicks_count = stats?.count || 0;
        c.total_points_awarded = stats?.points || 0;
      });
    }

    setCampaigns(campaignList);
    setLoadingCampaigns(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const getPreviewHtml = () => {
    return htmlTemplate
      .replace(/\{\{subject\}\}/g, subject || "Temat wiadomości")
      .replace(/\{\{name\}\}/g, "Jan")
      .replace(/\{\{message\}\}/g, (message || "Treść wiadomości...").replace(/\n/g, "<br/>"))
      .replace(/\{\{click_button\}\}/g, pointsReward > 0
        ? `<p><a href="#" style="display:inline-block;padding:10px 20px;background:#ff6b35;color:white;text-decoration:none;border-radius:6px;">Odbierz ${pointsReward} punktów →</a></p>`
        : "");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

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

    const res = await supabase.functions.invoke("send-mailing", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        campaign_id: campaign.id,
        subject: subject.trim(),
        message: message.trim(),
        audience,
        points_reward: pointsReward,
        html_template: htmlTemplate,
      },
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
          Wyślij wiadomość HTML do wybranej grupy użytkowników. Użyj zmiennych: {"{{subject}}"}, {"{{name}}"}, {"{{message}}"}, {"{{click_button}}"}.
        </p>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="pointsReward" className="flex items-center gap-1.5">
                <Coins className="h-4 w-4" /> Punkty za kliknięcie
              </Label>
              <Input id="pointsReward" type="number" min={0} max={1000} value={pointsReward} onChange={e => setPointsReward(parseInt(e.target.value) || 0)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Temat</Label>
            <Input id="subject" placeholder="Temat wiadomości..." value={subject} onChange={e => setSubject(e.target.value)} className="mt-1.5" required />
          </div>

          <div>
            <Label htmlFor="message">Treść (tekst)</Label>
            <Textarea id="message" placeholder="Napisz treść wiadomości..." value={message} onChange={e => setMessage(e.target.value)} className="mt-1.5 min-h-[100px]" required />
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <Code className="h-4 w-4" /> Szablon HTML
            </Label>
            <Tabs value={previewMode} onValueChange={v => setPreviewMode(v as "edit" | "preview")}>
              <TabsList className="mb-2">
                <TabsTrigger value="edit"><Code className="mr-1 h-3 w-3" /> Edytor</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="mr-1 h-3 w-3" /> Podgląd</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea
                  value={htmlTemplate}
                  onChange={e => setHtmlTemplate(e.target.value)}
                  className="min-h-[250px] font-mono text-xs"
                  placeholder="HTML template..."
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="rounded-lg border bg-background p-4 min-h-[250px]">
                  <iframe
                    sandbox=""
                    srcDoc={getPreviewHtml()}
                    className="w-full min-h-[250px] border-0"
                    title="Podgląd mailingu"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <FileText className="mr-1 inline h-3 w-3" />
              Wiadomość zostanie wysłana w formacie HTML
            </p>
            <Button type="submit" disabled={sending} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? "Wysyłanie..." : "Wyślij mailing"}
            </Button>
          </div>
        </form>
      </div>

      {/* Campaign history with stats */}
      <div className="rounded-xl border bg-card shadow-product">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Historia kampanii
          </h2>
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
                  <th className="px-4 py-3">Punkty/klik</th>
                  <th className="px-4 py-3">Kliknięcia</th>
                  <th className="px-4 py-3">Przyznane pkt</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.subject}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{c.audience}</Badge></td>
                    <td className="px-4 py-3 text-sm text-foreground">{c.points_reward > 0 ? `${c.points_reward} pkt` : "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{c.clicks_count || 0}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-accent">{c.total_points_awarded || 0} pkt</td>
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
