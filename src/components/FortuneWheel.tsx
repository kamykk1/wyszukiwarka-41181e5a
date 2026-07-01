import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Clock, Sparkles, Trophy, Gift, History } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

interface Prize {
  id: string;
  name: string;
  points_reward: number;
  color: string;
  icon: string;
  probability_weight: number;
}

interface SpinHistoryEntry {
  id: string;
  spin_date: string;
  points_won: number;
  created_at: string;
  prize_name: string;
  prize_icon: string;
}

const MAX_WHEEL = 420;
const MIN_WHEEL = 260;

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

const useResponsiveWheelSize = (ref: React.RefObject<HTMLDivElement>) => {
  const [size, setSize] = useState(MAX_WHEEL);
  useEffect(() => {
    const compute = () => {
      const w = ref.current?.clientWidth ?? MAX_WHEEL;
      // leave 24px breathing space, clamp between MIN and MAX
      setSize(Math.max(MIN_WHEEL, Math.min(MAX_WHEEL, Math.floor(w - 24))));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [ref]);
  return size;
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
  const [history, setHistory] = useState<SpinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const spinBtnRef = useRef<HTMLButtonElement>(null);
  const wheelSize = useResponsiveWheelSize(wheelWrapRef);
  const countdown = useCountdown();

  const loadHistory = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("wheel_spins")
      .select("id, spin_date, points_won, created_at, wheel_prizes(name, icon)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setHistory(
        (data as Array<{
          id: string; spin_date: string; points_won: number; created_at: string;
          wheel_prizes: { name: string; icon: string } | null;
        }>).map((r) => ({
          id: r.id,
          spin_date: r.spin_date,
          points_won: r.points_won,
          created_at: r.created_at,
          prize_name: r.wheel_prizes?.name ?? "—",
          prize_icon: r.wheel_prizes?.icon ?? "🎁",
        }))
      );
    }
  }, []);

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
      trackEvent("wheel_page_view", { authenticated: true });
      (async () => {
        const today = new Date().toISOString().split("T")[0];
        const [{ data: spin }, { data: streakRow }] = await Promise.all([
          supabase.from("wheel_spins").select("id").eq("spin_date", today).eq("user_id", user.id),
          supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        ]);
        if (spin && spin.length > 0) setHasSpunToday(true);
        if (streakRow?.current_streak) setStreak(streakRow.current_streak);
        loadHistory(user.id);
      })();
    } else {
      trackEvent("wheel_page_view", { authenticated: false });
    }
  }, [user, loadHistory]);

  useEffect(() => { drawWheel(); }, [prizes, rotation, wheelSize]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = wheelSize;
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

      ctx.strokeStyle = "rgba(249,115,22,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, radius - 8, start + 0.02, end - 0.02);
      ctx.strokeStyle = prize.color || "#f97316";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f8fafc";
      const nameFont = Math.max(10, Math.min(15, cssSize / 30) - prizes.length * 0.3);
      ctx.font = `700 ${nameFont}px Inter, sans-serif`;
      ctx.fillText(prize.name.toUpperCase().slice(0, 12), radius - 22, 5);
      ctx.textAlign = "left";
      ctx.font = `${nameFont + 2}px sans-serif`;
      ctx.fillText(prize.icon, radius * 0.28, 6);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore();
  };

  const spin = async () => {
    if (!user) {
      trackEvent("wheel_spin_click", { blocked: "not_logged_in" });
      return;
    }
    if (spinning || hasSpunToday) {
      trackEvent("wheel_spin_click", { blocked: spinning ? "in_progress" : "already_spun" });
      return;
    }
    trackEvent("wheel_spin_click", {});
    setSpinning(true);
    setWonPrize(null);
    setStatusMsg("Kręcimy kołem…");

    const { data, error } = await supabase.rpc("spin_wheel");

    if (error || !data || (data as unknown as { error?: string }).error) {
      const errCode = (data as unknown as { error?: string })?.error ?? "rpc_error";
      const msg = (data as unknown as { message?: string })?.message || "Nie udało się zakręcić kołem.";
      trackEvent("wheel_error", { code: errCode, message: msg });
      toast({ title: "Błąd", description: msg, variant: "destructive" });
      setSpinning(false);
      setStatusMsg(`Błąd: ${msg}`);
      if (errCode === "already_spun") setHasSpunToday(true);
      return;
    }

    const prize = (data as unknown as { prize: Prize }).prize;
    const prizeIndex = prizes.findIndex((p) => p.id === prize.id);
    const sliceDeg = 360 / prizes.length;
    const targetAngle = 270 - (prizeIndex * sliceDeg + sliceDeg / 2);
    const spins = 6 + Math.random() * 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((targetAngle - currentMod) % 360 + 360) % 360;
    const finalRotation = rotation + spins * 360 + delta;

    trackEvent("wheel_animation_start", { prize_id: prize.id, prize_name: prize.name });

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
        trackEvent("wheel_spin_result", {
          prize_id: prize.id,
          prize_name: prize.name,
          points: prize.points_reward,
        });
        const announce = prize.points_reward > 0
          ? `Wygrana: ${prize.name}. Otrzymujesz ${prize.points_reward} punktów.`
          : `Wynik: ${prize.name}. Spróbuj jutro.`;
        setStatusMsg(announce);
        if (prize.points_reward > 0) {
          toast({ title: `${prize.icon} ${prize.name}!`, description: `Wygrałeś ${prize.points_reward} punktów!` });
        } else {
          toast({ title: `${prize.icon} Pudło`, description: "Spróbuj jutro!" });
        }
        if (user) loadHistory(user.id);
      }
    };
    requestAnimationFrame(animate);
  };

  if (loading || prizes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Ładowanie" />
      </div>
    );
  }

  const btnDisabled = !user || spinning || hasSpunToday;
  const btnAriaLabel = !user
    ? "Zaloguj się, aby zakręcić kołem fortuny"
    : hasSpunToday
    ? "Już zakręcono dziś. Wróć jutro."
    : spinning
    ? "Koło kręci się"
    : "Zakręć kołem fortuny";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
      {/* Screen-reader live region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </div>

      {/* Wheel */}
      <div
        ref={wheelWrapRef}
        className="relative flex justify-center w-full max-w-full overflow-hidden px-3 sm:px-0"
      >
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl -z-10" aria-hidden="true" />

        <div
          className="relative"
          style={{ width: wheelSize, height: wheelSize, maxWidth: "100%" }}
          role="img"
          aria-label={`Koło fortuny z ${prizes.length} nagrodami: ${prizes.map((p) => p.name).join(", ")}`}
        >
          <div
            className="absolute inset-0 rounded-full border-[10px] sm:border-[12px] border-card shadow-[0_0_60px_-15px_hsl(var(--accent)/0.5)]"
            aria-hidden="true"
          />

          <canvas
            ref={canvasRef}
            style={{ width: wheelSize, height: wheelSize, willChange: "transform" }}
            className="rounded-full"
            aria-hidden="true"
          />

          {/* Pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 pointer-events-none" aria-hidden="true">
            <div
              className="w-7 h-10 sm:w-8 sm:h-11 bg-accent shadow-lg"
              style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
            />
            <div className="mx-auto w-3 h-3 -mt-2 rounded-full bg-accent-foreground border-2 border-accent" />
          </div>

          {/* Center CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              ref={spinBtnRef}
              onClick={spin}
              disabled={btnDisabled}
              aria-label={btnAriaLabel}
              aria-busy={spinning}
              className="z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-accent hover:bg-accent/90 border-[6px] sm:border-8 border-card shadow-[0_0_30px_hsl(var(--accent)/0.6)] flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {spinning ? (
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-accent-foreground" aria-hidden="true" />
              ) : hasSpunToday ? (
                <>
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" aria-hidden="true" />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">Jutro</span>
                </>
              ) : !user ? (
                <span className="text-accent-foreground font-extrabold text-xs sm:text-sm uppercase tracking-tight px-2 text-center leading-tight">Zaloguj się</span>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" aria-hidden="true" />
                  <span className="mt-0.5 text-accent-foreground font-extrabold text-base sm:text-lg uppercase tracking-tight">Zakręć</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status panel */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-accent font-extrabold text-3xl sm:text-4xl tracking-tight">Koło Fortuny</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Twoja codzienna szansa na wyjątkowe nagrody.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card/60 border border-border p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent" aria-hidden="true" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Twój Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {streak} {streak === 1 ? "dzień" : "dni"} z rzędu
            </div>
          </div>

          <div className="bg-card/60 border border-border p-4 sm:p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" aria-hidden="true" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Następna szansa</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">{countdown}</div>
          </div>
        </div>

        {/* Status banner */}
        {!user ? (
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-5 sm:p-6 rounded-r-2xl">
            <h3 className="text-foreground font-bold text-base sm:text-lg leading-tight">Zaloguj się, aby zagrać</h3>
            <p className="text-muted-foreground mt-1 mb-3 text-sm sm:text-base">Załóż konto i odbieraj punkty codziennie.</p>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/register">Załóż konto</Link>
            </Button>
          </div>
        ) : wonPrize ? (
          <div className="relative bg-gradient-to-r from-accent/15 to-transparent border-l-4 border-accent p-5 sm:p-6 rounded-r-2xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xl" aria-hidden="true">
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
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-5 sm:p-6 rounded-r-2xl">
            <div className="flex items-start gap-4">
              <div className="mt-1" aria-hidden="true">
                <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-foreground font-bold text-lg leading-tight">Już kręcono dzisiaj</h3>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Wróć po północy, aby odebrać kolejny bonus i utrzymać swoją serię!</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent p-5 sm:p-6 rounded-r-2xl">
            <div className="flex items-start gap-4">
              <Gift className="h-6 w-6 text-accent mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-foreground font-bold text-lg leading-tight">Dzisiejszy los czeka</h3>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Kliknij środek koła lub użyj klawisza Enter, aby zakręcić.</p>
              </div>
            </div>
          </div>
        )}

        {/* Prize list */}
        <div className="bg-card/40 border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Możliwe nagrody</h4>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {prizes.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-base" aria-hidden="true">{p.icon}</span>
                <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                {p.points_reward > 0 && (
                  <span className="text-accent font-semibold text-xs">+{p.points_reward} pkt</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Spin history */}
        {user && (
          <div className="bg-card/40 border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-accent" aria-hidden="true" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Historia (10 ostatnich)</h4>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zakręceń. Zakręć kołem, aby rozpocząć historię.</p>
            ) : (
              <ul className="divide-y divide-border/60" aria-label="Historia zakręceń">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="text-base" aria-hidden="true">{h.prize_icon}</span>
                    <span className="text-foreground flex-1 truncate">{h.prize_name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {new Date(h.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${h.points_won > 0 ? "text-accent" : "text-muted-foreground"}`}>
                      {h.points_won > 0 ? `+${h.points_won}` : "0"} pkt
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="text-muted-foreground text-xs uppercase tracking-widest text-center lg:text-left">
          Jedno zakręcenie dziennie · Nagrody dodawane automatycznie
        </p>
      </div>
    </div>
  );
};

export default FortuneWheel;
