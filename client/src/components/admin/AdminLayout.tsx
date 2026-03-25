import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ZaabuPayLogo } from '@/components/ui/ZaabuPayLogo';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, School, Users, CreditCard, Settings, ScrollText,
  Menu, X, LogOut, Bell, ChevronRight, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard',           href: '/admin',                     icon: LayoutDashboard },
  { label: 'Schools Management',  href: '/admin/schools',             icon: School          },
  { label: 'All Users',           href: '/admin/users',               icon: Users           },
  { label: 'Subscriptions',       href: '/admin/subscriptions',       icon: CreditCard      },
  { label: 'Signup Requests',     href: '/admin/signup-requests',     icon: ClipboardList   },
  { label: 'System Settings',     href: '/admin/settings',            icon: Settings        },
  { label: 'Audit Logs',          href: '/admin/audit-logs',          icon: ScrollText      },
];

function SidebarLink({ item, collapsed, pendingCount }: { item: NavItem; collapsed: boolean; pendingCount?: number }) {
  const [location] = useLocation();
  const active = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <div className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group
        ${active
          ? 'bg-white/15 text-white font-semibold shadow-inner border-l-[3px] border-[#C9A85C]'
          : 'text-indigo-200 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent'
        }
      `}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-sm">{item.label}</span>
            {pendingCount && pendingCount > 0 ? (
              <span className="bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingCount}
              </span>
            ) : active ? (
              <ChevronRight className="w-3 h-3 opacity-60" />
            ) : null}
          </>
        )}
        {collapsed && pendingCount && pendingCount > 0 ? (
          <span className="absolute right-1 top-1 bg-amber-400 text-gray-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {pendingCount}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, logout } = useAuth();
  const { data: signupReqs } = useQuery<any[]>({
    queryKey: ['/api/admin/signup-requests'],
    queryFn: () => fetch('/api/admin/signup-requests').then(r => r.json()),
    refetchInterval: 60000,
  });
  const pendingSignupCount = (signupReqs || []).filter((r: any) => r.status === 'pending').length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
        flex flex-col bg-indigo-900 transition-all duration-200 shadow-2xl
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#C9A85C]/30">
          <ZaabuPayLogo size={collapsed ? 32 : 64} className="flex-shrink-0" variant="dark" />
          {!collapsed && (
            <p className="text-[#C9A85C]/80 text-[11px] font-medium">SKYVALE Technologies</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-indigo-300 hover:text-white hover:bg-white/10 p-1"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <SidebarLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              pendingCount={item.href === '/admin/signup-requests' ? pendingSignupCount : undefined}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-indigo-800">
          {!collapsed ? (
            <div className="bg-indigo-800/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {profile?.firstName?.[0] ?? 'S'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                  <Badge className="bg-indigo-500 text-white text-[10px] px-1.5 py-0 mt-0.5">
                    Super Admin
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start text-indigo-300 hover:text-white hover:bg-white/10 text-xs gap-2"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full text-indigo-300 hover:text-white hover:bg-white/10 p-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-gray-500"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500">ZaabuPay · SKYVALE Technologies Uganda Limited</p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{profile?.firstName?.[0] ?? 'S'}</span>
            </div>
            <span className="hidden sm:block font-medium">{profile?.firstName} {profile?.lastName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
