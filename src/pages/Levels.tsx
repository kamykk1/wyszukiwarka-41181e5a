import Navbar from "@/components/Navbar";
import { Progress } from "@/components/ui/progress";
import { getUserLevel } from "@/components/UserLevelCard";
import { useUserPoints } from "@/hooks/useUserPoints";
import { Award, Check, Gift, MousePointerClick, Percent, ShoppingBag, Star, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface LevelInfo {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
  icon: string;
  gradient: string;
  perks: string[];
}

const LEVELS_INFO: LevelInfo[] = [
  {
    name: "Bronze",
    minPoints: 0,
    maxPoints: 500,
    color: "text-amber-700",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: "🥉",
    gradient: "from-amber-200 to-amber-400 dark:from-amber-900/40 dark:to-amber-700/40",
    perks: [
      "Zbieranie punktów za kliknięcia i zakupy",
      "Dostęp do porównywarki cen",
      "1 obrót kołem fortuny dziennie",
      "Seria aktywności — bonusowe punkty",
    ],
  },
  {
    name: "Silver",
    minPoints: 500,
    maxPoints: 2000,
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800/40",
    icon: "🥈",
    gradient: "from-slate-200 to-slate-400 dark:from-slate-800/40 dark:to-slate-600/40",
    perks: [
      "Wszystkie korzyści Bronze",
      "Dostęp do alertów cenowych",
      "Priorytetowe powiadomienia o promocjach",
      "Bonus powitalny +25 pkt za polecenie",
    ],
  },
  {
    name: "Gold",
    minPoints: 2000,
    maxPoints: 5000,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: "🥇",
    gradient: "from-yellow-200 to-yellow-500 dark:from-yellow-900/30 dark:to-yellow-700/30",
    perks: [
      "Wszystkie korzyści Silver",
      "Wyższy cashback u wybranych partnerów",
      "Ekskluzywne nagrody w katalogu",
      "Bonus za serię: do x2 mnożnik",
    ],
  },
  {
    name: "Platinum",
    minPoints: 5000,
    maxPoints: 15000,
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    icon: "💎",
    gradient: "from-cyan-200 to-cyan-500 dark:from-cyan-900/30 dark:to-cyan-700/30",
    perks: [
      "Wszystkie korzyści Gold",
      "Wczesny dostęp do nowych ofert partnerów",
      "Dedykowane promocje finansowe",
      "Priorytetowa obsługa zgłoszeń",
    ],
  },
  {
    name: "Diamond",
    minPoints: 15000,
    maxPoints: Infinity,
    color: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
    icon: "👑",
    gradient: "from-violet-300 to-purple-500 dark:from-violet-900/40 dark:to-purple-700/40",
    perks: [
      "Wszystkie korzyści Platinum",
      "Najwyższe stawki cashback",
      "VIP nagrody — niedostępne dla niższych poziomów",
      "Miejsce w elitarnym rankingu Diamond",
      "Bonus za serię: do x3 mnożnik",
    ],
  },
];

const LevelCard = ({
  level,
  isCurrent,
  totalEarned,
}: {
  level: LevelInfo;
  isCurrent: boolean;
  totalEarned: number | null;
}) => {
  const isUnlocked = totalEarned !== null && totalEarned >= level.minPoints;
  const nextThreshold = level.maxPoints === Infinity ? null : level.maxPoints;
  const progress =
    totalEarned !== null && isCurrent && nextThreshold
      ? ((totalEarned - level.minPoints) / (nextThreshold - level.minPoints)) * 100
      : isUnlocked
        ? 100
        : 0;

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${
        isCurrent
          ? `border-primary shadow-lg scale-[1.02] ${level.bgColor}`
          : isUnlocked
            ? `border-border/60 ${level.bgColor} opacity-80`
            : "border-border/30 bg-muted/30 opacity-60"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
          Twój poziom
        </span>
      )}

      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{level.icon}</span>
        <div>
          <h3 className={`text-xl font-extrabold ${level.color}`}>{level.name}</h3>
          <p className="text-sm text-muted-foreground">
            {level.minPoints === 0
              ? "Start"
              : `od ${level.minPoints.toLocaleString("pl-PL")} pkt`}
            {nextThreshold
              ? ` do ${nextThreshold.toLocaleString("pl-PL")} pkt`
              : " — bez limitu"}
          </p>
        </div>
      </div>

      {isCurrent && totalEarned !== null && nextThreshold && (
        <div className="mb-4">
          <Progress value={progress} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            {totalEarned.toLocaleString("pl-PL")} / {nextThreshold.toLocaleString("pl-PL")} pkt
            {" — "}brakuje <strong>{(nextThreshold - totalEarned).toLocaleString("pl-PL")}</strong> pkt
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {level.perks.map((perk, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                isUnlocked ? "text-success" : "text-muted-foreground/40"
              }`}
            />
            <span className={isUnlocked ? "text-foreground" : "text-muted-foreground"}>
              {perk}
            </span>
          </li>
        ))}
      </ul>

      {!isUnlocked && totalEarned !== null && (
        <p className="mt-4 text-xs text-muted-foreground text-center">
          🔒 Brakuje <strong>{(level.minPoints - totalEarned).toLocaleString("pl-PL")}</strong> pkt do odblokowania
        </p>
      )}
    </div>
  );
};

const HowToEarn = () => (
  <div className="rounded-2xl border bg-card p-6 shadow-product">
    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
      <Star className="h-5 w-5 text-yellow-500" /> Jak zdobywać punkty?
    </h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { icon: <MousePointerClick className="h-5 w-5 text-blue-500" />, label: "Klikaj w oferty", desc: "1 pkt za kliknięcie dziennie" },
        { icon: <ShoppingBag className="h-5 w-5 text-success" />, label: "Kupuj przez SmartPrice", desc: "10 pkt za każdy zakup" },
        { icon: <Gift className="h-5 w-5 text-purple-500" />, label: "Polecaj znajomym", desc: "50 pkt za każde polecenie" },
        { icon: <Zap className="h-5 w-5 text-amber-500" />, label: "Kręć kołem fortuny", desc: "Do 100 pkt dziennie" },
        { icon: <Percent className="h-5 w-5 text-accent" />, label: "Korzystaj z ofert partnerów", desc: "Punkty za zadania finansowe" },
        { icon: <Trophy className="h-5 w-5 text-orange-500" />, label: "Utrzymuj serię aktywności", desc: "Do 50 pkt bonusu dziennie" },
      ].map((item, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border bg-background/50 p-3">
          {item.icon}
          <div>
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Levels = () => {
  const totalEarned = useUserPoints();
  const currentLevel = totalEarned !== null ? getUserLevel(totalEarned) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground flex items-center justify-center gap-2">
            <Award className="h-7 w-7" /> Poziomy lojalnościowe
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Zbieraj punkty, awansuj na wyższe poziomy i odblokowuj ekskluzywne korzyści w programie SmartPrice.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {LEVELS_INFO.map((level) => (
            <LevelCard
              key={level.name}
              level={level}
              isCurrent={currentLevel?.name === level.name}
              totalEarned={totalEarned}
            />
          ))}
        </div>

        <HowToEarn />

        <div className="mt-6 text-center">
          <Button asChild>
            <Link to="/moje-punkty">Sprawdź swoje punkty</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Levels;
