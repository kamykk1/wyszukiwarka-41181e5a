import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";

// Typed wrapper — beta supabase.auth.oauth namespace
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (): OAuthApi => (supabase.auth as any).oauth;

function safeSameOriginPath(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Brak parametru authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message ?? "Nie udało się pobrać danych żądania.");
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauth();
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message ?? "Operacja nie powiodła się.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Serwer autoryzacji nie zwrócił adresu przekierowania.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-card p-8 shadow-product text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-xl font-semibold">Nie można wyświetlić żądania</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline" className="mt-6">
            <a href={safeSameOriginPath("/")}>Wróć do strony głównej</a>
          </Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "Aplikacja zewnętrzna";
  const redirectUri = details.client?.redirect_uris?.[0] ?? details.redirect_uri ?? "";
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
    ? details.scope.split(/\s+/).filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-product">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-3 text-xl font-bold text-foreground">
            Połącz <span className="text-accent">{clientName}</span> z netszukacz.pl
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pozwolisz aplikacji {clientName} działać w Twoim imieniu w narzędziach netszukacz.pl.
          </p>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          {redirectUri && (
            <div className="flex flex-col gap-1 rounded-lg border p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Adres powrotu</dt>
              <dd className="font-mono break-all">{redirectUri}</dd>
            </div>
          )}
          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Uprawnienia tożsamości</dt>
            <dd>
              {scopes.length === 0
                ? "Podstawowe informacje o zalogowanym koncie."
                : scopes.map((s) => (
                    <span key={s} className="mr-1 inline-block rounded bg-muted px-2 py-0.5 text-xs">
                      {s}
                    </span>
                  ))}
            </dd>
          </div>
          <p className="text-xs text-muted-foreground">
            To pozwolenie nie wyłącza reguł dostępu — Twoje dane w netszukacz.pl są nadal chronione politykami bazy.
          </p>
        </dl>

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? "..." : "Zatwierdź"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Odmów
          </Button>
        </div>
      </div>
    </main>
  );
}
