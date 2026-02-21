import { TrendingDown, Store, Zap, Shield, Landmark, CreditCard, PiggyBank, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import EditableBanner from "@/components/EditableBanner";
import { stores } from "@/data/mockProducts";

const features = [
  { icon: TrendingDown, title: "Najniższe ceny", desc: "Porównujemy ceny z wielu sklepów" },
  { icon: Store, title: "Wiele sklepów", desc: "Allegro, Amazon, AliExpress, Temu i więcej" },
  { icon: Zap, title: "Błyskawicznie", desc: "Wyniki w ułamku sekundy" },
  { icon: Shield, title: "Bezpiecznie", desc: "Zweryfikowane sklepy partnerskie" },
];

const financeCards = [
  { icon: Landmark, title: "Konta Bankowe", desc: "Porównaj konta osobiste, firmowe i oszczędnościowe", path: "/konta", color: "text-blue-500" },
  { icon: CreditCard, title: "Kredyty", desc: "Kredyty gotówkowe, konsolidacyjne i hipoteczne", path: "/kredyty", color: "text-green-500" },
  { icon: PiggyBank, title: "Lokaty", desc: "Najwyższe oprocentowanie lokat", path: "/lokaty", color: "text-amber-500" },
  { icon: Percent, title: "Cashback", desc: "Zarabiaj procenty od zakupów w sklepach partnerskich", path: "/cashback", color: "text-accent" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <EditableBanner pageId="home" />

      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-accent/50 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-24 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <Zap className="h-3.5 w-3.5" />
            Porównuj ceny z {stores.filter(s => s.enabled).length}+ sklepów
          </div>

          <h1 className="mb-4 text-5xl font-black tracking-tight text-gradient md:text-6xl">
            Znajdź najlepszą cenę
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-lg text-primary-foreground/60">
            Przeszukuj oferty z Allegro, Amazon, AliExpress, Temu i innych. Porównuj konta, kredyty i lokaty w jednym miejscu.
          </p>

          <SearchBar large />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-primary-foreground/40">
            <span>Popularne:</span>
            {["Słuchawki Bluetooth", "Smartwatch", "Plecak", "Ładowarka USB-C"].map(term => (
              <a
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-primary-foreground/10 px-3 py-1 transition-colors hover:border-accent/40 hover:text-accent"
              >
                {term}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Finance section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">Porównaj finanse</h2>
        <p className="mb-8 text-center text-muted-foreground">Konta, kredyty i lokaty — wszystko w jednym miejscu</p>
        <div className="grid gap-6 sm:grid-cols-3">
          {financeCards.map(card => (
            <Link
              key={card.path}
              to={card.path}
              className="group rounded-xl border bg-card p-6 shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-1"
            >
              <card.icon className={`h-10 w-10 ${card.color} mb-3`} />
              <h3 className="mb-1 font-bold text-foreground group-hover:text-accent transition-colors">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 shadow-product transition-all duration-300 hover:shadow-product-hover animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mb-1 font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          © 2026 NetSzukacz.pl — Porównywarka cen i finansów. Wszystkie prawa zastrzeżone.
        </div>
      </footer>
    </div>
  );
};

export default Index;
