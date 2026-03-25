import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, CalendarCheck, PenLine,
  BarChart2, FileText, MessageSquare, Menu, LogOut, ChevronRight,
  BookOpen, Bell, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useQuery } from '@tanstack/react-query';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

interface NavItem { label: string; href: string; icon: typeof LayoutDashboard }

const NAV: NavItem[] = [
  { label: 'My Class Dashboard', href: '/classteacher',                icon: LayoutDashboard },
  { label: 'My Students',        href: '/classteacher/students',       icon: Users           },
  { label: 'Attendance',         href: '/classteacher/attendance',     icon: CalendarCheck   },
  { label: 'Enter Marks',        href: '/classteacher/marks',          icon: PenLine         },
  { label: 'Class Performance',  href: '/classteacher/performance',    icon: BarChart2       },
  { label: 'Reports',            href: '/classteacher/reports',        icon: FileText        },
  { label: 'Report Cards',       href: '/classteacher/report-cards',   icon: FileText        },
  { label: 'Parent Communication', href: '/classteacher/communication',icon: MessageSquare   },
];

function NavLink({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const active = location === item.href || (item.href !== '/classteacher' && location.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
        ${active ? 'bg-orange-500 text-white font-semibold shadow-sm' : 'text-orange-100 hover:bg-orange-700/50 hover:text-white'}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm">{item.label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-60" />}
      </div>
    </Link>
  );
}

export function CTLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, logout } = useAuth();
  const { school } = useSchoolContext();
  const schoolId = profile?.schoolId;

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-gradient-to-b from-orange-900 to-orange-800 transition-transform duration-300
      `}>
        <div className="p-5 border-b border-orange-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-orange-600 rounded-xl flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight">ZaabuPay</p>
              <p className="text-orange-300 text-xs truncate">{myClass ? myClass.name : 'Class Teacher'}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-orange-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-orange-700/30">
          <div className="bg-orange-700/40 rounded-lg px-3 py-2">
            <p className="text-[10px] text-orange-400 uppercase tracking-wider">Class Teacher</p>
            <p className="text-xs font-semibold text-white truncate">{profile?.firstName} {profile?.lastName}</p>
            {myClass && <p className="text-[10px] text-orange-300">{myClass.name}</p>}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => <NavLink key={item.href} item={item} />)}
        </nav>

        <div className="p-3 border-t border-orange-700/50">
          <Button
            variant="ghost" size="sm" onClick={logout}
            className="w-full justify-start text-orange-300 hover:text-white hover:bg-orange-700/50 gap-2"
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
              <p className="text-xs text-gray-400">Class Teacher Portal{myClass ? ` · ${myClass.name}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-[10px] text-gray-400">Class Teacher</p>
              </div>
            </div>
          </div>
        </header>
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
