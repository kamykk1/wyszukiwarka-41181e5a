import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Share, MoreVertical, Plus, ArrowRight, CheckCircle2, Chrome } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">
            Zainstaluj NetSzukacz
          </h1>
          <p className="text-muted-foreground text-lg">
            Dodaj aplikację na ekran główny i korzystaj jak z natywnej apki — offline, szybko i wygodnie.
          </p>
        </div>

        {/* Already installed */}
        {isInstalled && (
          <div className="rounded-xl border-2 border-green-500/30 bg-green-50 dark:bg-green-950/20 p-6 text-center mb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              Aplikacja jest już zainstalowana! 🎉
            </p>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              Znajdziesz ją na ekranie głównym telefonu lub w menu aplikacji.
            </p>
          </div>
        )}

        {/* Install button (Chrome/Edge on Android/Desktop) */}
        {deferredPrompt && !isInstalled && (
          <div className="mb-8">
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full text-lg py-6 bg-primary hover:bg-primary/90"
            >
              <Download className="mr-2 h-5 w-5" />
              Zainstaluj aplikację
            </Button>
          </div>
        )}

        {/* Benefits */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {[
            { icon: "⚡", title: "Błyskawiczna", desc: "Ładuje się natychmiast, nawet offline" },
            { icon: "🔔", title: "Powiadomienia", desc: "Alerty cenowe prosto na telefon" },
            { icon: "🎁", title: "Punkty", desc: "Zbieraj punkty i wymieniaj na nagrody" },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-4 text-center shadow-product">
              <div className="text-3xl mb-2">{b.icon}</div>
              <p className="font-bold text-foreground text-sm">{b.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* iOS Instructions */}
        {isIOS && !isInstalled && (
          <div className="rounded-xl border bg-card p-6 shadow-product mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Instalacja na iPhone / iPad</h2>
            </div>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-foreground">Kliknij ikonę Udostępnij</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Na dole ekranu w Safari <Share className="h-4 w-4 inline" />
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-foreground">Wybierz „Dodaj do ekranu głównego"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Przewiń w dół i kliknij <Plus className="h-4 w-4 inline" /> Dodaj do ekranu głównego
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                <div>
                  <p className="font-semibold text-foreground">Potwierdź „Dodaj"</p>
                  <p className="text-sm text-muted-foreground">Ikona NetSzukacz pojawi się na ekranie głównym</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Android Instructions */}
        {isAndroid && !deferredPrompt && !isInstalled && (
          <div className="rounded-xl border bg-card p-6 shadow-product mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Instalacja na Android</h2>
            </div>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-foreground">Otwórz menu przeglądarki</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    Kliknij <MoreVertical className="h-4 w-4 inline" /> w prawym górnym rogu Chrome
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-foreground">Wybierz „Zainstaluj aplikację"</p>
                  <p className="text-sm text-muted-foreground">Lub „Dodaj do ekranu głównego"</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                <div>
                  <p className="font-semibold text-foreground">Potwierdź instalację</p>
                  <p className="text-sm text-muted-foreground">Aplikacja pojawi się w szufladzie aplikacji</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && !isInstalled && (
          <div className="rounded-xl border bg-card p-6 shadow-product mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Instalacja na komputerze</h2>
            </div>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-foreground">Kliknij ikonę instalacji</p>
                  <p className="text-sm text-muted-foreground">
                    W pasku adresu Chrome/Edge pojawi się ikona <Download className="h-4 w-4 inline" />
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-foreground">Potwierdź „Zainstaluj"</p>
                  <p className="text-sm text-muted-foreground">Aplikacja otworzy się jako osobne okno</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Chrome Extension promo */}
        <div className="rounded-xl border bg-card p-6 shadow-product">
          <div className="flex items-center gap-3 mb-3">
            <Chrome className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Wtyczka Chrome</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Zainstaluj naszą wtyczkę do Chrome, żeby automatycznie porównywać ceny na stronach sklepów i dostawać powiadomienia o tańszych ofertach.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <a href="https://netszukacz.pl" target="_blank" rel="noopener noreferrer">
              Pobierz wtyczkę <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
