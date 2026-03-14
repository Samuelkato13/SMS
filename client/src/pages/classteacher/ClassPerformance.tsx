import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { useToast } from '@/hooks/use-toast';
import { Award, AlertTriangle, Download, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GRADES = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'F8'];
const GRADE_COLORS: Record<string, string> = {
  D1: 'bg-emerald-600', D2: 'bg-green-500', C3: 'bg-teal-500', C4: 'bg-blue-500',
  C5: 'bg-indigo-400', C6: 'bg-yellow-400', P7: 'bg-orange-400', F8: 'bg-red-500',
};
const GRADE_TEXT: Record<string, string> = {
  D1: 'text-emerald-700 bg-emerald-100', D2: 'text-green-700 bg-green-100',
  C3: 'text-teal-700 bg-teal-100', C4: 'text-blue-700 bg-blue-100',
  C5: 'text-indigo-700 bg-indigo-100', C6: 'text-yellow-700 bg-yellow-100',
  P7: 'text-orange-700 bg-orange-100', F8: 'text-red-700 bg-red-100',
};

export default function ClassPerformance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedExam, setSelectedExam] = useState('all');

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

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const filteredMarks = selectedExam === 'all' ? marks : marks.filter((m: any) => m.exam_id === selectedExam);

  // Build ranked student list
  const studentRanking = students.map((s: any) => {
    const sm = filteredMarks.filter((m: any) => m.student_id === s.id);
    if (!sm.length) return { ...s, avg: 0, count: 0 };
    const avg = sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length;
    return { ...s, avg, count: sm.length };
  })
    .filter(s => s.count > 0)
    .sort((a: any, b: any) => b.avg - a.avg);

  const top10   = studentRanking.slice(0, 10);
  const bottom5 = studentRanking.length >= 5 ? [...studentRanking].reverse().slice(0, 5) : [...studentRanking].reverse();

  // Grade distribution
  const gradeCount: Record<string, number> = {};
  GRADES.forEach(g => { gradeCount[g] = filteredMarks.filter((m: any) => m.grade === g).length; });
  const totalGraded = filteredMarks.length;
  const passCount = filteredMarks.filter((m: any) => m.grade !== 'F8').length;
  const passRate = totalGraded ? ((passCount / totalGraded) * 100).toFixed(1) : '—';
  const classAvg = totalGraded
    ? (filteredMarks.reduce((s: number, m: any) => s + Number(m.marks_obtained), 0) / totalGraded).toFixed(1)
    : '—';

  // Subject performance
  const subjectPerf = subjects.map((sub: any) => {
    const sm = filteredMarks.filter((m: any) => m.subject_id === sub.id);
    if (!sm.length) return null;
    const avg = sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length;
    const pass = sm.filter((m: any) => m.grade !== 'F8').length;
    return { ...sub, avg: avg.toFixed(1), passRate: ((pass / sm.length) * 100).toFixed(0), count: sm.length, rawAvg: avg };
  }).filter(Boolean).sort((a: any, b: any) => b.rawAvg - a.rawAvg);

  // Term trend
  const termData = exams.reduce((acc: any, e: any) => {
    if (!acc[e.term]) acc[e.term] = { term: e.term, total: 0, count: 0 };
    const em = marks.filter((m: any) => m.exam_id === e.id);
    if (em.length) {
      acc[e.term].total += em.reduce((s: number, m: any) => s + Number(m.marks_obtained), 0);
      acc[e.term].count += em.length;
    }
    return acc;
  }, {} as Record<string, any>);
  const trends = Object.values(termData).map((t: any) => ({ ...t, avg: t.count ? (t.total / t.count).toFixed(1) : 0 }));

  const handleExport = () => {
    const header = ['Rank', 'Student', 'Adm No', 'Average', 'Subjects', 'Pass/Fail'];
    const rows = studentRanking.map((s: any, i: number) => [
      i + 1, `${s.first_name} ${s.last_name}`, s.student_number,
      s.avg.toFixed(1), s.count, s.avg >= 50 ? 'PASS' : 'FAIL',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${myClass?.name}_performance_${selectedExam === 'all' ? 'all' : exams.find((e: any) => e.id === selectedExam)?.title}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: 'Performance report exported as CSV' });
  };

  return (
    <CTLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Class Performance</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · {filteredMarks.length} mark records</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-52 text-sm">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams (Combined)</SelectItem>
                {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={studentRanking.length === 0}>
              <Download className="w-4 h-4" />Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students Ranked', value: studentRanking.length, sub: `of ${students.length}`, color: 'text-orange-600' },
            { label: 'Class Average', value: classAvg, sub: 'across all marks', color: 'text-blue-600' },
            { label: 'Overall Pass Rate', value: `${passRate}${passRate !== '—' ? '%' : ''}`, sub: `${passCount} of ${totalGraded}`, color: 'text-emerald-600' },
            { label: 'Need Intervention', value: studentRanking.filter(s => s.avg < 50).length, sub: 'below 50% average', color: 'text-red-500' },
          ].map(k => (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
                <p className="text-xs font-semibold text-gray-600 mt-0.5">{k.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top 10 & Bottom 5 */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Top 10 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />Top 10 Students
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {top10.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No marks data yet</p>
              ) : top10.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm
                    ${i === 0 ? 'bg-yellow-300 text-yellow-900 ring-2 ring-yellow-400'
                      : i === 1 ? 'bg-gray-300 text-gray-700 ring-2 ring-gray-400'
                      : i === 2 ? 'bg-orange-300 text-orange-900 ring-2 ring-orange-400'
                      : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(s.avg, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{s.count} subj</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-sm font-extrabold ${s.avg >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{s.avg.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bottom 5 — For Intervention */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />Bottom 5 — Needs Intervention
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {bottom5.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm font-semibold text-emerald-600">All students performing well!</p>
                  <p className="text-xs text-gray-400 mt-1">No students in the bottom 5 range</p>
                </div>
              ) : bottom5.map((s: any, i: number) => (
                <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${s.avg < 35 ? 'bg-red-50' : s.avg < 50 ? 'bg-orange-50' : 'bg-yellow-50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase
                    ${s.avg < 35 ? 'bg-red-200 text-red-800' : s.avg < 50 ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'}`}>
                    {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                    <div className="w-full bg-gray-200/60 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${s.avg < 35 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(s.avg, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-extrabold ${s.avg < 35 ? 'text-red-600' : 'text-orange-600'}`}>{s.avg.toFixed(1)}</p>
                    <p className={`text-[10px] font-semibold ${s.avg < 50 ? 'text-red-500' : 'text-orange-500'}`}>
                      {s.avg < 35 ? 'FAIL — Urgent' : s.avg < 50 ? 'FAIL' : 'Borderline'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-orange-500" />Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {totalGraded === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No marks data available</p>
            ) : (
              <div className="space-y-2.5">
                {GRADES.map(g => {
                  const count = gradeCount[g] || 0;
                  const pct = totalGraded > 0 ? (count / totalGraded) * 100 : 0;
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded min-w-[36px] text-center ${GRADE_TEXT[g]}`}>{g}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className={`h-full rounded-full ${GRADE_COLORS[g]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-20 text-right font-medium">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-sm">
                  <span className="text-emerald-600 font-semibold">✓ Pass (D1–P7): {GRADES.slice(0,7).reduce((s,g)=>s+(gradeCount[g]||0),0)}</span>
                  <span className="text-red-500 font-semibold">✗ Fail (F8): {gradeCount['F8']||0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">Subject-by-Subject Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subjectPerf.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No subject data available</div>
            ) : (
              <>
                {/* Visual bars */}
                <div className="px-4 py-3 space-y-3 border-b border-gray-100">
                  {subjectPerf.map((sub: any) => (
                    <div key={sub.id} className="flex items-center gap-3">
                      <p className="text-xs font-semibold text-gray-700 w-36 flex-shrink-0 truncate">{sub.name}</p>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${parseFloat(sub.avg) >= 70 ? 'bg-emerald-500' : parseFloat(sub.avg) >= 50 ? 'bg-blue-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(parseFloat(sub.avg), 100)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-multiply">
                          {sub.avg}
                        </span>
                      </div>
                      <Badge className={`text-[10px] w-12 text-center flex-shrink-0 ${parseFloat(sub.passRate) >= 60 ? 'bg-emerald-100 text-emerald-700' : parseFloat(sub.passRate) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                        {sub.passRate}%
                      </Badge>
                      <span className="text-[10px] text-gray-400 w-12 text-right flex-shrink-0">{sub.count} marks</span>
                    </div>
                  ))}
                </div>
                {/* Strongest / weakest */}
                {subjectPerf.length >= 2 && (
                  <div className="px-4 py-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="font-semibold">Strongest:</span> {subjectPerf[0]?.name} ({subjectPerf[0]?.avg})
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="font-semibold">Weakest:</span> {subjectPerf[subjectPerf.length - 1]?.name} ({subjectPerf[subjectPerf.length - 1]?.avg})
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Term-by-term trend */}
        {trends.length >= 2 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />Performance Trend by Term
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-end gap-6">
                {trends.map((t: any, i: number) => {
                  const prev = i > 0 ? parseFloat(trends[i - 1].avg) : null;
                  const curr = parseFloat(t.avg);
                  const improved = prev !== null && curr > prev;
                  const declined = prev !== null && curr < prev;
                  return (
                    <div key={t.term} className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-base font-extrabold text-gray-800">{t.avg}</span>
                        {improved && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                        {declined && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <div className={`w-16 rounded-t-lg ${parseFloat(t.avg) >= 70 ? 'bg-emerald-400' : parseFloat(t.avg) >= 50 ? 'bg-blue-400' : 'bg-orange-400'}`}
                        style={{ height: `${Math.max(parseFloat(t.avg), 4)}px` }} />
                      <p className="text-xs font-medium text-gray-600">{t.term}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CTLayout>
  );
}
