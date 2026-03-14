import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import { generateReportCardPDF } from '@/utils/generateReportCard';
import { getGradeInfo } from '@/pages/Marks';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEARS = ['2025', '2026', '2027', '2024'];

const GRADE_COLORS: Record<string, string> = {
  D1: 'bg-emerald-100 text-emerald-800', D2: 'bg-green-100 text-green-800',
  C3: 'bg-blue-100 text-blue-800', C4: 'bg-blue-50 text-blue-700',
  C5: 'bg-yellow-100 text-yellow-800', C6: 'bg-orange-100 text-orange-700',
  P7: 'bg-red-100 text-red-700', F8: 'bg-red-200 text-red-900',
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <Badge className={`text-xs border-0 font-bold ${GRADE_COLORS[grade] || 'bg-gray-100 text-gray-600'}`}>
      {grade || '—'}
    </Badge>
  );
}

export default function Reports() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const canEditRemarks = ['director', 'head_teacher', 'class_teacher'].includes(profile?.role || '');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedExam, setSelectedExam] = useState('');
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [remarksForm, setRemarksForm] = useState({ classTeacher: '', headteacher: '', nextTermBegins: '' });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: classReport = [], isLoading: classLoading } = useQuery<any[]>({
    queryKey: ['/api/report-cards/class', schoolId, selectedClass, selectedTerm, selectedYear, selectedExam],
    queryFn: () => {
      let url = `/api/report-cards/class?schoolId=${schoolId}&classId=${selectedClass}&term=${encodeURIComponent(selectedTerm)}&academicYear=${selectedYear}`;
      if (selectedExam && selectedExam !== 'all') url += `&examId=${selectedExam}`;
      return fetch(url).then(r => r.json());
    },
    enabled: !!(schoolId && selectedClass),
  });

  const { data: studentReport, isLoading: reportLoading } = useQuery<any>({
    queryKey: ['/api/report-cards/student', viewingStudent?.id, schoolId, selectedTerm, selectedYear, selectedExam],
    queryFn: () => {
      let url = `/api/report-cards/student?studentId=${viewingStudent.id}&schoolId=${schoolId}&term=${encodeURIComponent(selectedTerm)}&academicYear=${selectedYear}`;
      if (selectedExam && selectedExam !== 'all') url += `&examId=${selectedExam}`;
      return fetch(url).then(r => r.json()).then((data: any) => {
        if (data?.remarks) {
          setRemarksForm({
            classTeacher: data.remarks.class_teacher_remarks || '',
            headteacher: data.remarks.headteacher_remarks || '',
            nextTermBegins: data.remarks.next_term_begins ? data.remarks.next_term_begins.split('T')[0] : '',
          });
        }
        return data;
      });
    },
    enabled: !!(viewingStudent && schoolId),
  });

  const remarksMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/report-cards/remarks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-cards/student'] });
      toast({ title: 'Remarks saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Failed to save remarks', description: e.message, variant: 'destructive' }),
  });

  const saveRemarks = () => {
    if (!viewingStudent) return;
    remarksMutation.mutate({
      studentId: viewingStudent.id,
      schoolId,
      classId: selectedClass,
      term: selectedTerm,
      academicYear: selectedYear,
      classTeacherRemarks: remarksForm.classTeacher,
      headteacherRemarks: remarksForm.headteacher,
      nextTermBegins: remarksForm.nextTermBegins || null,
    });
  };

  const handleDownloadPDF = () => {
    if (!studentReport) return;
    const rank = classReport.find((r: any) => r.student.id === viewingStudent?.id)?.rank;
    generateReportCardPDF(studentReport, rank, classReport.length);
    toast({ title: 'Report card downloaded' });
  };

  const handleDownloadAllPDFs = async () => {
    if (!classReport.length) return;
    toast({ title: 'Preparing PDFs...', description: 'Individual PDFs will download one by one' });
    for (const row of classReport) {
      try {
        let url = `/api/report-cards/student?studentId=${row.student.id}&schoolId=${schoolId}&term=${encodeURIComponent(selectedTerm)}&academicYear=${selectedYear}`;
        if (selectedExam && selectedExam !== 'all') url += `&examId=${selectedExam}`;
        const data = await fetch(url).then(r => r.json());
        generateReportCardPDF(data, row.rank, classReport.length);
        await new Promise(r => setTimeout(r, 400));
      } catch (_) { /* skip */ }
    }
  };

  const classStats = classReport.length > 0 ? {
    avgScore: Math.round(classReport.reduce((s: number, r: any) => s + r.average, 0) / classReport.length * 10) / 10,
    highest: Math.max(...classReport.map((r: any) => r.average)),
    aboveAvg: classReport.filter((r: any) => r.average >= 50).length,
  } : null;

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
            <p className="text-gray-500 text-sm mt-1">Generate and manage student academic reports</p>
          </div>
          {classReport.length > 0 && (
            <Button onClick={handleDownloadAllPDFs} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Download All PDFs
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Class *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Exam (optional)</Label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All exams" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All exams</SelectItem>
                    {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Stats */}
        {classStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Students', value: String(classReport.length), color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: BarChart3, label: 'Class Average', value: `${classStats.avgScore}%`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: TrendingUp, label: 'Highest', value: `${Math.round(classStats.highest * 10) / 10}%`, color: 'text-green-600', bg: 'bg-green-50' },
              { icon: Award, label: 'Passing (≥50%)', value: `${classStats.aboveAvg}/${classReport.length}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(stat => (
              <Card key={stat.label} className="shadow-none border border-gray-100">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Class Report Table */}
        {selectedClass ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Student Report Cards
                {classes.find((c: any) => c.id === selectedClass) && (
                  <span className="text-gray-500 font-normal text-sm">
                    — {classes.find((c: any) => c.id === selectedClass)?.name} · {selectedTerm} {selectedYear}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {classLoading ? (
                <div className="h-40 animate-pulse bg-gray-50 m-4 rounded" />
              ) : classReport.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-gray-200 mb-4" />
                  <h3 className="font-medium text-gray-600">No marks recorded yet</h3>
                  <p className="text-sm text-gray-400 mt-1">Enter marks on the Marks page first, then view report cards here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12 pl-4">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="w-28 text-center">ID</TableHead>
                      <TableHead className="w-20 text-center">Avg %</TableHead>
                      <TableHead className="w-24 text-center">Total</TableHead>
                      <TableHead className="w-20 text-center">Aggr.</TableHead>
                      <TableHead className="w-16 text-center">Subj.</TableHead>
                      <TableHead className="w-28 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classReport.map((row: any) => (
                      <TableRow key={row.student.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="pl-4">
                          <span className={`text-sm font-bold ${row.rank === 1 ? 'text-yellow-600' : row.rank === 2 ? 'text-gray-500' : row.rank === 3 ? 'text-amber-700' : 'text-gray-400'}`}>
                            #{row.rank}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{row.student.first_name} {row.student.last_name}</p>
                          <p className="text-xs text-gray-400">{row.student.class_name}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {row.student.student_number || row.student.payment_code}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${row.average >= 70 ? 'text-green-700' : row.average >= 50 ? 'text-blue-700' : 'text-red-600'}`}>
                            {row.average}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600">
                          {row.totalObtained}/{row.totalMax}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-indigo-100 text-indigo-800 border-0 text-xs font-bold">{row.aggregate}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-500">{row.subjectCount}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs"
                            onClick={() => { setViewingStudent(row.student); setRemarksForm({ classTeacher: '', headteacher: '', nextTermBegins: '' }); }}>
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">Select a class to view report cards</h3>
              <p className="text-gray-400 text-sm mt-1">Choose a class, term, and year from the filters above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Card Viewer Dialog */}
      <Dialog open={!!viewingStudent} onOpenChange={v => !v && setViewingStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {viewingStudent?.first_name} {viewingStudent?.last_name} — Report Card
              <span className="text-sm font-normal text-gray-500">· {selectedTerm} {selectedYear}</span>
            </DialogTitle>
          </DialogHeader>

          {reportLoading ? (
            <div className="h-64 animate-pulse bg-gray-50 rounded" />
          ) : studentReport ? (
            <div className="space-y-5">
              {/* Student Info Bar */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-500 text-xs block">Student No.</span>
                  <span className="font-mono font-bold">{studentReport.student.student_number || studentReport.student.payment_code}</span></div>
                <div><span className="text-gray-500 text-xs block">Class</span>
                  <span className="font-semibold">{studentReport.student.class_name}</span></div>
                <div><span className="text-gray-500 text-xs block">Gender</span>
                  <span className="font-semibold capitalize">{studentReport.student.gender}</span></div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Marks', value: `${studentReport.summary.totalObtained} / ${studentReport.summary.totalMax}` },
                  { label: 'Average', value: `${studentReport.summary.average}%` },
                  { label: 'Aggregate', value: String(studentReport.summary.aggregate) },
                  { label: 'Subjects', value: String(studentReport.summary.totalSubjects) },
                ].map(s => (
                  <div key={s.label} className="bg-gradient-to-b from-blue-700 to-blue-800 rounded-lg p-3 text-center text-white">
                    <p className="text-xs text-blue-200">{s.label}</p>
                    <p className="text-xl font-bold mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Marks Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="text-left px-4 py-2.5">Subject</th>
                      <th className="text-center px-3 py-2.5 w-16">Marks</th>
                      <th className="text-center px-3 py-2.5 w-16">Out of</th>
                      <th className="text-center px-3 py-2.5 w-14">%</th>
                      <th className="text-center px-3 py-2.5 w-16">Grade</th>
                      <th className="text-left px-3 py-2.5">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReport.marks.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">No marks recorded</td></tr>
                    ) : studentReport.marks.map((m: any, i: number) => {
                      const total = parseFloat(m.total_marks || m.exam_total || 100);
                      const obtained = parseFloat(m.marks_obtained);
                      const pct = Math.round((obtained / total) * 100);
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2.5 font-medium">{m.subject_name}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-blue-800">{m.marks_obtained}</td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{total}</td>
                          <td className="px-3 py-2.5 text-center">{pct}%</td>
                          <td className="px-3 py-2.5 text-center"><GradeBadge grade={m.grade} /></td>
                          <td className="px-3 py-2.5 text-gray-500 italic text-xs">{m.subject_teacher_remarks || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grading Key */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-gray-500 font-medium mr-1">Grading:</span>
                {[['D1','≥90%','emerald'],['D2','≥80%','green'],['C3','≥70%','blue'],['C4','≥60%','blue'],['C5','≥50%','yellow'],['C6','≥45%','orange'],['P7','≥35%','red'],['F8','<35%','red']].map(([g, r, c]) => (
                  <span key={g} className={`px-2 py-0.5 rounded-full font-semibold bg-${c}-100 text-${c}-800`}>{g} ({r})</span>
                ))}
              </div>

              {/* Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-blue-800">Class Teacher's Remarks</Label>
                  {canEditRemarks ? (
                    <Textarea value={remarksForm.classTeacher}
                      onChange={e => setRemarksForm(f => ({ ...f, classTeacher: e.target.value }))}
                      placeholder="Enter class teacher remarks..." rows={3} className="text-sm" />
                  ) : (
                    <div className="bg-gray-50 rounded-lg border p-3 text-sm text-gray-700 min-h-[72px] italic">
                      {studentReport.remarks?.class_teacher_remarks || <span className="text-gray-400 not-italic">No remarks entered</span>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-blue-800">Head Teacher's Remarks</Label>
                  {canEditRemarks && profile?.role !== 'class_teacher' ? (
                    <Textarea value={remarksForm.headteacher}
                      onChange={e => setRemarksForm(f => ({ ...f, headteacher: e.target.value }))}
                      placeholder="Enter head teacher remarks..." rows={3} className="text-sm" />
                  ) : (
                    <div className="bg-gray-50 rounded-lg border p-3 text-sm text-gray-700 min-h-[72px] italic">
                      {studentReport.remarks?.headteacher_remarks || <span className="text-gray-400 not-italic">No remarks entered</span>}
                    </div>
                  )}
                </div>
              </div>

              {canEditRemarks && (
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Next Term Begins</Label>
                    <Input type="date" value={remarksForm.nextTermBegins}
                      onChange={e => setRemarksForm(f => ({ ...f, nextTermBegins: e.target.value }))}
                      className="h-9 w-44 text-sm" />
                  </div>
                  <Button onClick={saveRemarks} disabled={remarksMutation.isPending} size="sm">
                    {remarksMutation.isPending ? 'Saving...' : 'Save Remarks'}
                  </Button>
                </div>
              )}

              {/* Download */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button onClick={handleDownloadPDF} className="gap-2 bg-blue-700 hover:bg-blue-800">
                  <Download className="w-4 h-4" />
                  Download PDF Report Card
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No report card data found for this student</p>
              <p className="text-sm mt-1">Make sure marks have been entered for the selected term/year</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RoleGuard>
  );
}
