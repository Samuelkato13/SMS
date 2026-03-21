import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { useDataPrecache } from '@/hooks/useDataPrecache';
import { Users, TrendingUp, Star, CalendarCheck, AlertCircle, UserCheck, PenLine, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

function Stat({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CTDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id);

  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  // Pre-cache critical data to IndexedDB for offline use
  useDataPrecache(schoolId, allStudents, classes, []);

  const boys = students.filter((s: any) => s.gender === 'male').length;
  const girls = students.filter((s: any) => s.gender === 'female').length;

  const studentAvgs = students.map((s: any) => {
    const sm = marks.filter((m: any) => m.student_id === s.id);
    if (!sm.length) return { ...s, avg: 0, hasMarks: false };
    return { ...s, avg: sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length, hasMarks: true };
  });
  const withMarks = studentAvgs.filter((s: any) => s.hasMarks);
  const classAvg = withMarks.length ? (withMarks.reduce((s: number, st: any) => s + st.avg, 0) / withMarks.length).toFixed(1) : '—';
  const topStudent = withMarks.length ? [...withMarks].sort((a: any, b: any) => b.avg - a.avg)[0] : null;
  const activeExams = exams.filter((e: any) => e.status === 'published' || e.status === 'in_progress').slice(0, 3);

  if (!myClass && classes.length > 0) {
    return (
      <CTLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Class Assigned</h2>
          <p className="text-gray-500 max-w-sm">You have not been assigned to any class yet. Please contact your Head Teacher or Administrator.</p>
        </div>
      </CTLayout>
    );
  }

  return (
    <CTLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {myClass ? `${myClass.name} — Class Dashboard` : 'Class Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {myClass && <Badge className="bg-orange-100 text-orange-700 text-xs px-3 py-1">{myClass.name}</Badge>}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total Students" value={students.length} sub={`${boys} boys · ${girls} girls`} icon={Users} color="bg-orange-500" />
          <Stat label="Boys / Girls" value={`${boys}/${girls}`} sub="gender split" icon={UserCheck} color="bg-blue-500" />
          <Stat label="Class Average" value={classAvg} sub="across all marks" icon={TrendingUp} color="bg-emerald-500" />
          <Stat label="Top Student" value={topStudent ? topStudent.first_name : '—'} sub={topStudent ? `${topStudent.avg.toFixed(1)} avg` : 'No marks yet'} icon={Star} color="bg-purple-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Top Performers</h3>
              <Link href="/classteacher/students"><span className="text-xs text-orange-600 hover:underline cursor-pointer">All students →</span></Link>
            </div>
            <CardContent className="p-4 space-y-2">
              {withMarks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No marks recorded yet</p>
              ) : [...withMarks].sort((a:any,b:any)=>b.avg-a.avg).slice(0,5).map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-200 text-gray-600':i===2?'bg-orange-100 text-orange-600':'bg-gray-50 text-gray-400'}`}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(s.avg, 100)}%` }} />
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${s.avg>=50?'text-emerald-600':'text-red-500'}`}>{s.avg.toFixed(0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Active Exams</h3>
              <Link href="/classteacher/marks"><span className="text-xs text-orange-600 hover:underline cursor-pointer">Enter marks →</span></Link>
            </div>
            <CardContent className="p-4 space-y-2">
              {activeExams.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active exams currently</p>
              ) : activeExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 truncate max-w-[210px]">{exam.title}</p>
                    <p className="text-[10px] text-gray-400">{exam.exam_date} · {exam.total_marks} marks</p>
                  </div>
                  <Badge className={`text-[10px] ${exam.status==='in_progress'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700'}`}>
                    {exam.status?.replace(/_/g,' ')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800 text-sm">Quick Actions</h3></div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Mark Attendance', href: '/classteacher/attendance', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', icon: CalendarCheck },
                { label: 'Enter Marks', href: '/classteacher/marks', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', icon: PenLine },
                { label: 'Class Performance', href: '/classteacher/performance', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', icon: TrendingUp },
                { label: 'Message Parents', href: '/classteacher/communication', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', icon: MessageSquare },
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
    </CTLayout>
  );
}
