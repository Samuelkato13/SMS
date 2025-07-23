import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { DirectorDashboard } from '@/components/dashboard/DirectorDashboard';
import { HeadTeacherDashboard } from '@/components/dashboard/HeadTeacherDashboard';
import { ClassTeacherDashboard } from '@/components/dashboard/ClassTeacherDashboard';
import { SubjectTeacherDashboard } from '@/components/dashboard/SubjectTeacherDashboard';
import { BursarDashboard } from '@/components/dashboard/BursarDashboard';

export default function Dashboard() {
  const { profile } = useAuth();

  const renderDashboard = () => {
    switch (profile?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'director':
        return <DirectorDashboard />;
      case 'head_teacher':
        return <HeadTeacherDashboard />;
      case 'class_teacher':
        return <ClassTeacherDashboard />;
      case 'subject_teacher':
        return <SubjectTeacherDashboard />;
      case 'bursar':
        return <BursarDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600">Your dashboard is being prepared...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      {renderDashboard()}
    </div>
  );
}
