import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { BarChart3, TrendingUp, Users, BookOpen, Download, Award, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

function GradeBar({ grade, count, total }: { grade: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colors: Record<string,string> = { D1:'bg-emerald-500', D2:'bg-green-500', C3:'bg-teal-500', C4:'bg-blue-500', C5:'bg-indigo-400', C6:'bg-yellow-400', P7:'bg-orange-400', F8:'bg-red-500' };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-gray-700 w-5">{grade}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors[grade] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
    </div>
  );
}

export default function PerformanceReports() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');

  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance', schoolId],
    queryFn: () => fetch(`/api/attendance?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const filteredMarks = marks.filter((m: any) => {
    if (selectedExam !== 'all' && m.exam_id !== selectedExam) return false;
    if (selectedClass !== 'all' && m.class_id !== selectedClass) return false;
    return true;
  });

  const GRADES = ['D1','D2','C3','C4','C5','C6','P7','F8'];
  const gradeCount: Record<string,number> = {};
  GRADES.forEach(g => { gradeCount[g] = filteredMarks.filter((m:any) => m.grade === g).length; });

  const passed = filteredMarks.filter((m:any) => m.grade !== 'F8').length;
  const failed = filteredMarks.filter((m:any) => m.grade === 'F8').length;
  const passRate = filteredMarks.length > 0 ? ((passed / filteredMarks.length) * 100).toFixed(1) : '0.0';
  const avgScore = filteredMarks.length > 0
    ? (filteredMarks.reduce((s:number, m:any) => s + Number(m.marks_obtained), 0) / filteredMarks.length).toFixed(1)
    : '0.0';

  const classPerformance = classes.map((cls: any) => {
    const classMarks = filteredMarks.filter((m: any) => m.class_id === cls.id);
    const avg = classMarks.length > 0 ? classMarks.reduce((s:number,m:any)=>s+Number(m.marks_obtained),0)/classMarks.length : 0;
    const pass = classMarks.filter((m:any)=>m.grade!=='F8').length;
    const passRate = classMarks.length > 0 ? ((pass/classMarks.length)*100).toFixed(0) : '—';
    return { ...cls, avg: avg.toFixed(1), passRate, count: classMarks.length };
  }).filter(c => c.count > 0).sort((a:any,b:any) => parseFloat(b.avg)-parseFloat(a.avg));

  const subjectPerformance = subjects.map((sub: any) => {
    const subMarks = filteredMarks.filter((m: any) => m.subject_id === sub.id);
    const avg = subMarks.length > 0 ? subMarks.reduce((s:number,m:any)=>s+Number(m.marks_obtained),0)/subMarks.length : 0;
    const pass = subMarks.filter((m:any)=>m.grade!=='F8').length;
    return { ...sub, avg: avg.toFixed(1), passRate: subMarks.length > 0 ? ((pass/subMarks.length)*100).toFixed(0) : '—', count: subMarks.length };
  }).filter(s => s.count > 0).sort((a:any,b:any)=>parseFloat(b.avg)-parseFloat(a.avg));

  const attPresent = attendance.filter((a:any)=>a.status==='present').length;
  const attRate = attendance.length > 0 ? ((attPresent/attendance.length)*100).toFixed(1) : '0.0';

  const handleExport = () => {
    const rows = [
      ['Student','Subject','Exam','Marks','Total','Grade'],
      ...filteredMarks.map((m:any)=>[
        `${m.first_name} ${m.last_name}`, m.subject_name, m.exam_title,
        m.marks_obtained, m.exam_total_marks, m.grade
      ])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='performance_report.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report exported as CSV' });
  };

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Performance Reports</h1>
            <p className="text-sm text-gray-500">{filteredMarks.length} marks records</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All Exams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map((e:any)=><SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{passRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Overall Pass Rate</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{avgScore}</p>
            <p className="text-xs text-gray-500 mt-1">Average Score</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{filteredMarks.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Records</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{attRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Attendance Rate</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Grade Distribution</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {filteredMarks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No marks data available</p>
              ) : GRADES.map(g => (
                <GradeBar key={g} grade={g} count={gradeCount[g] || 0} total={filteredMarks.length} />
              ))}
              {filteredMarks.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span className="text-emerald-600 font-medium">{passed} passed</span>
                  <span className="text-red-500 font-medium">{failed} failed</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Class Performance Ranking</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              {classPerformance.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No class data</p>
              ) : (
                <div className="space-y-2">
                  {classPerformance.map((cls: any, idx: number) => (
                    <div key={cls.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{cls.name}</p>
                        <p className="text-xs text-gray-400">{cls.count} marks · Pass rate: {cls.passRate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">{cls.avg}</p>
                        <p className="text-xs text-gray-400">avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Subject Performance</CardTitle>
              <span className="text-xs text-gray-400">{subjects.length} subjects</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {subjectPerformance.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No subject data available</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Records</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pass Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectPerformance.map((sub: any) => {
                    const avg = parseFloat(sub.avg);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                              {sub.teacher_name && <p className="text-xs text-gray-400">{sub.teacher_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sub.count}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{sub.avg}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${parseFloat(sub.passRate) >= 60 ? 'bg-emerald-100 text-emerald-700' : parseFloat(sub.passRate) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {sub.passRate}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full ${avg >= 70 ? 'bg-emerald-500' : avg >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(avg, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </HTLayout>
  );
}
