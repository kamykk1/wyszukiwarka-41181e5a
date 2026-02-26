import { Progress } from "@/components/ui/progress";
import { Award } from "lucide-react";

interface Level {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
  icon: string;
}

const LEVELS: Level[] = [
  { name: "Bronze", minPoints: 0, maxPoints: 500, color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: "🥉" },
  { name: "Silver", minPoints: 500, maxPoints: 2000, color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-800/40", icon: "🥈" },
  { name: "Gold", minPoints: 2000, maxPoints: 5000, color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", icon: "🥇" },
  { name: "Platinum", minPoints: 5000, maxPoints: 15000, color: "text-cyan-500", bgColor: "bg-cyan-50 dark:bg-cyan-900/20", icon: "💎" },
  { name: "Diamond", minPoints: 15000, maxPoints: Infinity, color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-900/20", icon: "👑" },
];

export function getUserLevel(totalEarned: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalEarned >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(totalEarned: number): Level | null {
  const current = getUserLevel(totalEarned);
  const idx = LEVELS.indexOf(current);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

interface UserLevelCardProps {
  totalEarned: number;
}

const UserLevelCard = ({ totalEarned }: UserLevelCardProps) => {
  const current = getUserLevel(totalEarned);
  const next = getNextLevel(totalEarned);

  const progress = next
    ? ((totalEarned - current.minPoints) / (next.minPoints - current.minPoints)) * 100
    : 100;

  return (
    <div className={`rounded-xl border p-5 shadow-product mb-6 ${current.bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Award className={`h-5 w-5 ${current.color}`} />
          Twój poziom
        </h2>
        <span className={`text-2xl`}>{current.icon}</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className={`text-2xl font-extrabold ${current.color}`}>{current.name}</span>
        {next && (
          <span className="text-sm text-muted-foreground">
            → {next.icon} {next.name} ({next.minPoints} pkt)
          </span>
        )}
      </div>

      {next ? (
        <>
          <Progress value={progress} className="h-2.5 mb-1.5" />
          <p className="text-xs text-muted-foreground">
            {totalEarned} / {next.minPoints} pkt — brakuje <strong>{next.minPoints - totalEarned}</strong> pkt do poziomu {next.name}
          </p>
        </>
      ) : (
        <p className="text-sm font-medium text-muted-foreground">
          🏆 Osiągnąłeś najwyższy poziom! Gratulacje!
        </p>
      )}
    </div>
  );
};

export default UserLevelCard;
