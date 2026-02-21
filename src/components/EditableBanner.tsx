import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

interface EditableBannerProps {
  pageId: string;
}

const EditableBanner = ({ pageId }: EditableBannerProps) => {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("page_settings")
        .select("header_html")
        .eq("id", pageId)
        .single();
      if (data?.header_html) {
        setHtml(data.header_html);
      }
    };
    fetch();
  }, [pageId]);

  if (!html || html === "<p><br></p>" || html.trim() === "") return null;

  return (
    <section className="border-b bg-card">
      <div
        className="container mx-auto px-4 py-6 text-center prose prose-sm max-w-none
          [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-foreground [&_h1]:mb-2
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mb-2
          [&_p]:text-muted-foreground [&_p]:mb-1
          [&_a]:text-accent [&_a]:underline
          [&_strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    </section>
  );
};

export default EditableBanner;
