import { useState, useEffect } from "react";
import { Mail, Save, Loader2, Code, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject_template: string;
  html_template: string;
  variables: string[];
  updated_at: string;
}

const AdminEmailTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("name");
    setTemplates((data as EmailTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const selected = templates.find(t => t.id === selectedId);

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedId(t.id);
    setSubject(t.subject_template);
    setHtml(t.html_template);
    setPreviewMode("edit");
  };

  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      selectTemplate(templates[0]);
    }
  }, [templates]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ subject_template: subject, html_template: html })
      .eq("id", selectedId);
    setSaving(false);
    if (error) {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Zapisano! ✅", description: "Szablon został zaktualizowany." });
      fetchTemplates();
    }
  };

  const handleReset = () => {
    if (selected) {
      setSubject(selected.subject_template);
      setHtml(selected.html_template);
    }
  };

  const getPreviewHtml = () => {
    let preview = html;
    // Replace variables with example values
    const examples: Record<string, string> = {
      points: "50",
      category: "Konto osobiste",
      partner_name: "Bankier.pl",
      amount_info: '<p>Kwota transakcji: <strong>5 000 zł</strong></p>',
      threshold: "500",
      name_greeting: ", Jan",
      total_earned: "520",
      reward_name: "Karta podarunkowa 50 zł",
      points_cost: "500",
      reward_description: "<p>Karta podarunkowa do wykorzystania w sklepach partnerskich.</p>",
      subject: "Testowy temat",
      name: "Jan",
      message: "To jest przykładowa treść wiadomości.",
      click_button: '<p><a href="#" style="display:inline-block;padding:10px 20px;background:#ff6b35;color:white;text-decoration:none;border-radius:6px;">Odbierz 10 punktów →</a></p>',
    };
    for (const [key, val] of Object.entries(examples)) {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    }
    return preview;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-product">
        <h2 className="mb-1 text-lg font-bold text-foreground flex items-center gap-2">
          <Mail className="h-5 w-5" /> Szablony E-mail
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Edytuj treść automatycznych powiadomień e-mail. Użyj zmiennych w podwójnych nawiasach klamrowych.
        </p>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Template list */}
          <div className="w-full lg:w-56 flex-shrink-0 space-y-1">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedId === t.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs opacity-70 line-clamp-1">{t.description}</span>
              </button>
            ))}
          </div>

          {/* Editor */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div>
                <Label className="mb-1.5 block">Dostępne zmienne</Label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.variables.map(v => (
                    <Badge key={v} variant="outline" className="font-mono text-xs cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v}}}`);
                        toast({ title: `Skopiowano {{${v}}}` });
                      }}
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="tpl-subject">Temat e-mail</Label>
                <Input
                  id="tpl-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="mt-1.5 font-mono text-sm"
                />
              </div>

              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Code className="h-4 w-4" /> Treść HTML
                </Label>
                <Tabs value={previewMode} onValueChange={v => setPreviewMode(v as "edit" | "preview")}>
                  <TabsList className="mb-2">
                    <TabsTrigger value="edit"><Code className="mr-1 h-3 w-3" /> Edytor</TabsTrigger>
                    <TabsTrigger value="preview"><Eye className="mr-1 h-3 w-3" /> Podgląd</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      value={html}
                      onChange={e => setHtml(e.target.value)}
                      className="min-h-[300px] font-mono text-xs"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="rounded-lg border bg-background p-4 min-h-[300px]">
                      <p className="mb-2 text-xs text-muted-foreground">
                        <strong>Temat:</strong> {subject.replace(/\{\{(\w+)\}\}/g, (_, k) => {
                          const ex: Record<string, string> = { points: "50", threshold: "500", reward_name: "Karta 50 zł", subject: "Testowy temat" };
                          return ex[k] || `[${k}]`;
                        })}
                      </p>
                      <iframe
                        sandbox=""
                        srcDoc={getPreviewHtml()}
                        className="w-full min-h-[260px] border-0"
                        title="Podgląd szablonu"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex items-center gap-3 border-t pt-4">
                <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving ? "Zapisywanie..." : "Zapisz szablon"}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Cofnij zmiany
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmailTemplates;
