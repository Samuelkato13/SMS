import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  GraduationCap, Home, Users, BookOpen, FileText, Star,
  CheckSquare, DollarSign, CreditCard, UsersRound,
  BarChart3, School, Building2, ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  home: Home,
  users: Users,
  building: Building2,
  book: BookOpen,
  document: FileText,
  star: Star,
  check: CheckSquare,
  currency: DollarSign,
  'credit-card': CreditCard,
  'user-group': UsersRound,
  chart: BarChart3,
  'building-office': School,
  clipboard: ClipboardList,
};

const GROUP_LABELS: Record<string, string> = {
  main: '',
  academic: 'Academic',
  finance: 'Finance',
  admin: 'Administration',
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [location] = useLocation();
  const { school, schoolName } = useSchool();
  const { profile } = useAuth();
  const { getNavItems } = useRole();

  const allItems = getNavItems();

  // Group items
  const groups: Record<string, typeof allItems> = {};
  allItems.forEach(item => {
    const g = item.group || 'main';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  const groupOrder = ['main', 'academic', 'finance', 'admin'];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-xl shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-lg leading-tight">EduPay</h2>
              <p className="text-slate-400 text-xs truncate">
                {schoolName || 'School Management'}
              </p>
            </div>
          </div>
          {school?.abbreviation && (
            <div className="mt-3 bg-white/10 rounded-lg px-3 py-2 text-xs text-slate-300">
              <span className="text-slate-400">School: </span>
              <span className="font-semibold text-white">{school.abbreviation}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-4">
          {groupOrder.map(groupKey => {
            const items = groups[groupKey];
            if (!items || items.length === 0) return null;
            const label = GROUP_LABELS[groupKey];

            return (
              <div key={groupKey}>
                {label && (
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-2 mb-2">
                    {label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = iconMap[item.icon] || Home;
                    const isActive = location === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                        onClick={() => onClose()}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 px-2 py-2 rounded-xl bg-white/5">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-xs text-slate-400 capitalize truncate">
                {profile?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
