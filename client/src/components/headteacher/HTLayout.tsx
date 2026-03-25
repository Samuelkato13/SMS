import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ZaabuPayLogo } from '@/components/ui/ZaabuPayLogo';
import {
  LayoutDashboard, CalendarDays, Users, UserSquare2, ClipboardList,
  BarChart3, FileText, CreditCard, Menu, LogOut, ChevronRight,
  Bell, X, TrendingUp, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

interface NavItem { label: string; href: string; icon: typeof LayoutDashboard }

const NAV: NavItem[] = [
  { label: 'Dashboard',           href: '/headteacher',                 icon: LayoutDashboard },
  { label: 'Academic Calendar',   href: '/headteacher/calendar',        icon: CalendarDays    },
  { label: 'Teacher Management',  href: '/headteacher/teachers',        icon: Users           },
  { label: 'Students',            href: '/headteacher/students',        icon: UserSquare2     },
  { label: 'Exam Management',     href: '/headteacher/exams',           icon: ClipboardList   },
  { label: 'Reports Hub',          href: '/headteacher/performance',     icon: BarChart3       },
  { label: 'Report Cards',        href: '/headteacher/report-cards',    icon: FileText        },
  { label: 'Print IDs',           href: '/headteacher/print-ids',       icon: CreditCard      },
  { label: 'Promotion Studio',    href: '/headteacher/promotion',       icon: TrendingUp      },
  { label: 'Grouping Studio',     href: '/headteacher/grouping',        icon: Layers          },
];

function NavLink({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const active = location === item.href || (item.href !== '/headteacher' && location.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
        ${active ? 'bg-emerald-600/80 text-white font-semibold shadow-sm border-l-[3px] border-[#C9A85C]' : 'text-emerald-100 hover:bg-emerald-700/50 hover:text-white border-l-[3px] border-transparent'}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm">{item.label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-60" />}
      </div>
    </Link>
  );
}

export function HTLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, logout } = useAuth();
  const { school } = useSchoolContext();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-gradient-to-b from-emerald-900 to-emerald-800 transition-transform duration-300
      `}>
        <div className="p-5 border-b border-emerald-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ZaabuPayLogo size={56} className="flex-shrink-0" variant="dark" />
            <div className="min-w-0">
              <p className="text-emerald-300 text-xs truncate">{school?.name || 'Head Teacher'}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-emerald-700/30">
          <div className="bg-emerald-700/40 rounded-lg px-3 py-2">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Signed in as</p>
            <p className="text-xs font-semibold text-white truncate">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-[10px] text-emerald-400">Head Teacher</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="p-3 border-t border-emerald-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-emerald-300 hover:text-white hover:bg-emerald-700/50 gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">{school?.name}</h1>
              <p className="text-xs text-gray-400">Head Teacher Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-[10px] text-gray-400">Head Teacher</p>
              </div>
            </div>
          </div>
        </header>

        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
