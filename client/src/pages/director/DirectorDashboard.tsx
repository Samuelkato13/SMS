import { useQuery } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserSquare2, DollarSign, TrendingUp, ArrowUpRight, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function StatCard({ label, value, sub, icon: Icon, color, trend }: any) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />{sub}
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

export default function DirectorDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/stats', schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ['/api/payments', schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const totalRevenue = payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount), 0);
  const activeStudents = students.filter((s: any) => s.is_active !== false).length;
  const activeStaff = users.filter((u: any) => u.is_active && u.role !== 'super_admin').length;
  const recentStudents = [...students].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  const recentPayments = [...payments].filter((p: any) => p.status === 'completed').sort((a: any, b: any) => new Date(b.created_at ?? b.paid_at).getTime() - new Date(a.created_at ?? a.paid_at).getTime()).slice(0, 6);

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Director Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={activeStudents} sub={`${classes.length} classes`} icon={UserSquare2} color="bg-blue-500" />
          <StatCard label="Total Staff" value={activeStaff} sub="all departments" icon={Users} color="bg-green-500" />
          <StatCard label="Fee Collection" value={`UGX ${(totalRevenue / 1000).toFixed(0)}K`} sub={`${payments.filter((p: any) => p.status === 'completed').length} payments`} icon={DollarSign} color="bg-orange-500" />
          <StatCard label="Total Classes" value={classes.length} sub={`${students.length} enrolled`} icon={BookOpen} color="bg-purple-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Recent students */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><UserSquare2 className="w-4 h-4 text-blue-500" />Recent Students</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              {recentStudents.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">No students yet</p> : (
                <div className="space-y-2.5">
                  {recentStudents.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xs font-bold">{s.first_name?.[0] ?? 'S'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">{s.payment_code ?? 'No ID'}</p>
                      </div>
                      <Badge className={s.is_active !== false ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                        {s.is_active !== false ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" />Recent Payments</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              {recentPayments.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">No payments yet</p> : (
                <div className="space-y-2.5">
                  {recentPayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.payment_code ?? 'N/A'}</p>
                        <p className="text-xs text-gray-400">{p.payment_method?.replace('_', ' ')} · {p.provider ?? ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-green-700">UGX {Number(p.amount).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle></CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Add Student', href: '/director/students', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: UserSquare2 },
                { label: 'Add Staff', href: '/director/staff', color: 'bg-green-50 text-green-700 border-green-100', icon: Users },
                { label: 'School Setup', href: '/director/school-setup', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: BookOpen },
                { label: 'Financial', href: '/director/financial', color: 'bg-orange-50 text-orange-700 border-orange-100', icon: TrendingUp },
              ].map(a => (
                <a key={a.href} href={a.href} className={`flex items-center gap-2 p-3 rounded-lg border ${a.color} text-sm font-medium transition-all hover:shadow-sm`}>
                  <a.icon className="w-4 h-4" />{a.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DirectorLayout>
  );
}
