import { stores } from "@/data/mockProducts";

interface StoreFilterProps {
  selectedStores: string[];
  onToggleStore: (storeId: string) => void;
}

const StoreFilter = ({ selectedStores, onToggleStore }: StoreFilterProps) => {
  const enabledStores = stores.filter(s => s.enabled);

  return (
    <div className="flex flex-wrap gap-2">
      {enabledStores.map(store => {
        const isSelected = selectedStores.length === 0 || selectedStores.includes(store.id);
        return (
          <button
            key={store.id}
            onClick={() => onToggleStore(store.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              isSelected
                ? "border-transparent shadow-sm"
                : "border-border bg-card text-muted-foreground opacity-50 hover:opacity-80"
            }`}
            style={isSelected ? { backgroundColor: `${store.color}18`, color: store.color, borderColor: `${store.color}40` } : {}}
          >
            {store.logo} {store.name}
          </button>
        );
      })}
    </div>
  );
};

export default StoreFilter;
