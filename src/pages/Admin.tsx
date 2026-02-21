import { useState } from "react";
import { Users, Store, Mail, ChevronRight, ShieldAlert, Loader2, Gift, ShoppingBag, Plug, Landmark, FileText, History } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminStores from "@/components/admin/AdminStores";
import AdminMailing from "@/components/admin/AdminMailing";
import AdminRewards from "@/components/admin/AdminRewards";
import AdminRedemptions from "@/components/admin/AdminRedemptions";
import AdminPartners from "@/components/admin/AdminPartners";
import AdminFinancialProducts from "@/components/admin/AdminFinancialProducts";
import AdminPageSettings from "@/components/admin/AdminPageSettings";
import AdminTransactions from "@/components/admin/AdminTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const tabs = [
  { id: "users", label: "Użytkownicy", icon: Users },
  { id: "stores", label: "Sklepy", icon: Store },
  { id: "partners", label: "Integracje", icon: Plug },
  { id: "financial", label: "Oferty finansowe", icon: Landmark },
  { id: "pages", label: "Opisy stron", icon: FileText },
  { id: "rewards", label: "Nagrody", icon: Gift },
  { id: "redemptions", label: "Zamówienia", icon: ShoppingBag },
  { id: "transactions", label: "Transakcje pkt", icon: History },
  { id: "mailing", label: "Mailing", icon: Mail },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const { user, loading: authLoading, isAdmin } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-xl font-semibold text-foreground">Brak dostępu</p>
          <p className="mt-1 text-muted-foreground">Tylko administratorzy mają dostęp do tego panelu.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Wróć do strony głównej</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Panel Administracyjny</h1>
          <p className="text-sm text-muted-foreground">Zarządzaj aplikacją NetSzukacz</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="rounded-xl border bg-card p-2 shadow-product">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  <ChevronRight className="ml-auto h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 animate-fade-in">
            {activeTab === "users" && <AdminUsers />}
            {activeTab === "stores" && <AdminStores />}
            {activeTab === "partners" && <AdminPartners />}
            {activeTab === "financial" && <AdminFinancialProducts />}
            {activeTab === "pages" && <AdminPageSettings />}
            {activeTab === "rewards" && <AdminRewards />}
            {activeTab === "redemptions" && <AdminRedemptions />}
            {activeTab === "transactions" && <AdminTransactions />}
            {activeTab === "mailing" && <AdminMailing />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
