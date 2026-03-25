import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ZaabuPayLogo } from '@/components/ui/ZaabuPayLogo';
import {
  LayoutDashboard, Settings, Users, UserSquare2, BookOpen, DollarSign,
  BarChart3, FileText, PieChart, Menu, LogOut, ChevronRight, Bell,
  TrendingUp, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

interface NavItem { label: string; href: string; icon: typeof LayoutDashboard }

const NAV: NavItem[] = [
  { label: 'Dashboard',          href: '/director',                  icon: LayoutDashboard },
  { label: 'School Setup',       href: '/director/school-setup',     icon: Settings        },
  { label: 'Staff Management',   href: '/director/staff',            icon: Users           },
  { label: 'Student Management', href: '/director/students',         icon: UserSquare2     },
  { label: 'Academic Setup',     href: '/director/academic',         icon: BookOpen        },
  { label: 'Fees Management',    href: '/director/fees',             icon: DollarSign      },
  { label: 'Reports',            href: '/director/reports',          icon: BarChart3       },
  { label: 'Report Studio',      href: '/director/report-studio',    icon: FileText        },
  { label: 'Financial Summary',  href: '/director/financial',        icon: PieChart        },
  { label: 'Promotion Studio',   href: '/director/promotion',        icon: TrendingUp      },
  { label: 'Grouping Studio',    href: '/director/grouping',         icon: Layers          },
];

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [location] = useLocation();
  const active = location === item.href || (item.href !== '/director' && location.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <div className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group
        ${active ? 'bg-blue-600/80 text-white font-semibold shadow-sm border-l-[3px] border-[#C9A85C]' : 'text-blue-100 hover:bg-blue-700/50 hover:text-white border-l-[3px] border-transparent'}
      `}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-sm">{item.label}</span>
            {active && <ChevronRight className="w-3 h-3 opacity-60" />}
          </>
        )}
      </div>
    </Link>
  );
}

export function DirectorLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, logout } = useAuth();
  const { school } = useSchoolContext();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`
        ${collapsed ? 'w-16' : 'w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
        flex flex-col bg-gradient-to-b from-blue-800 to-blue-900 transition-all duration-200 shadow-xl
      `}>
        {/* School brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#C9A85C]/30">
          <ZaabuPayLogo size={56} className="flex-shrink-0" variant="dark" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-xs leading-tight truncate">{school?.name ?? 'My School'}</p>
              <p className="text-[#C9A85C]/80 text-[10px] font-medium">Director Panel</p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="ml-auto text-blue-300 hover:text-white hover:bg-blue-700 p-1 flex-shrink-0" onClick={() => setCollapsed(!collapsed)}>
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => <SidebarLink key={item.href} item={item} collapsed={collapsed} />)}
        </nav>

        <div className="p-3 border-t border-blue-700">
          {!collapsed ? (
            <div className="bg-blue-800/60 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{profile?.firstName?.[0] ?? 'D'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{profile?.firstName} {profile?.lastName}</p>
                  <Badge className="bg-blue-500 text-white text-[9px] px-1 py-0">Director</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-blue-300 hover:text-white hover:bg-blue-700 text-xs gap-2 h-7">
                <LogOut className="w-3 h-3" />Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={logout} className="w-full text-blue-300 hover:text-white hover:bg-blue-700 p-2">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b px-5 py-3 flex items-center gap-3 shadow-sm flex-shrink-0">
          <Button variant="ghost" size="sm" className="lg:hidden text-gray-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500">{school?.name} · Academic Management System</p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400"><Bell className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{profile?.firstName?.[0] ?? 'D'}</span>
            </div>
            <span className="hidden sm:block text-gray-700 font-medium">{profile?.firstName} {profile?.lastName}</span>
          </div>
        </header>
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
