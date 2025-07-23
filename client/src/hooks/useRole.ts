import { useAuth } from './useAuth';
import { hasPermission, getNavigationItems } from '@/utils/permissions';
import { UserRole } from '@/types';

export const useRole = () => {
  const { profile } = useAuth();
  
  const checkPermission = (resource: string, action: string) => {
    if (!profile?.role) return false;
    return hasPermission(profile.role as UserRole, resource as any, action as any);
  };

  const getNavItems = () => {
    if (!profile?.role) return [];
    return getNavigationItems(profile.role as UserRole);
  };

  return {
    role: profile?.role,
    checkPermission,
    getNavItems,
    canCreate: (resource: string) => checkPermission(resource, 'create'),
    canRead: (resource: string) => checkPermission(resource, 'read'),
    canUpdate: (resource: string) => checkPermission(resource, 'update'),
    canDelete: (resource: string) => checkPermission(resource, 'delete'),
  };
};
