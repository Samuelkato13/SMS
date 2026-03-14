import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, GraduationCap, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export const DirectorDashboard = () => {
  const { profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['/api/stats', profile?.schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const teachers = users.filter(u => ['head_teacher', 'class_teacher', 'subject_teacher'].includes(u.role));
  const totalRevenue = stats?.totalRevenue ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Director Dashboard</h1>
        <p className="text-gray-500">School-level management overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Students" value={students.length} change="+12% from last term" changeType="positive" icon={Users} iconColor="bg-blue-500" />
        <StatsCard title="Total Classes" value={classes.length} change="Active classes" changeType="neutral" icon={GraduationCap} iconColor="bg-green-500" />
        <StatsCard title="Teaching Staff" value={teachers.length} change="Active teachers" changeType="positive" icon={TrendingUp} iconColor="bg-purple-500" />
        <StatsCard title="Revenue" value={`UGX ${(totalRevenue/1000000).toFixed(1)}M`} change="Fees collected" changeType="positive" icon={DollarSign} iconColor="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Students</h3>
          </div>
          <div className="p-6 space-y-3">
            {students.slice(0, 6).map((student: any) => (
              <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${student.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-gray-400">{student.class_name}</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{student.payment_code}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Classes Overview</h3>
          </div>
          <div className="p-6 space-y-3">
            {classes.slice(0, 6).map((cls: any) => (
              <div key={cls.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{cls.name}</p>
                  <p className="text-xs text-gray-400">Level {cls.level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{students.filter(s => s.class_id === cls.id).length}</span>
                  <Badge variant="outline" className="text-xs">students</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
