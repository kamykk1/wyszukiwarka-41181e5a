import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { getUserLevel } from "@/components/UserLevelCard";

/**
 * Fires confetti + toast when the user's level changes upward.
 * Pass current totalEarned; the hook tracks the previous level internally.
 */
export function useLevelUpConfetti(totalEarned: number | null) {
  const prevLevelName = useRef<string | null>(null);

  useEffect(() => {
    if (totalEarned === null) return;

    const current = getUserLevel(totalEarned);

    if (prevLevelName.current !== null && prevLevelName.current !== current.name) {
      // Level changed — fire confetti 🎉
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#FFD700", "#FFA500", "#FF6347", "#7B68EE", "#00CED1"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#FFD700", "#FFA500", "#FF6347", "#7B68EE", "#00CED1"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Show toast notification
      toast.success(`🎉 Awans na poziom ${current.icon} ${current.name}!`, {
        description: "Gratulacje! Osiągnąłeś nowy poziom w programie lojalnościowym.",
        duration: 5000,
      });
    }

    prevLevelName.current = current.name;
  }, [totalEarned]);
}
