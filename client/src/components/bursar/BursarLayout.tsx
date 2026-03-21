import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolContext as useSchool } from "@/contexts/SchoolContext";
import {
  LayoutDashboard, CreditCard, FileText, BarChart3,
  RefreshCw, Building2, Receipt, LogOut, Menu, X, ChevronRight, Layers
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

const NAV = [
  { href: "/bursar",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/bursar/payments",     icon: CreditCard,      label: "Payments Received" },
  { href: "/bursar/fees",         icon: FileText,        label: "Fee Management" },
  { href: "/bursar/reports",      icon: BarChart3,       label: "Financial Reports" },
  { href: "/bursar/reconciliation", icon: RefreshCw,     label: "Reconciliation" },
  { href: "/bursar/bank-statements", icon: Building2,    label: "Bank Statements" },
  { href: "/bursar/receipts",     icon: Receipt,         label: "Receipts" },
  { href: "/bursar/grouping",     icon: Layers,          label: "Grouping Studio" },
];

export function BursarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { profile, logout } = useAuth();
  const { school } = useSchool();
  const [sideOpen, setSideOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-teal-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-lg">
            {school?.name?.[0] ?? "S"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{school?.name ?? "School"}</p>
            <p className="text-teal-300 text-xs">Finance Office</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <a
                onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-teal-100 hover:bg-teal-700 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="opacity-60" />}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-teal-700">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold">
            {profile?.firstName?.[0] ?? "B"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-teal-300 text-xs capitalize">Bursar</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full text-teal-200 hover:text-white hover:bg-teal-700 justify-start gap-2"
        >
          <LogOut size={15} /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-teal-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSideOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-teal-900">
            <button
              onClick={() => setSideOpen(false)}
              className="absolute top-4 right-4 text-teal-200 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="lg:hidden bg-teal-900 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSideOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-semibold">Finance Office</span>
        </header>
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
