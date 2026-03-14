import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, BookOpen, CheckSquare, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const HeadTeacherDashboard = () => {
  const { profile } = useAuth();

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

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', profile?.schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Head Teacher Dashboard</h1>
        <p className="text-gray-500">Academic oversight and school management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Students" value={students.length} change="Across all classes" changeType="neutral" icon={Users} iconColor="bg-blue-500" />
        <StatsCard title="Total Classes" value={classes.length} change="Active classes" changeType="neutral" icon={BookOpen} iconColor="bg-green-500" />
        <StatsCard title="Subjects" value={subjects.length} change="In curriculum" changeType="neutral" icon={BookOpen} iconColor="bg-purple-500" />
        <StatsCard title="Attendance Rate" value="94.8%" change="+2.1% this week" changeType="positive" icon={CheckSquare} iconColor="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Classes</h3>
          </div>
          <div className="p-6 space-y-3">
            {classes.slice(0, 5).map((cls: any, idx: number) => (
              <div key={cls.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{cls.name}</p>
                    <p className="text-xs text-gray-400">Level {cls.level}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600">{85 - idx * 2}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="p-6 space-y-3">
            {subjects.slice(0, 5).map((subj: any, idx: number) => (
              <div key={subj.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{subj.name}</p>
                  <p className="text-xs text-gray-400">{subj.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">{88 - idx * 3}%</p>
                  <p className="text-xs text-gray-400">avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { color: 'bg-blue-500', title: 'Exam created', desc: 'Mathematics midterm — Form 2A', time: '2h ago' },
              { color: 'bg-green-500', title: 'Marks submitted', desc: 'English results — Form 1B', time: '4h ago' },
              { color: 'bg-yellow-500', title: 'Attendance updated', desc: 'Daily attendance recorded', time: '6h ago' },
              { color: 'bg-purple-500', title: 'Report generated', desc: 'Term 1 progress report', time: '1d ago' },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 ${act.color} rounded-full mt-1.5 shrink-0`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{act.title}</p>
                  <p className="text-xs text-gray-500">{act.desc}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
