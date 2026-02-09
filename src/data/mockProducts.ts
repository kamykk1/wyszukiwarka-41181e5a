export interface Product {
  id: string;
  name: string;
  image: string;
  store: string;
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  rating?: number;
  reviews?: number;
  category: string;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
  color: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
}

export const stores: Store[] = [
  { id: "allegro", name: "Allegro", logo: "🟠", color: "#FF5A00", enabled: true },
  { id: "amazon", name: "Amazon", logo: "📦", color: "#FF9900", enabled: true },
  { id: "aliexpress", name: "AliExpress", logo: "🔴", color: "#E43225", enabled: true },
  { id: "temu", name: "Temu", logo: "🟤", color: "#FB7701", enabled: true },
  { id: "ebay", name: "eBay", logo: "🟡", color: "#E53238", enabled: true },
  { id: "ceneo", name: "Ceneo", logo: "🟢", color: "#00A046", enabled: false },
  { id: "empik", name: "Empik", logo: "🟣", color: "#6B2D8B", enabled: false },
];

export const mockProducts: Product[] = [
  { id: "1", name: "Słuchawki Bluetooth TWS Pro z ANC", image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=300&h=300&fit=crop", store: "aliexpress", price: 49.99, originalPrice: 129.99, currency: "PLN", url: "#", rating: 4.3, reviews: 2341, category: "Elektronika" },
  { id: "2", name: "Słuchawki Bluetooth TWS Pro z ANC", image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=300&h=300&fit=crop", store: "allegro", price: 79.99, originalPrice: 149.99, currency: "PLN", url: "#", rating: 4.6, reviews: 891, category: "Elektronika" },
  { id: "3", name: "Słuchawki Bluetooth TWS Pro z ANC", image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=300&h=300&fit=crop", store: "amazon", price: 65.00, currency: "PLN", url: "#", rating: 4.5, reviews: 5621, category: "Elektronika" },
  { id: "4", name: "Smartwatch Fitness Tracker IP68", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", store: "temu", price: 39.90, originalPrice: 199.90, currency: "PLN", url: "#", rating: 4.1, reviews: 8921, category: "Elektronika" },
  { id: "5", name: "Smartwatch Fitness Tracker IP68", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", store: "allegro", price: 129.00, originalPrice: 249.00, currency: "PLN", url: "#", rating: 4.7, reviews: 432, category: "Elektronika" },
  { id: "6", name: "Smartwatch Fitness Tracker IP68", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", store: "amazon", price: 89.99, currency: "PLN", url: "#", rating: 4.4, reviews: 3201, category: "Elektronika" },
  { id: "7", name: "Plecak Miejski na Laptopa 15.6\"", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop", store: "aliexpress", price: 59.00, originalPrice: 120.00, currency: "PLN", url: "#", rating: 4.2, reviews: 1567, category: "Akcesoria" },
  { id: "8", name: "Plecak Miejski na Laptopa 15.6\"", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop", store: "ebay", price: 75.50, currency: "PLN", url: "#", rating: 4.0, reviews: 234, category: "Akcesoria" },
  { id: "9", name: "Lampa LED Biurkowa z Ładowarką Qi", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop", store: "temu", price: 29.99, originalPrice: 89.99, currency: "PLN", url: "#", rating: 3.9, reviews: 4521, category: "Dom" },
  { id: "10", name: "Lampa LED Biurkowa z Ładowarką Qi", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop", store: "allegro", price: 69.00, currency: "PLN", url: "#", rating: 4.8, reviews: 156, category: "Dom" },
  { id: "11", name: "Organizer Kabli Magnetyczny 5-pak", image: "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=300&h=300&fit=crop", store: "aliexpress", price: 12.99, originalPrice: 39.99, currency: "PLN", url: "#", rating: 4.0, reviews: 9823, category: "Akcesoria" },
  { id: "12", name: "Organizer Kabli Magnetyczny 5-pak", image: "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=300&h=300&fit=crop", store: "amazon", price: 24.99, currency: "PLN", url: "#", rating: 4.3, reviews: 1234, category: "Akcesoria" },
];

export const categories = ["Wszystkie", "Elektronika", "Akcesoria", "Dom", "Moda", "Sport", "Zdrowie"];

/** Group products by name — returns all offers for the same product */
export function getProductGroup(productId: string): Product[] {
  const product = mockProducts.find(p => p.id === productId);
  if (!product) return [];
  return mockProducts
    .filter(p => p.name === product.name)
    .sort((a, b) => a.price - b.price);
}

/** Get unique product groups (one entry per product name) */
export function getUniqueProducts(): { name: string; image: string; category: string; minPrice: number; currency: string; offersCount: number; representativeId: string }[] {
  const groups = new Map<string, Product[]>();
  for (const p of mockProducts) {
    const existing = groups.get(p.name) || [];
    existing.push(p);
    groups.set(p.name, existing);
  }
  return Array.from(groups.entries()).map(([name, products]) => ({
    name,
    image: products[0].image,
    category: products[0].category,
    minPrice: Math.min(...products.map(p => p.price)),
    currency: products[0].currency,
    offersCount: products.length,
    representativeId: products[0].id,
  }));
}

export function searchProducts(query: string, storeFilter?: string[], sortBy: string = "price-asc"): Product[] {
  let results = mockProducts.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  if (storeFilter && storeFilter.length > 0) {
    results = results.filter(p => storeFilter.includes(p.store));
  }

  switch (sortBy) {
    case "price-asc":
      results.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      results.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "reviews":
      results.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
      break;
  }

  return results;
}
