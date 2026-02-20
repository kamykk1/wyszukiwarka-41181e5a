import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Favorites from "./pages/Favorites";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Cashback from "./pages/Cashback";
import MailingClick from "./pages/MailingClick";
import Konta from "./pages/Konta";
import Kredyty from "./pages/Kredyty";
import Lokaty from "./pages/Lokaty";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-panel" element={<Admin />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/cashback" element={<Cashback />} />
            
            <Route path="/mailing-click" element={<MailingClick />} />
            <Route path="/konta" element={<Konta />} />
            <Route path="/kredyty" element={<Kredyty />} />
            <Route path="/lokaty" element={<Lokaty />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
