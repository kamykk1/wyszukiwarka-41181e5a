import { Star, ExternalLink, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Product, stores } from "@/data/mockProducts";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const store = stores.find(s => s.id === product.store);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex gap-4 rounded-xl border bg-card p-4 shadow-product transition-all duration-300 hover:shadow-product-hover hover:-translate-y-0.5 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {discount && discount >= 40 && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
          <TrendingDown className="h-3 w-3" />
          -{discount}%
        </div>
      )}

      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${store?.color}18`, color: store?.color }}
            >
              {store?.logo} {store?.name}
            </span>
            {product.rating && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {product.rating}
                <span className="text-muted-foreground/60">({product.reviews})</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground">
              {product.price.toFixed(2)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {product.currency}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            Porównaj <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
