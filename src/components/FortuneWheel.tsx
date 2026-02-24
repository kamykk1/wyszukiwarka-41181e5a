import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Prize {
  id: string;
  name: string;
  points_reward: number;
  color: string;
  icon: string;
  probability_weight: number;
}

const FortuneWheel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; points_reward: number; icon: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const checkSpin = async () => {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("wheel_spins")
          .select("id")
          .eq("spin_date", today);
        if (data && data.length > 0) setHasSpunToday(true);
      };
      checkSpin();
    }
  }, [user]);

  useEffect(() => {
    drawWheel();
  }, [prizes, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);

    prizes.forEach((prize, i) => {
      const start = i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, 14 - prizes.length * 0.3)}px sans-serif`;
      ctx.fillText(prize.icon, radius * 0.6, 4);
      ctx.font = `${Math.max(8, 11 - prizes.length * 0.2)}px sans-serif`;
      ctx.fillText(prize.name, radius * 0.38, 4);
      ctx.restore();
    });

    ctx.restore();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(size - 8, center - 10);
    ctx.lineTo(size + 2, center);
    ctx.lineTo(size - 8, center + 10);
    ctx.closePath();
    ctx.fillStyle = "hsl(var(--accent))";
    ctx.fill();
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
    const sliceAngle = 360 / prizes.length;
    // Land on the winning slice (rotate so it aligns with the right-side pointer)
    const targetAngle = 360 - (prizeIndex * sliceAngle + sliceAngle / 2);
    const spins = 5 + Math.random() * 3;
    const finalRotation = spins * 360 + targetAngle;

    // Animate
    const duration = 4000;
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + finalRotation * eased;
      setRotation(currentRotation % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(targetAngle % 360);
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

  if (loading || prizes.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-product text-center">
      <h3 className="text-lg font-bold text-foreground mb-1">🎡 Koło Fortuny</h3>
      <p className="text-xs text-muted-foreground mb-3">Kręć codziennie i wygrywaj punkty!</p>

      <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
        <canvas ref={canvasRef} width={240} height={240} className="rounded-full" />
      </div>

      {wonPrize && (
        <div className="mt-3 rounded-lg bg-accent/10 border border-accent/30 p-3 animate-fade-in">
          <span className="text-2xl">{wonPrize.icon}</span>
          <p className="font-bold text-foreground">{wonPrize.name}</p>
          {wonPrize.points_reward > 0 && (
            <p className="text-sm text-accent font-semibold">+{wonPrize.points_reward} pkt</p>
          )}
        </div>
      )}

      <div className="mt-3">
        {!user ? (
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/register">Zaloguj się, żeby kręcić</Link>
          </Button>
        ) : hasSpunToday ? (
          <Button size="sm" disabled className="w-full">
            Wróć jutro! ⏰
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={spin}
            disabled={spinning}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {spinning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {spinning ? "Losowanie..." : "Zakręć kołem! 🎰"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FortuneWheel;
