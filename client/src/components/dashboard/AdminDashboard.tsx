import { useQuery } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { PerformanceChart } from '../charts/PerformanceChart';
import { AttendanceChart } from '../charts/AttendanceChart';
import { Users, School, DollarSign, Activity, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const AdminDashboard = () => {
  const { profile } = useAuth();

  const { data: schools = [] } = useQuery({
    queryKey: ['/api/schools'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats', profile?.schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Admin Dashboard</h1>
        <p className="text-gray-500">Full system overview — all schools and data</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Schools"
          value={schools.length}
          change="+2 this month"
          changeType="positive"
          icon={School}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Total Students"
          value={(stats?.totalStudents ?? 0).toLocaleString()}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="bg-green-500"
        />
        <StatsCard
          title="Total Revenue"
          value={`UGX ${((stats?.totalRevenue ?? 0) / 1000).toFixed(0)}K`}
          change="+8% this term"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-orange-500"
        />
        <StatsCard
          title="System Health"
          value="99.9%"
          change="All systems operational"
          changeType="positive"
          icon={Activity}
          iconColor="bg-purple-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <AttendanceChart />
      </div>

      {/* Schools Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Schools Overview</h3>
            <p className="text-sm text-gray-500">{schools.length} schools managed</p>
          </div>
          <Link href="/schools">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add School
            </Button>
          </Link>
        </div>
        <div className="p-6">
          {schools.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No schools found. Add your first school.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools.map((school: any) => (
                <div key={school.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{school.abbreviation}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{school.name}</h4>
                      <p className="text-xs text-gray-400 truncate">{school.address}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{school.subscription_plan || 'starter'}</Badge>
                    <span className="text-xs text-gray-400">{school.student_count || 0} students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Staff Members ({users.length})</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {users.slice(0, 6).map((user: any) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <Badge className="text-xs capitalize" variant="outline">
                  {user.role?.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
