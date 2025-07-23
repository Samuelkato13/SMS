import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, School, DollarSign, TrendingUp } from 'lucide-react';
import { firestoreService } from '@/lib/firestore';

export const AdminDashboard = () => {
  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
    queryFn: () => firestoreService.getAllSchools(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/users/all'],
    queryFn: async () => {
      // For admin, fetch users from all schools
      const users = [];
      for (const school of schools) {
        const schoolUsers = await firestoreService.getUsersBySchool(school.id);
        users.push(...schoolUsers);
      }
      return users;
    },
    enabled: schools.length > 0,
  });

  const totalStudents = allUsers.filter(user => user.role === 'student').length;
  const totalTeachers = allUsers.filter(user => 
    ['head_teacher', 'class_teacher', 'subject_teacher'].includes(user.role)
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Schools"
          value={schools.length}
          change="+2 new this month"
          changeType="positive"
          icon={School}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Active Teachers"
          value={totalTeachers}
          change="+5 new this month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-purple-500"
        />
        <StatsCard
          title="System Health"
          value="99.9%"
          change="All systems operational"
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

      {/* Schools Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Schools Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <div key={school.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex items-center space-x-3">
                  {school.logoUrl ? (
                    <img 
                      src={school.logoUrl} 
                      alt={school.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {school.abbreviation}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{school.name}</h4>
                    <p className="text-sm text-gray-500">{school.address}</p>
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
