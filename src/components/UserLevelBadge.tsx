import { getUserLevel } from "@/components/UserLevelCard";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useLevelUpConfetti } from "@/hooks/useLevelUpConfetti";

const UserLevelBadge = () => {
  const totalEarned = useUserPoints();
  useLevelUpConfetti(totalEarned);
  if (totalEarned === null) return null;

  const level = getUserLevel(totalEarned);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${level.bgColor} ${level.color}`}
    >
      {level.icon} {level.name}
    </span>
  );
};

export default UserLevelBadge;
