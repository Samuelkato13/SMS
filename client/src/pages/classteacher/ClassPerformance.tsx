import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Award, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GRADES = ['D1','D2','C3','C4','C5','C6','P7','F8'];
const GRADE_COLORS: Record<string,string> = {
  D1:'bg-emerald-500', D2:'bg-green-500', C3:'bg-teal-500', C4:'bg-blue-500',
  C5:'bg-indigo-400', C6:'bg-yellow-400', P7:'bg-orange-400', F8:'bg-red-500',
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

  const studentRanking = students.map((s: any) => {
    const sm = filteredMarks.filter((m: any) => m.student_id === s.id);
    if (!sm.length) return { ...s, avg: 0, total: 0, count: 0, grades: {} };
    const avg = sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length;
    const grades: Record<string,number> = {};
    sm.forEach((m: any) => { grades[m.grade] = (grades[m.grade]||0)+1; });
    return { ...s, avg, total: sm.reduce((a:number,m:any)=>a+Number(m.marks_obtained),0), count: sm.length, grades };
  }).filter(s => s.count > 0).sort((a:any,b:any) => b.avg - a.avg);

  const top10 = studentRanking.slice(0, 10);
  const bottom5 = [...studentRanking].slice(-5).reverse();
  const needsIntervention = studentRanking.filter((s:any) => s.avg < 50);

  const gradeCount: Record<string,number> = {};
  GRADES.forEach(g => { gradeCount[g] = filteredMarks.filter((m:any)=>m.grade===g).length; });
  const passRate = filteredMarks.length ? ((filteredMarks.filter((m:any)=>m.grade!=='F8').length/filteredMarks.length)*100).toFixed(1) : '—';
  const avgScore = filteredMarks.length ? (filteredMarks.reduce((s:number,m:any)=>s+Number(m.marks_obtained),0)/filteredMarks.length).toFixed(1) : '—';

  const subjectPerf = subjects.map((sub:any) => {
    const sm = filteredMarks.filter((m:any)=>m.subject_id===sub.id);
    if (!sm.length) return null;
    const avg = sm.reduce((a:number,m:any)=>a+Number(m.marks_obtained),0)/sm.length;
    const pass = sm.filter((m:any)=>m.grade!=='F8').length;
    return { ...sub, avg: avg.toFixed(1), passRate: ((pass/sm.length)*100).toFixed(0), count: sm.length };
  }).filter(Boolean).sort((a:any,b:any)=>parseFloat(b.avg)-parseFloat(a.avg));

  const handleExport = () => {
    const rows = [
      ['Rank','Student','Adm No','Average','Grade Count','Pass'],
      ...studentRanking.map((s:any,i:number)=>[ i+1, `${s.first_name} ${s.last_name}`, s.student_number, s.avg.toFixed(1), s.count, s.avg>=50?'Pass':'Fail' ])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${myClass?.name}_performance.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Performance report exported' });
  };

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Class Performance</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · {filteredMarks.length} mark records</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-52 text-sm"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams.map((e:any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" />Export</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{passRate}{typeof passRate === 'string' && passRate !== '—' ? '%' : ''}</p>
            <p className="text-xs text-gray-500 mt-1">Pass Rate</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{avgScore}</p>
            <p className="text-xs text-gray-500 mt-1">Class Average</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${needsIntervention.length>0?'text-red-500':'text-emerald-600'}`}>{needsIntervention.length}</p>
            <p className="text-xs text-gray-500 mt-1">Need Intervention</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Award className="w-4 h-4 text-yellow-500" />Top 10 Students</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {top10.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No data available</p>
              ) : top10.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${i===0?'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300':i===1?'bg-gray-200 text-gray-700':i===2?'bg-orange-100 text-orange-700':'bg-gray-50 text-gray-500'}`}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(s.avg, 100)}%` }} />
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${s.avg>=50?'text-emerald-600':'text-red-500'}`}>{s.avg.toFixed(1)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Needs Intervention</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {needsIntervention.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-sm text-emerald-600 font-medium">All students are passing!</p>
                  <p className="text-xs text-gray-400">No students below 50% average</p>
                </div>
              ) : needsIntervention.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                  <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-xs font-bold flex-shrink-0">
                    {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-[10px] text-gray-500">{s.count} subjects recorded</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 flex-shrink-0">{s.avg.toFixed(1)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Grade Distribution</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {filteredMarks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No marks data</p>
            ) : GRADES.map(g => {
              const count = gradeCount[g] || 0;
              const pct = filteredMarks.length > 0 ? (count / filteredMarks.length) * 100 : 0;
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-700 w-5">{g}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${GRADE_COLORS[g]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Subject Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            {subjectPerf.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No subject data available</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entries</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Average</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pass Rate</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectPerf.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{sub.name}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{sub.count}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-800">{sub.avg}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${parseFloat(sub.passRate)>=60?'bg-emerald-100 text-emerald-700':parseFloat(sub.passRate)>=40?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-600'}`}>
                          {sub.passRate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${parseFloat(sub.avg)>=70?'bg-emerald-500':parseFloat(sub.avg)>=50?'bg-yellow-400':'bg-red-400'}`} style={{ width: `${Math.min(parseFloat(sub.avg),100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </CTLayout>
  );
}
