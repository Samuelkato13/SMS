import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { Users, BookOpen, Star, TrendingUp } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export const SubjectTeacherDashboard = () => {
  const { profile } = useAuth();

  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects/teacher', profile?.id],
    queryFn: () => firestoreService.getSubjectsBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const mySubjects = subjects.filter(subject => subject.teacherId === profile?.id);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="My Subjects"
          value={mySubjects.length}
          change="Currently teaching"
          changeType="neutral"
          icon={BookOpen}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="My Students"
          value="156"
          change="Across all subjects"
          changeType="neutral"
          icon={Users}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Subject Average"
          value="87.3%"
          change="+4.2% improvement"
          changeType="positive"
          icon={Star}
          iconColor="bg-purple-500"
        />
        <StatsCard
          title="Performance"
          value="92%"
          change="Pass rate"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mySubjects.map((subject, index) => (
                <div key={subject.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{subject.name}</h4>
                    <p className="text-sm text-gray-500">{subject.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">{90 - index * 2}%</p>
                    <p className="text-sm text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subject Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">My Subjects Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mySubjects.map((subject) => (
              <div key={subject.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{subject.name}</h4>
                    <p className="text-sm text-gray-500">{subject.code}</p>
                  </div>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{subject.description}</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-medium text-gray-900">45</p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div>
                    <p className="font-medium text-green-600">88%</p>
                    <p className="text-xs text-gray-500">Avg Score</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600">12</p>
                    <p className="text-xs text-gray-500">Assessments</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
