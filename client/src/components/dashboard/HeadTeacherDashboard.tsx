import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, BookOpen, CheckSquare, TrendingUp } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export const HeadTeacherDashboard = () => {
  const { profile } = useAuth();

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => firestoreService.getStudentsBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => firestoreService.getClassesBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects', profile?.schoolId],
    queryFn: () => firestoreService.getSubjectsBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={students.length}
          change="Across all classes"
          changeType="neutral"
          icon={Users}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Total Classes"
          value={classes.length}
          change="Active classes"
          changeType="neutral"
          icon={BookOpen}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Subjects"
          value={subjects.length}
          change="In curriculum"
          changeType="neutral"
          icon={BookOpen}
          iconColor="bg-purple-500"
        />
        <StatsCard
          title="Attendance Rate"
          value="94.8%"
          change="+2.1% this week"
          changeType="positive"
          icon={CheckSquare}
          iconColor="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      {/* Academic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Classes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {classes.slice(0, 5).map((classItem, index) => (
                <div key={classItem.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{classItem.name}</p>
                      <p className="text-sm text-gray-500">Level {classItem.level}</p>
                    </div>
                  </div>
                  <span className="font-medium text-green-600">
                    {85 - index * 2}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {subjects.slice(0, 5).map((subject, index) => (
                <div key={subject.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{subject.name}</p>
                    <p className="text-sm text-gray-500">{subject.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-primary">
                      {88 - index * 3}%
                    </span>
                    <p className="text-sm text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Exam created</p>
                  <p className="text-xs text-gray-500">Mathematics midterm for Form 2A</p>
                  <p className="text-xs text-gray-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Marks submitted</p>
                  <p className="text-xs text-gray-500">English results for Form 1B</p>
                  <p className="text-xs text-gray-400">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Attendance updated</p>
                  <p className="text-xs text-gray-500">Daily attendance recorded</p>
                  <p className="text-xs text-gray-400">6 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
