import { ExternalLink, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnifiedOffer } from "@/hooks/useOfferSearch";

const PARTNER_LABEL: Record<UnifiedOffer["partner_id"], { name: string; color: string }> = {
  allegro: { name: "Allegro", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  aliexpress: { name: "AliExpress", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  amazon: { name: "Amazon", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  temu: { name: "Temu", color: "bg-orange-600/10 text-orange-700 border-orange-600/20" },
};

interface Props {
  offer: UnifiedOffer;
  index: number;
  onClick?: (offer: UnifiedOffer) => void;
}

export const OfferCard = ({ offer, index, onClick }: Props) => {
  const partner = PARTNER_LABEL[offer.partner_id];
  return (
    <div
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-0.5 animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {offer.image_url ? (
          <img
            src={offer.image_url}
            alt={offer.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🛒</div>
        )}
        <Badge className={`absolute top-2 left-2 border ${partner.color}`} variant="outline">
          {partner.name}
        </Badge>
        {offer.cashback_rate > 0 && (
          <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
            {offer.cashback_rate.toFixed(1)}% cashback
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
          {offer.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {offer.brand && <span>{offer.brand}</span>}
          {offer.rating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-current text-yellow-500" />
              {offer.rating.toFixed(1)}
              {offer.reviews_count != null && ` (${offer.reviews_count})`}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-foreground">
            {offer.price_effective.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{offer.currency}</span>
          <span className="text-xs text-muted-foreground">po cashbacku</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Cena: <span className="line-through">{offer.price_total.toFixed(2)} {offer.currency}</span>
          {" · "}
          <span className="text-accent font-semibold">−{offer.cashback_amount.toFixed(2)} {offer.currency}</span>
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Truck className="h-3 w-3" />
          {offer.shipping_price > 0
            ? `+${offer.shipping_price.toFixed(2)} ${offer.currency} dostawa`
            : "Darmowa dostawa"}
        </div>

        <Button
          asChild
          size="sm"
          className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => onClick?.(offer)}
        >
          <a href={offer.product_url} target="_blank" rel="noopener noreferrer">
            Przejdź do sklepu <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
};
