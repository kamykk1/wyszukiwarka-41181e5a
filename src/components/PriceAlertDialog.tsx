import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PriceAlertDialogProps {
  productName: string;
  currentPrice: number;
  currency: string;
  existingTargetPrice?: number;
  onSetAlert: (productName: string, targetPrice: number) => Promise<void>;
}

const PriceAlertDialog = ({ productName, currentPrice, currency, existingTargetPrice, onSetAlert }: PriceAlertDialogProps) => {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(existingTargetPrice?.toString() ?? Math.floor(currentPrice * 0.8).toString());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    setSaving(true);
    await onSetAlert(productName, price);
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={existingTargetPrice ? "default" : "outline"}
          size="sm"
          className={existingTargetPrice ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
        >
          <Bell className="mr-1.5 h-4 w-4" />
          {existingTargetPrice ? `Alert: ${existingTargetPrice.toFixed(0)} ${currency}` : "Ustaw alert"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alert cenowy</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{productName}</p>
        <p className="text-sm text-muted-foreground">
          Obecna najniższa cena: <strong className="text-foreground">{currentPrice.toFixed(2)} {currency}</strong>
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Powiadom mnie, gdy cena spadnie poniżej:</label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground font-medium">{currency}</span>
            </div>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
            {saving ? "Zapisywanie..." : "Ustaw alert 🔔"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PriceAlertDialog;
