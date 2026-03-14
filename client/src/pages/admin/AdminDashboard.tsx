import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { School, Users, TrendingUp, CreditCard, ArrowUpRight, Clock, Activity, Bell, ArrowRight, CheckCircle2 } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub: string;
  icon: typeof School; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              {sub}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  professional: 'bg-blue-100 text-blue-700',
  basic: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/admin/stats'],
  });
  const { data: schools, isLoading: schoolsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/schools'],
  });
  const { data: logs } = useQuery<any[]>({
    queryKey: ['/api/admin/audit-logs'],
  });
  const { data: signupRequests } = useQuery<any[]>({
    queryKey: ['/api/admin/signup-requests'],
    queryFn: () => fetch('/api/admin/signup-requests').then(r => r.json()),
  });

  const recentSchools = (schools || []).slice(0, 5);
  const recentLogs = (logs || []).slice(0, 6);
  const pendingRequests = (signupRequests || []).filter((r: any) => r.status === 'pending');
  const recentRequests = (signupRequests || []).slice(0, 4);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Pending Signup Requests Alert */}
        {pendingRequests.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {pendingRequests.length} pending school {pendingRequests.length === 1 ? 'request' : 'requests'} awaiting approval
                </p>
                <p className="text-xs text-amber-700">
                  {pendingRequests.map((r: any) => r.school_name).slice(0, 3).join(', ')}
                  {pendingRequests.length > 3 ? ` +${pendingRequests.length - 3} more` : ''}
                </p>
              </div>
            </div>
            <Link href="/admin/signup-requests">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                Review <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24" />
                    <div className="h-7 bg-gray-200 rounded w-16" />
                    <div className="h-3 bg-gray-200 rounded w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Schools"
              value={stats?.totalSchools ?? 0}
              sub={`+${stats?.newSchoolsThisMonth ?? 0} this month`}
              icon={School}
              color="bg-indigo-500"
            />
            <StatCard
              label="Total Users"
              value={stats?.totalUsers ?? 0}
              sub="across all schools"
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              label="Monthly Revenue"
              value={`UGX ${((stats?.monthlyRevenue ?? 0) / 1000).toFixed(0)}K`}
              sub="from active subscriptions"
              icon={TrendingUp}
              color="bg-green-500"
            />
            <StatCard
              label="Active Subscriptions"
              value={stats?.activeSubscriptions ?? 0}
              sub={`${stats?.expiringThisWeek ?? 0} expiring soon`}
              icon={CreditCard}
              color="bg-orange-500"
            />
          </div>
        )}

        {/* Bottom grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent schools */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Schools</CardTitle>
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {schoolsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-32" />
                        <div className="h-2.5 bg-gray-200 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSchools.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No schools yet</p>
              ) : (
                <div className="space-y-2.5">
                  {recentSchools.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 text-xs font-bold">
                          {s.abbreviation?.slice(0, 2) ?? s.name?.slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.user_count ?? 0} users</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${PLAN_COLORS[s.plan ?? 'trial'] ?? 'bg-gray-100 text-gray-600'}`}>
                          {s.plan ?? 'trial'}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[s.status ?? 'active'] ?? 'bg-gray-100 text-gray-600'}`}>
                          {s.status ?? 'active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent audit logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Recent Activity</CardTitle>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log: any) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-800">
                          <span className="font-medium">{log.user_email}</span>{' '}
                          <span className="text-gray-500">{log.action}</span>
                        </p>
                        {log.details && (
                          <p className="text-[11px] text-gray-400 truncate">{log.details}</p>
                        )}
                        <p className="text-[11px] text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
