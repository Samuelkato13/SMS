import { Bell, Menu, Wifi, WifiOff, LogOut, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  director: 'Director',
  head_teacher: 'Head Teacher',
  class_teacher: 'Class Teacher',
  subject_teacher: 'Subject Teacher',
  bursar: 'Bursar',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  director: 'bg-orange-100 text-orange-700',
  head_teacher: 'bg-blue-100 text-blue-700',
  class_teacher: 'bg-green-100 text-green-700',
  subject_teacher: 'bg-purple-100 text-purple-700',
  bursar: 'bg-teal-100 text-teal-700',
};

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { schoolName } = useSchool();
  const { profile, logout } = useAuth();
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

  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] || profile.role : '';
  const roleColor = profile?.role ? ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-700' : '';

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-1.5 rounded-lg">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-800">{schoolName || 'EduPay'}</span>
            </div>
            {profile?.role && (
              <Badge className={`text-xs ${roleColor} border-0`}>
                {roleLabel}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">3</span>
          </Button>

          <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-800">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-[10px] text-gray-400">{profile?.username}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-red-600 ml-1">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
