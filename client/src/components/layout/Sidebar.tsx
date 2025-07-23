import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  Home,
  Users,
  Building,
  BookOpen,
  FileText,
  Star,
  CheckSquare,
  DollarSign,
  CreditCard,
  UsersRound,
  BarChart3,
  School,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  home: Home,
  users: Users,
  building: Building,
  book: BookOpen,
  document: FileText,
  star: Star,
  check: CheckSquare,
  currency: DollarSign,
  'credit-card': CreditCard,
  'user-group': UsersRound,
  chart: BarChart3,
  'building-office': School,
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [location] = useLocation();
  const { school, schoolLogo, schoolName } = useSchool();
  const { profile } = useAuth();
  const { getNavItems } = useRole();

  const navigationItems = getNavItems();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* School Branding */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {schoolLogo ? (
              <img 
                src={schoolLogo} 
                alt={schoolName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {school?.abbreviation || 'SM'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">
                {schoolName || 'School Management'}
              </h2>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role?.replace('_', ' ')} Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || Home;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => onClose()}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile Section */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.firstName} {profile?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile?.username}
                </p>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};
