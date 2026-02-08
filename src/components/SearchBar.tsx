import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  initialQuery?: string;
  large?: boolean;
}

const SearchBar = ({ initialQuery = "", large = false }: SearchBarProps) => {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className={`relative flex items-center gap-2 ${large ? "max-w-2xl" : "max-w-xl"} mx-auto`}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Szukaj produktów w najlepszych cenach..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`pl-12 pr-4 ${large ? "h-14 text-lg rounded-xl" : "h-11 rounded-lg"} border-2 border-border bg-card focus:border-accent transition-colors`}
          />
        </div>
        <Button
          type="submit"
          className={`${large ? "h-14 px-8 text-lg rounded-xl" : "h-11 px-6 rounded-lg"} bg-accent text-accent-foreground hover:bg-accent/90 font-semibold`}
        >
          Szukaj
        </Button>
      </div>
    </form>
  );
};

export default SearchBar;
