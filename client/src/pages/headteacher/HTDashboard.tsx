import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { BookOpen, Users, ClipboardList, TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HTDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/stats', schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const teachers = users.filter((u: any) => ['class_teacher', 'subject_teacher', 'head_teacher'].includes(u.role));
  const examsThisTerm = exams.filter((e: any) => e.term === 'Term 1' || e.status === 'published' || e.status === 'in_progress');
  const passedMarks = marks.filter((m: any) => !['F8'].includes(m.grade));
  const avgAttendance = stats?.presentToday && stats?.totalStudents
    ? Math.round((stats.presentToday / stats.totalStudents) * 100)
    : 0;

  const activeExams = exams.filter((e: any) => e.status === 'in_progress' || e.status === 'published').slice(0, 4);
  const classesWithNoTeacher = classes.filter((c: any) => !c.class_teacher_id);

  return (
    <HTLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Head Teacher Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Classes" value={classes.length} sub={`${stats?.totalStudents || 0} students`} icon={BookOpen} color="bg-emerald-500" />
          <StatCard label="Total Teachers" value={teachers.length} sub="active staff" icon={Users} color="bg-blue-500" />
          <StatCard label="Total Subjects" value={subjects.length} sub="on curriculum" icon={ClipboardList} color="bg-purple-500" />
          <StatCard label="Exams This Term" value={examsThisTerm.length} sub={`${exams.filter((e:any)=>e.status==='in_progress').length} active`} icon={Calendar} color="bg-orange-500" />
          <StatCard label="Avg Attendance" value={`${avgAttendance}%`} sub="today's rate" icon={TrendingUp} color="bg-teal-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Exam Status Overview</h3>
              <Link href="/headteacher/exams"><span className="text-xs text-emerald-600 hover:underline cursor-pointer">View all →</span></Link>
            </div>
            <CardContent className="p-4 space-y-2">
              {activeExams.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active exams</p>
              ) : activeExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[220px]">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.exam_date} · {exam.exam_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <Badge className={`text-xs ${
                    exam.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    exam.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                    exam.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {exam.status?.replace(/_/g, ' ') || 'draft'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Class Overview</h3>
              <Link href="/headteacher/teachers"><span className="text-xs text-emerald-600 hover:underline cursor-pointer">Manage →</span></Link>
            </div>
            <CardContent className="p-4 space-y-2">
              {classes.slice(0, 6).map((cls: any) => (
                <div key={cls.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cls.name}</p>
                      <p className="text-xs text-gray-400">{cls.student_count || 0} students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cls.teacher_name ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="w-3 h-3" />{cls.teacher_name.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />No teacher
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {classesWithNoTeacher.length > 0 && (
                <div className="mt-2 bg-amber-50 rounded-lg p-2.5 text-xs text-amber-700">
                  ⚠ {classesWithNoTeacher.length} class{classesWithNoTeacher.length > 1 ? 'es have' : ' has'} no class teacher assigned
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Quick Actions</h3>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Assign Class Teacher', href: '/headteacher/teachers', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', icon: Users },
                { label: 'Create Exam', href: '/headteacher/exams', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', icon: ClipboardList },
                { label: 'View Report Cards', href: '/headteacher/report-cards', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', icon: ClipboardList },
                { label: 'Print Student IDs', href: '/headteacher/print-ids', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', icon: Calendar },
              ].map(({ label, href, color, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className={`p-3 rounded-xl cursor-pointer transition-colors ${color} flex items-center gap-2`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </HTLayout>
  );
}
