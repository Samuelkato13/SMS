import { useQuery } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users2, TrendingUp, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function DirectorReports() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: students = [] } = useQuery<any[]>({ queryKey: ['/api/students', schoolId], queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ['/api/classes', schoolId], queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ['/api/users', schoolId], queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ['/api/payments', schoolId], queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: marks = [] } = useQuery<any[]>({ queryKey: ['/api/marks', schoolId], queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const activeStudents = students.filter((s: any) => s.is_active !== false);
  const maleCount = activeStudents.filter((s: any) => s.gender === 'Male').length;
  const femaleCount = activeStudents.filter((s: any) => s.gender === 'Female').length;

  // Students per class
  const studentsPerClass = classes.map((c: any) => ({
    name: c.name,
    count: activeStudents.filter((s: any) => s.class_id === c.id).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  const maxStudents = Math.max(...studentsPerClass.map(c => c.count), 1);

  // Monthly enrollment (last 6 months)
  const now = new Date();
  const monthlyEnroll = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-UG', { month: 'short' });
    const count = students.filter((s: any) => {
      const sd = new Date(s.created_at);
      return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  }).reverse();
  const maxEnroll = Math.max(...monthlyEnroll.map(m => m.count), 1);

  // Average marks
  const avgMark = marks.length > 0 ? marks.reduce((s: number, m: any) => s + Number(m.marks_obtained ?? 0), 0) / marks.length : 0;
  const passRate = marks.length > 0 ? (marks.filter((m: any) => (m.marks_obtained / m.total_marks) >= 0.5).length / marks.length) * 100 : 0;

  // Staff breakdown
  const staffRoles = ['head_teacher', 'class_teacher', 'subject_teacher', 'bursar', 'admin'];
  const staffBreakdown = staffRoles.map(role => ({
    label: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: users.filter((u: any) => u.role === role).length,
  })).filter(s => s.count > 0);

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">School Reports</h1>
          <p className="text-sm text-gray-500">Performance analytics and school statistics</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Enrolled', value: activeStudents.length, icon: Users2, color: 'bg-blue-500' },
            { label: 'Staff Members', value: users.filter((u: any) => !['director','super_admin'].includes(u.role)).length, icon: Users2, color: 'bg-green-500' },
            { label: 'Avg Score', value: `${avgMark.toFixed(1)}%`, icon: TrendingUp, color: 'bg-purple-500' },
            { label: 'Pass Rate', value: `${passRate.toFixed(1)}%`, icon: BookOpen, color: 'bg-orange-500' },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}><stat.icon className="w-4 h-4 text-white" /></div>
                <div><p className="text-xs text-gray-500">{stat.label}</p><p className="text-lg font-bold text-gray-900">{stat.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Students per class */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" />Students per Class</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {studentsPerClass.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No data</p> : (
                <div className="space-y-2.5">
                  {studentsPerClass.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <p className="text-xs text-gray-600 w-16 flex-shrink-0">{c.name}</p>
                      <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-md transition-all" style={{ width: `${(c.count / maxStudents) * 100}%` }} />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 w-6 text-right">{c.count}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly enrollment */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" />Monthly Enrollment</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-end gap-3 h-32">
                {monthlyEnroll.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-600 font-medium">{m.count}</p>
                    <div className="w-full bg-gray-100 rounded-t overflow-hidden" style={{ height: '72px' }}>
                      <div className="w-full bg-green-500 rounded-t transition-all duration-300" style={{ height: `${(m.count / maxEnroll) * 72}px`, marginTop: `${72 - (m.count / maxEnroll) * 72}px` }} />
                    </div>
                    <p className="text-[10px] text-gray-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gender distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Gender Distribution</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                {[{ label: 'Male', count: maleCount, color: 'bg-blue-500', pct: activeStudents.length > 0 ? (maleCount / activeStudents.length) * 100 : 0 },
                  { label: 'Female', count: femaleCount, color: 'bg-pink-400', pct: activeStudents.length > 0 ? (femaleCount / activeStudents.length) * 100 : 0 }].map(g => (
                  <div key={g.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{g.label}</span>
                      <span className="font-medium">{g.count} ({g.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full"><div className={`h-3 ${g.color} rounded-full`} style={{ width: `${g.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Staff breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Staff by Role</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {staffBreakdown.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No staff data</p> : (
                <div className="space-y-2.5">
                  {staffBreakdown.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">{s.label}</p>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DirectorLayout>
  );
}
