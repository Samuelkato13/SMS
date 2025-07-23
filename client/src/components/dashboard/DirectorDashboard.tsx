import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, GraduationCap, DollarSign, TrendingUp } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export const DirectorDashboard = () => {
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

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users', profile?.schoolId],
    queryFn: () => firestoreService.getUsersBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const totalTeachers = users.filter(user => 
    ['head_teacher', 'class_teacher', 'subject_teacher'].includes(user.role)
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={students.length}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Total Classes"
          value={classes.length}
          change={`${classes.length} active classes`}
          changeType="neutral"
          icon={GraduationCap}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Teaching Staff"
          value={totalTeachers}
          change="+3 new this month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-purple-500"
        />
        <StatsCard
          title="Fees Collection"
          value="78%"
          change="UGX 45.2M collected"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Students</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{student.paymentCode}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Classes Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Classes Overview</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {classes.map((classItem) => (
                <div key={classItem.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{classItem.name}</p>
                    <p className="text-sm text-gray-500">Level {classItem.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {students.filter(s => s.classId === classItem.id).length}
                    </p>
                    <p className="text-sm text-gray-500">students</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
