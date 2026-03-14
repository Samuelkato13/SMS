import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { canAccessRoute } from '@/utils/permissions';
import { UserRole } from '@/types';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { profile } = useAuth();
  const [location] = useLocation();

  if (!profile?.role) return null;

  const role = profile.role as UserRole;

  const allowed = allowedRoles
    ? allowedRoles.includes(role)
    : canAccessRoute(role, location);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 mb-6">
            Your role <span className="font-semibold text-gray-700">({role.replace(/_/g, ' ')})</span> does not
            have permission to view this section.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
