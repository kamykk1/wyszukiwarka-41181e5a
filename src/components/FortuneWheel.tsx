import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Clock, Sparkles, Trophy, Gift } from "lucide-react";
import { Link } from "react-router-dom";

interface Prize {
  id: string;
  name: string;
  points_reward: number;
  color: string;
  icon: string;
  probability_weight: number;
}

const WHEEL_SIZE = 420;

const useCountdown = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const midnight = useMemo(() => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }, [now]);
  const diff = Math.max(0, midnight - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const FortuneWheel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; points_reward: number; icon: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countdown = useCountdown();

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data } = await supabase
        .from("wheel_prizes")
        .select("id, name, points_reward, color, icon, probability_weight")
        .eq("is_active", true);
      setPrizes((data as Prize[]) || []);
      setLoading(false);
    };
    fetchPrizes();

    if (user) {
      (async () => {
        const today = new Date().toISOString().split("T")[0];
        const [{ data: spin }, { data: streakRow }] = await Promise.all([
          supabase.from("wheel_spins").select("id").eq("spin_date", today).eq("user_id", user.id),
          supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        ]);
        if (spin && spin.length > 0) setHasSpunToday(true);
        if (streakRow?.current_streak) setStreak(streakRow.current_streak);
      })();
    }
  }, [user]);

  useEffect(() => { drawWheel(); }, [prizes, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = WHEEL_SIZE;
    if (canvas.width !== cssSize * dpr) {
      canvas.width = cssSize * dpr;
      canvas.height = cssSize * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const center = cssSize / 2;
    const radius = center - 6;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);

    prizes.forEach((prize, i) => {
      const start = i * sliceAngle;
      const end = start + sliceAngle;

      // Slice fill: alternate subtle contrast, keep prize.color as accent stripe
      const grad = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius);
      const base = i % 2 === 0 ? "#1E293B" : "#0F172A";
      grad.addColorStop(0, base);
      grad.addColorStop(1, i % 2 === 0 ? "#111c31" : "#0a1220");
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Divider
      ctx.strokeStyle = "rgba(249,115,22,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Prize accent arc (thin colored ring per slice near rim)
      ctx.beginPath();
      ctx.arc(center, center, radius - 8, start + 0.02, end - 0.02);
      ctx.strokeStyle = prize.color || "#f97316";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f8fafc";
      const nameFont = Math.max(11, 15 - prizes.length * 0.35);
      ctx.font = `700 ${nameFont}px Inter, sans-serif`;
      ctx.fillText(prize.name.toUpperCase().slice(0, 12), radius - 22, 5);
      ctx.textAlign = "left";
      ctx.font = `${nameFont + 2}px sans-serif`;
      ctx.fillText(prize.icon, radius * 0.28, 6);
      ctx.restore();
    });

    // Outer rim
    ctx.beginPath();
    ctx.arc(center, center, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore();
  };

  const spin = async () => {
    if (!user || spinning || hasSpunToday) return;
    setSpinning(true);
    setWonPrize(null);

    const { data, error } = await supabase.rpc("spin_wheel");

    if (error || !data || (data as any).error) {
      const msg = (data as any)?.message || "Nie udało się zakręcić kołem.";
      toast({ title: "Błąd", description: msg, variant: "destructive" });
      setSpinning(false);
      if ((data as any)?.error === "already_spun") setHasSpunToday(true);
      return;
    }

    const prize = (data as any).prize;
    const prizeIndex = prizes.findIndex((p) => p.id === prize.id);
    const sliceDeg = 360 / prizes.length;
    // Pointer at top = -90° in canvas coords (0°=east, +cw). Land slice center at 270°.
    const targetAngle = 270 - (prizeIndex * sliceDeg + sliceDeg / 2);
    const spins = 6 + Math.random() * 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((targetAngle - currentMod) % 360 + 360) % 360;
    const finalRotation = rotation + spins * 360 + delta;

    const duration = 4500;
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentRotation = startRotation + (finalRotation - startRotation) * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setHasSpunToday(true);
        setWonPrize(prize);
        if (prize.points_reward > 0) {
          toast({ title: `${prize.icon} ${prize.name}!`, description: `Wygrałeś ${prize.points_reward} punktów!` });
        } else {
          toast({ title: `${prize.icon} Pudło`, description: "Spróbuj jutro!" });
        }
      }
    };
    requestAnimationFrame(animate);
  };

  if (loading || prizes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Wheel */}
      <div className="relative flex justify-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl -z-10" aria-hidden />

        <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
          {/* Outer bezel */}
          <div
            className="absolute inset-0 rounded-full border-[12px] border-card shadow-[0_0_60px_-15px_hsl(var(--accent)/0.5)]"
            aria-hidden
          />

          <canvas
            ref={canvasRef}
            style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, willChange: "transform" }}
            className="rounded-full"
          />

          {/* Pointer (top) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 pointer-events-none">
            <div
              className="w-8 h-11 bg-accent shadow-lg"
              style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
            />
            <div className="mx-auto w-3 h-3 -mt-2 rounded-full bg-accent-foreground border-2 border-accent" />
          </div>

          {/* Center hub / CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={spin}
              disabled={!user || spinning || hasSpunToday}
              className="z-20 w-32 h-32 rounded-full bg-accent hover:bg-accent/90 border-8 border-card shadow-[0_0_30px_hsl(var(--accent)/0.6)] flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
              aria-label="Zakręć kołem"
            >
              {spinning ? (
                <Loader2 className="h-8 w-8 animate-spin text-accent-foreground" />
              ) : hasSpunToday ? (
                <>
                  <Clock className="h-6 w-6 text-accent-foreground" />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">Jutro</span>
                </>
              ) : !user ? (
                <span className="text-accent-foreground font-extrabold text-sm uppercase tracking-tight px-2 text-center leading-tight">Zaloguj się</span>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 text-accent-foreground" />
                  <span className="mt-0.5 text-accent-foreground font-extrabold text-lg uppercase tracking-tight">Zakręć</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status panel */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-accent font-extrabold text-4xl tracking-tight">Koło Fortuny</h1>
          <p className="text-muted-foreground text-lg">Twoja codzienna szansa na wyjątkowe nagrody.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card/60 border border-border p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Twój Streak</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {streak} {streak === 1 ? "dzień" : "dni"} z rzędu
            </div>
          </div>

          <div className="bg-card/60 border border-border p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Następna szansa</span>
            </div>
            <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{countdown}</div>
          </div>
        </div>

        {/* Status banner */}
        {!user ? (
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-6 rounded-r-2xl">
            <h3 className="text-foreground font-bold text-lg leading-tight">Zaloguj się, aby zagrać</h3>
            <p className="text-muted-foreground mt-1 mb-3">Załóż konto i odbieraj punkty codziennie.</p>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/register">Załóż konto</Link>
            </Button>
          </div>
        ) : wonPrize ? (
          <div className="relative bg-gradient-to-r from-accent/15 to-transparent border-l-4 border-accent p-6 rounded-r-2xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xl">
                {wonPrize.icon}
              </div>
              <div>
                <h3 className="text-foreground font-bold text-lg leading-tight">Wygrana: {wonPrize.name}</h3>
                {wonPrize.points_reward > 0 ? (
                  <p className="text-accent font-semibold mt-1">+{wonPrize.points_reward} punktów zapisane na koncie</p>
                ) : (
                  <p className="text-muted-foreground mt-1">Spróbuj jutro — kolejny los czeka!</p>
                )}
              </div>
            </div>
          </div>
        ) : hasSpunToday ? (
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-6 rounded-r-2xl">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-foreground font-bold text-lg leading-tight">Już kręcono dzisiaj</h3>
                <p className="text-muted-foreground mt-1">Wróć po północy, aby odebrać kolejny bonus i utrzymać swoją serię!</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-6 rounded-r-2xl">
            <div className="flex items-start gap-4">
              <Gift className="h-6 w-6 text-accent mt-0.5" />
              <div>
                <h3 className="text-foreground font-bold text-lg leading-tight">Dzisiejszy los czeka</h3>
                <p className="text-muted-foreground mt-1">Kliknij środek koła, aby zakręcić.</p>
              </div>
            </div>
          </div>
        )}

        {/* Prize list */}
        <div className="bg-card/40 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-accent" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Możliwe nagrody</h4>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {prizes.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-base">{p.icon}</span>
                <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                {p.points_reward > 0 && (
                  <span className="text-accent font-semibold text-xs">+{p.points_reward}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground text-xs uppercase tracking-widest text-center lg:text-left">
          Jedno zakręcenie dziennie · Nagrody dodawane automatycznie
        </p>
      </div>
    </div>
  );
};

export default FortuneWheel;
