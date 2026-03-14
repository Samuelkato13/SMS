import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, Download, Printer, Search, Send, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

const GRADE_PASS = (g: string) => g !== 'F8';

export default function CTReportCards() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');
  const [ctRemark, setCtRemark] = useState('');
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [submittedSet, setSubmittedSet] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);

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
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id)
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const { data: schools = [] } = useQuery<any[]>({ queryKey: ['/api/schools'] });
  const school = schools.find((s: any) => s.id === schoolId);

  const submitMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/parent-communications', data),
    onSuccess: (_data: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/parent-communications'] });
      setSubmittedSet(prev => new Set([...prev, vars.studentId || 'all']));
      setSubmitting(null);
      toast({ title: 'Report card submitted to Head Teacher for approval' });
    },
    onError: (e: any) => { setSubmitting(null); toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const getStudentMarks = (studentId: string) =>
    marks.filter((m: any) => m.student_id === studentId && (!selectedExam || m.exam_id === selectedExam));

  const getAvg = (studentId: string): string | null => {
    const sm = getStudentMarks(studentId);
    if (!sm.length) return null;
    return (sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length).toFixed(1);
  };

  const buildPDF = (student: any): jsPDF => {
    const sm = getStudentMarks(student.id);
    const examObj = exams.find((e: any) => e.id === selectedExam);
    const doc = new jsPDF();
    const pageW = 210;

    // Orange header band
    doc.setFillColor(234, 88, 12); doc.rect(0, 0, pageW, 36, 'F');
    doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(school?.name || 'SCHOOL NAME', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('STUDENT REPORT CARD', pageW / 2, 24, { align: 'center' });
    doc.setFontSize(7); doc.text('CLASS TEACHER DRAFT — Pending Head Teacher Approval', pageW / 2, 31, { align: 'center' });

    // Student info block
    doc.setTextColor(30, 30, 30); doc.setFontSize(9);
    let y = 46;
    const infoLeft = [
      ['Student Name', `${student.first_name} ${student.last_name}`],
      ['Admission No', student.student_number],
      ['Class / Stream', myClass?.name || '—'],
    ];
    const infoRight: [string, string][] = [
      ['Exam', examObj?.title || 'All Exams'],
      ['Date Printed', new Date().toLocaleDateString('en-UG')],
      ['Class Teacher', `${profile?.firstName} ${profile?.lastName}`],
    ];
    infoLeft.forEach(([lbl, val], i) => {
      doc.setFont('helvetica', 'bold'); doc.text(lbl + ':', 15, y + i * 7);
      doc.setFont('helvetica', 'normal'); doc.text(val, 55, y + i * 7, { maxWidth: 50 });
    });
    infoRight.forEach(([lbl, val], i) => {
      doc.setFont('helvetica', 'bold'); doc.text(lbl + ':', 115, y + i * 7);
      doc.setFont('helvetica', 'normal'); doc.text(val, 148, y + i * 7, { maxWidth: 55 });
    });

    y += 26;
    doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8;

    // Table header
    doc.setFillColor(253, 237, 213); doc.rect(15, y - 5, 180, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Subject', 18, y); doc.text('Score', 93, y); doc.text('Out of', 115, y);
    doc.text('%', 135, y); doc.text('Grade', 152, y); doc.text('Remarks', 165, y);
    y += 3; doc.line(15, y, 195, y); y += 6;

    doc.setFont('helvetica', 'normal');
    if (sm.length === 0) {
      doc.setTextColor(150, 150, 150); doc.text('No marks recorded for this selection.', 18, y); doc.setTextColor(30, 30, 30);
      y += 8;
    } else {
      sm.forEach((m: any) => {
        if (y > 260) { doc.addPage(); y = 20; }
        const pct = m.exam_total_marks ? ((m.marks_obtained / m.exam_total_marks) * 100).toFixed(0) : '—';
        doc.text(m.subject_name || '—', 18, y, { maxWidth: 70 });
        doc.text(String(m.marks_obtained), 95, y);
        doc.text(String(m.exam_total_marks || '—'), 115, y);
        doc.text(`${pct}%`, 132, y);
        doc.setFont('helvetica', 'bold');
        const gradeOk = GRADE_PASS(m.grade);
        doc.setTextColor(gradeOk ? 22 : 220, gradeOk ? 163 : 38, gradeOk ? 74 : 38);
        doc.text(m.grade || '—', 152, y);
        doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
        y += 7;
      });
    }

    // Summary
    y += 3; doc.setDrawColor(200, 200, 200); doc.line(15, y, 195, y); y += 7;
    const avg = getAvg(student.id);
    if (avg) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Subjects: ${sm.length}`, 18, y);
      doc.text(`Average Score: ${avg}`, 80, y);
      const pass = parseFloat(avg) >= 50;
      doc.setTextColor(pass ? 22 : 220, pass ? 163 : 38, pass ? 74 : 38);
      doc.text(`Result: ${pass ? 'PASS' : 'FAIL'}`, 150, y);
      doc.setTextColor(30, 30, 30); y += 10;
    }

    // Class Teacher Remarks
    if (ctRemark) {
      doc.setFont('helvetica', 'bold'); doc.text("Class Teacher's Remarks:", 18, y); y += 6;
      doc.setFont('helvetica', 'italic'); doc.text(`"${ctRemark}"`, 18, y, { maxWidth: 170 }); y += 12;
    }

    // Signature section
    y += 3; doc.setDrawColor(200, 200, 200); doc.line(15, y, 195, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`Class Teacher: ${profile?.firstName} ${profile?.lastName}`, 15, y);
    doc.text('Head Teacher:', 120, y); y += 5;
    doc.line(15, y, 85, y); doc.line(120, y, 190, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130);
    doc.text('Signature / Date', 15, y); doc.text('Signature / Date', 120, y);

    return doc;
  };

  const downloadPDF = (student: any) => {
    buildPDF(student).save(`report_card_${student.last_name}_${student.first_name}.pdf`);
    toast({ title: `Report card downloaded for ${student.first_name} ${student.last_name}` });
  };

  const downloadAll = () => {
    const eligible = filtered.filter((s: any) => getStudentMarks(s.id).length > 0);
    if (!eligible.length) return toast({ variant: 'destructive', title: 'No marks found for selected filter' });
    eligible.forEach((s: any) => buildPDF(s).save(`report_card_${s.last_name}_${s.first_name}.pdf`));
    toast({ title: `${eligible.length} report cards downloaded` });
  };

  const submitToHT = async (student: any | null) => {
    const key = student?.id || 'all';
    setSubmitting(key);
    const eligible = student ? [student] : filtered.filter((s: any) => getStudentMarks(s.id).length > 0);
    const msg = student
      ? `REPORT CARD SUBMISSION: Class teacher ${profile?.firstName} ${profile?.lastName} has submitted a draft report card for ${student.first_name} ${student.last_name} (${student.student_number}), ${myClass?.name}. ${selectedExam ? `Exam: ${exams.find((e:any)=>e.id===selectedExam)?.title}` : 'All exams'}. Average: ${getAvg(student.id) ?? '—'}. Please review and approve.`
      : `BULK REPORT CARD SUBMISSION: ${eligible.length} draft report cards for ${myClass?.name} submitted by Class Teacher ${profile?.firstName} ${profile?.lastName}. Please review and approve for distribution.`;

    submitMut.mutate({
      schoolId,
      classId: myClass?.id,
      studentId: student?.id || null,
      type: student ? 'individual' : 'broadcast',
      subject: `Report Card Submission — ${student ? student.first_name + ' ' + student.last_name : myClass?.name + ' (Whole Class)'}`,
      message: msg,
      sentBy: profile?.id,
    });
  };

  const filtered = students.filter((s: any) =>
    !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase())
  );
  const eligibleCount = filtered.filter((s: any) => getStudentMarks(s.id).length > 0).length;

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Cards</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · draft report cards only</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadAll} disabled={eligibleCount === 0} className="gap-2">
              <Printer className="w-4 h-4" />Print All ({eligibleCount})
            </Button>
            <Button
              onClick={() => submitToHT(null)}
              disabled={submitting !== null || eligibleCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting === 'all' ? 'Submitting…' : 'Submit All to Head Teacher'}
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4 flex-shrink-0" />
          Class teachers generate <strong>draft</strong> report cards only. Submit to the Head Teacher for final review and approval before distribution to parents.
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Filter by Exam</Label>
              <Select value={selectedExam || 'all'} onValueChange={v => setSelectedExam(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Exams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams (Combined)</SelectItem>
                  {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Class Teacher's Remarks (added to all printed cards)</Label>
              <Input
                className="mt-1"
                value={ctRemark}
                onChange={e => setCtRemark(e.target.value)}
                placeholder="e.g. Keep working hard. Your efforts are noticed. Aim higher next term!"
              />
            </div>
          </div>
        </Card>

        {/* Students table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Average</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Result</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HT Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s: any) => {
                  const sm = getStudentMarks(s.id);
                  const avg = getAvg(s.id);
                  const avgNum = avg ? parseFloat(avg) : null;
                  const isSubmitted = submittedSet.has(s.id) || submittedSet.has('all');
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold uppercase flex-shrink-0">
                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.student_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${sm.length > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{sm.length}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {avgNum != null
                          ? <span className={`text-sm font-bold ${avgNum >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{avg}</span>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {avgNum != null ? (
                          <Badge className={`text-xs ${avgNum >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {avgNum >= 50 ? 'PASS' : 'FAIL'}
                          </Badge>
                        ) : <Badge className="text-xs bg-gray-100 text-gray-400">No data</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isSubmitted
                          ? <Badge className="text-xs bg-blue-100 text-blue-700 gap-1"><CheckCircle className="w-2.5 h-2.5" />Submitted</Badge>
                          : <Badge className="text-xs bg-gray-100 text-gray-400 gap-1"><Clock className="w-2.5 h-2.5" />Draft</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50"
                            onClick={() => setViewingCard({ student: s, marks: sm })}>
                            <Eye className="w-3 h-3" />View
                          </Button>
                          {sm.length > 0 && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-orange-600 hover:bg-orange-50"
                                onClick={() => downloadPDF(s)}>
                                <Download className="w-3 h-3" />PDF
                              </Button>
                              {!isSubmitted && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50"
                                  disabled={submitting === s.id}
                                  onClick={() => submitToHT(s)}>
                                  <Send className="w-3 h-3" />
                                  {submitting === s.id ? '…' : 'Submit'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!viewingCard} onOpenChange={open => !open && setViewingCard(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview — {viewingCard?.student?.first_name} {viewingCard?.student?.last_name}
            </DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-4 mt-1">
              {/* Student header */}
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center text-orange-800 text-lg font-bold uppercase">
                  {viewingCard.student.first_name?.charAt(0)}{viewingCard.student.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{viewingCard.student.first_name} {viewingCard.student.last_name}</p>
                  <p className="text-xs text-gray-500">{viewingCard.student.student_number} · {myClass?.name}</p>
                  {getAvg(viewingCard.student.id) && (
                    <Badge className={`text-xs mt-0.5 ${parseFloat(getAvg(viewingCard.student.id)!) >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      Avg: {getAvg(viewingCard.student.id)} — {parseFloat(getAvg(viewingCard.student.id)!) >= 50 ? 'PASS' : 'FAIL'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Marks table */}
              {viewingCard.marks.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No marks recorded for this selection</p>
              ) : (
                <table className="w-full border border-gray-100 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Subject</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Score</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">%</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {viewingCard.marks.map((m: any) => {
                      const pct = m.exam_total_marks ? ((m.marks_obtained / m.exam_total_marks) * 100).toFixed(0) : '—';
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2 text-gray-800 font-medium">{m.subject_name}</td>
                          <td className="px-3 py-2 text-center font-semibold">{m.marks_obtained}/{m.exam_total_marks}</td>
                          <td className="px-3 py-2 text-center text-gray-500">{pct}%</td>
                          <td className="px-3 py-2 text-center">
                            <Badge className={`text-xs ${GRADE_PASS(m.grade) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {m.grade}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {ctRemark && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-800 mb-0.5">Class Teacher's Remarks:</p>
                  <p className="text-sm text-orange-700 italic">"{ctRemark}"</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                {!submittedSet.has(viewingCard.student.id) && viewingCard.marks.length > 0 && (
                  <Button variant="outline" className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    disabled={submitting === viewingCard.student.id}
                    onClick={() => submitToHT(viewingCard.student)}>
                    <Send className="w-4 h-4" />Submit for Approval
                  </Button>
                )}
                <Button className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={() => downloadPDF(viewingCard.student)}>
                  <Download className="w-4 h-4" />Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CTLayout>
  );
}
