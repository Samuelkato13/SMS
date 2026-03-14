import { useAuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useAuthContext();
  
  return {
    ...context,
    isAuthenticated: !!context.user,
    isSuperAdmin: context.profile?.role === 'super_admin',
    isAdmin: context.profile?.role === 'admin',
    isDirector: context.profile?.role === 'director',
    isTeacher: ['head_teacher', 'class_teacher', 'subject_teacher'].includes(context.profile?.role || ''),
    isBursar: context.profile?.role === 'bursar',
  };
};
