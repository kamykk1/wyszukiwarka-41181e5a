import { useMemo } from "react";

interface Props {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: Props) => {
  const { score, label, colorClass } = useMemo(() => {
    if (!password) return { score: 0, label: "", colorClass: "" };
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;

    if (s <= 2) return { score: 33, label: "Słabe", colorClass: "bg-destructive" };
    if (s <= 3) return { score: 66, label: "Średnie", colorClass: "bg-yellow-500" };
    return { score: 100, label: "Silne", colorClass: "bg-green-500" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Siła hasła: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator;
