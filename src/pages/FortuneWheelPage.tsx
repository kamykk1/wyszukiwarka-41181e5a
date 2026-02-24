import Navbar from "@/components/Navbar";
import FortuneWheel from "@/components/FortuneWheel";

const FortuneWheelPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="container mx-auto px-4 py-12 animate-fade-in">
        <div className="mx-auto max-w-md">
          <FortuneWheel />
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

export default FortuneWheelPage;
