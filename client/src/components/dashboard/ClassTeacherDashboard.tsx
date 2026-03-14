import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, Star, CheckSquare, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export const ClassTeacherDashboard = () => {
  const { profile } = useAuth();

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Teacher Dashboard</h1>
        <p className="text-gray-500">Manage your classes and students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="My Students" value={students.length} change="In your classes" changeType="neutral" icon={Users} iconColor="bg-blue-500" />
        <StatsCard title="My Classes" value={classes.length} change="Classes assigned" changeType="neutral" icon={CheckSquare} iconColor="bg-green-500" />
        <StatsCard title="Class Average" value="85.2%" change="+3.1% from last term" changeType="positive" icon={Star} iconColor="bg-purple-500" />
        <StatsCard title="Attendance" value="96.5%" change="This week" changeType="positive" icon={CheckSquare} iconColor="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">My Classes</h3>
            <Button size="sm" variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />Generate Report
            </Button>
          </div>
          <div className="p-6 space-y-4">
            {classes.slice(0, 4).map((cls: any) => (
              <div key={cls.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{cls.name}</h4>
                    <p className="text-xs text-gray-400">Level {cls.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{students.filter((s: any) => s.class_id === cls.id).length}</p>
                    <p className="text-xs text-gray-400">students</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/attendance">
                    <Button size="sm" variant="outline" className="text-xs">Take Attendance</Button>
                  </Link>
                  <Link href="/students">
                    <Button size="sm" variant="outline" className="text-xs">View Students</Button>
                  </Link>
                </div>
              </div>
            ))}
            {classes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No classes assigned yet</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">My Students</h3>
          </div>
          <div className="p-6 space-y-3">
            {students.slice(0, 7).map((student: any) => (
              <div key={student.id} className="flex items-center justify-between">
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/attendance">
              <Button className="w-full h-20 flex flex-col items-center justify-center gap-2">
                <CheckSquare className="w-6 h-6" />
                <span className="text-xs">Take Attendance</span>
              </Button>
            </Link>
            <Link href="/marks">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                <Star className="w-6 h-6" />
                <span className="text-xs">Record Marks</span>
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                <FileText className="w-6 h-6" />
                <span className="text-xs">Generate Report</span>
              </Button>
            </Link>
            <Link href="/students">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                <Users className="w-6 h-6" />
                <span className="text-xs">View Students</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
