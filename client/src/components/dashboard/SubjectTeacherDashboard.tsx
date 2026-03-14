import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { Users, BookOpen, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export const SubjectTeacherDashboard = () => {
  const { profile } = useAuth();

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', profile?.schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${profile?.schoolId}`).then(r => r.json()),
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
        <h1 className="text-2xl font-bold text-gray-900">Subject Teacher Dashboard</h1>
        <p className="text-gray-500">Manage subjects, exams, and student marks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="My Subjects" value={subjects.length} change="Currently teaching" changeType="neutral" icon={BookOpen} iconColor="bg-blue-500" />
        <StatsCard title="My Students" value={students.length} change="Across all subjects" changeType="neutral" icon={Users} iconColor="bg-green-500" />
        <StatsCard title="Subject Average" value="87.3%" change="+4.2% improvement" changeType="positive" icon={Star} iconColor="bg-purple-500" />
        <StatsCard title="Pass Rate" value="92%" change="This term" changeType="positive" icon={TrendingUp} iconColor="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="p-6 space-y-3">
            {subjects.map((subj: any, idx: number) => (
              <div key={subj.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <h4 className="font-medium text-gray-900">{subj.name}</h4>
                  <p className="text-xs text-gray-400">{subj.code}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{90 - idx * 2}%</p>
                    <p className="text-xs text-gray-400">avg</p>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Active</Badge>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No subjects assigned</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">My Subjects Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subj: any) => (
              <div key={subj.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{subj.name}</h4>
                    <p className="text-xs text-gray-400">{subj.code}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">Active</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-3">{subj.description || 'Core curriculum subject'}</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="font-semibold text-gray-900">{students.length}</p>
                    <p className="text-xs text-gray-400">Students</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="font-semibold text-green-600">88%</p>
                    <p className="text-xs text-gray-400">Avg Score</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="font-semibold text-blue-600">3</p>
                    <p className="text-xs text-gray-400">Exams</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/exams">
                    <Button size="sm" variant="outline" className="text-xs">Add Exam</Button>
                  </Link>
                  <Link href="/marks">
                    <Button size="sm" variant="outline" className="text-xs">Enter Marks</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
