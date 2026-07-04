// Lekki helper do dynamicznej aktualizacji metadanych SEO w SPA.
// Ustawia <title>, meta description i og:title/og:description dla bieżącej trasy.
export interface SeoOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
}

const setMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export function applySeo({ title, description, canonicalPath }: SeoOptions) {
  document.title = title;
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  if (description) {
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  }
  if (canonicalPath) {
    const href = `${window.location.origin}${canonicalPath}`;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;
    setMeta('meta[property="og:url"]', "property", "og:url", href);
  }
}
