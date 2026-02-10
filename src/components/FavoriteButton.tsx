import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  size?: "sm" | "default";
}

const FavoriteButton = ({ isFavorite, onClick, className, size = "default" }: FavoriteButtonProps) => (
  <Button
    variant="ghost"
    size="icon"
    className={cn(
      "rounded-full transition-all",
      size === "sm" ? "h-8 w-8" : "h-10 w-10",
      isFavorite ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-destructive",
      className
    )}
    onClick={onClick}
  >
    <Heart className={cn("h-4 w-4 transition-all", isFavorite && "fill-current scale-110")} />
  </Button>
);

export default FavoriteButton;
