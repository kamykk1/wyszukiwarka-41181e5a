import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Loader2, Save, FileText, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface PageSetting {
  id: string;
  header_html: string;
}

const pageLabels: Record<string, string> = {
  home: "Strona główna",
  konta: "Konta Bankowe",
  kredyty: "Kredyty",
  lokaty: "Lokaty",
  cashback: "Cashback",
  rewards: "Nagrody",
  leaderboard: "Ranking",
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

const AdminPageSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("page_settings").select("id, header_html").order("id");
      setSettings((data as PageSetting[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateHtml = (id: string, header_html: string) => {
    setSettings(prev => prev.map(s => (s.id === id ? { ...s, header_html } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      await supabase.from("page_settings").update({ header_html: s.header_html }).eq("id", s.id);
    }
    toast({ title: "Zapisano ✓", description: "Nagłówki stron zostały zaktualizowane." });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-product">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" /> Edycja treści stron (WYSIWYG)
      </h2>
      <div className="space-y-6">
        {settings.map(s => (
          <div key={s.id} className="space-y-2 rounded-lg border p-4">
            <Label className="text-sm font-semibold">{pageLabels[s.id] || s.id}</Label>
            <Tabs defaultValue="wysiwyg" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="wysiwyg" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Edytor</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs"><Code className="h-3.5 w-3.5" />HTML</TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Podgląd</TabsTrigger>
              </TabsList>
              <TabsContent value="wysiwyg">
                <div className="bg-background rounded-lg border">
                  <ReactQuill
                    theme="snow"
                    value={s.header_html}
                    onChange={(val) => updateHtml(s.id, val)}
                    modules={quillModules}
                    className="min-h-[160px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="code">
                <Textarea
                  value={s.header_html}
                  onChange={e => updateHtml(s.id, e.target.value)}
                  placeholder="<h1>Tytuł strony</h1><p>Opis...</p>"
                  className="min-h-[160px] font-mono text-xs"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="rounded-lg border bg-background p-6 text-center">
                  <HtmlPreview html={s.header_html} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Zapisz wszystkie strony
        </Button>
      </div>
    </div>
  );
};

const HtmlPreview = ({ html }: { html: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; text-align: center; }
      h1 { font-size: 2rem; font-weight: 900; margin: 0.25rem 0; }
      p { margin: 0.5rem 0 0; color: #888; }
    </style></head><body>${html}</body></html>`);
    doc.close();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      sandbox=""
      className="w-full min-h-[120px] border-0 rounded"
      title="Podgląd nagłówka"
    />
  );
};

export default AdminPageSettings;
