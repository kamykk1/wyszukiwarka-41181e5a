import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { PartnerStatus } from "@/hooks/useOfferSearch";

const LABEL: Record<PartnerStatus["id"], string> = {
  allegro: "Allegro",
  aliexpress: "AliExpress",
  amazon: "Amazon",
  temu: "Temu",
};

interface Props {
  partners: PartnerStatus[];
  loading: boolean;
}

export const PartnerStatusBar = ({ partners, loading }: Props) => {
  if (loading && partners.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Pobieranie ofert od partnerów…
      </div>
    );
  }
  if (partners.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {partners.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 text-muted-foreground">
          {p.status === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className="font-medium text-foreground">{LABEL[p.id]}</span>
          <span>
            {p.status === "ok" ? `${p.count} ofert` : "błąd"}
            {" · "}{p.latency_ms} ms
          </span>
        </span>
      ))}
    </div>
  );
};
