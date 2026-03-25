import { Bell, Menu, Wifi, WifiOff, LogOut } from 'lucide-react';
import { ZaabuPayLogo } from '@/components/ui/ZaabuPayLogo';
import { Button } from '@/components/ui/button';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { schoolName } = useSchool();
  const { profile, logout } = useAuth();
  const theme = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            {/* Logo icon uses the role accent color */}
            <ZaabuPayLogo size={48} className="hidden md:block" variant="light" />

            {/* Role badge */}
            {profile?.role && (
              <Badge className={`text-xs border-0 ${theme.badgeClasses}`}>
                {theme.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Online / Offline indicator */}
          <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Notification bell — accent dot uses theme color */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5 text-gray-500" />
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-accent-from, #3b82f6)' }}
            >
              3
            </span>
          </Button>

          {/* User avatar + logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, var(--theme-accent-from, #3b82f6), var(--theme-accent-to, #1d4ed8))`,
              }}
            >
              {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-800">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-[10px] text-gray-400">{profile?.username}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-500 hover:text-red-600 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
