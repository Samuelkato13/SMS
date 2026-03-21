import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, CheckCircle, Eye, Printer, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

export default function ReportCards() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [htRemark, setHtRemark] = useState('');

  const { data: school } = useQuery<any>({
    queryKey: ['/api/schools', schoolId],
    queryFn: () => fetch(`/api/schools/${schoolId}`).then(r => r.json()),
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
  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const filteredStudents = students
    .filter((s: any) => {
      const matchClass = !selectedClass || s.class_id === selectedClass;
      const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });

  const getStudentMarks = (studentId: string) => {
    return marks.filter((m: any) => {
      const matchExam = !selectedExam || m.exam_id === selectedExam;
      return m.student_id === studentId && matchExam;
    });
  };

  const getStudentAvg = (studentId: string) => {
    const sm = getStudentMarks(studentId);
    if (sm.length === 0) return null;
    return (sm.reduce((s: number, m: any) => s + Number(m.marks_obtained), 0) / sm.length).toFixed(1);
  };

  const generatePDF = (student: any) => {
    const sm = getStudentMarks(student.id);
    const doc = new jsPDF();
    const schoolName = school?.name ?? 'School Report Card';
    const schoolMotto = school?.motto ?? '';
    const schoolAddress = school?.address ?? '';
    const schoolPhone = school?.phone ?? '';

    let y = 15;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), 105, y, { align: 'center' });
    y += 7;
    if (schoolMotto) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`"${schoolMotto}"`, 105, y, { align: 'center' });
      y += 5;
    }
    if (schoolAddress || schoolPhone) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const contact = [schoolAddress, schoolPhone].filter(Boolean).join('  |  ');
      doc.text(contact, 105, y, { align: 'center' });
      y += 5;
    }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT REPORT CARD', 105, y + 4, { align: 'center' });
    y += 10;
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student: ${student.first_name} ${student.last_name}`, 20, y);
    y += 8;
    doc.text(`Student No: ${student.student_number || student.admission_number || '—'}`, 20, y);
    doc.text(`Class: ${student.class_name || '—'}`, 110, y);
    y += 8;
    doc.text(`Exam: ${exams.find((e:any)=>e.id===selectedExam)?.title || 'All Exams'}`, 20, y);
    if (student.section) doc.text(`Section: ${student.section === 'boarding' ? 'Boarding' : 'Day'}`, 110, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Subject', 20, y); doc.text('Score', 100, y); doc.text('Grade', 140, y); doc.text('Remarks', 160, y);
    y += 5;
    doc.line(20, y, 190, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    sm.forEach((m: any) => {
      doc.text(m.subject_name || '—', 20, y);
      doc.text(`${m.marks_obtained}/${m.exam_total_marks}`, 100, y);
      doc.text(m.grade || '—', 140, y);
      doc.text(m.remarks || '', 160, y);
      y += 8;
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    if (htRemark) {
      doc.setFont('helvetica', 'bold');
      doc.text("Head Teacher's Remarks:", 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(htRemark, 20, y, { maxWidth: 170 });
      y += 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Head Teacher: ${profile?.firstName} ${profile?.lastName}`, 20, y);
    doc.line(20, y + 5, 90, y + 5);

    doc.save(`report_card_${student.last_name}_${student.first_name}.pdf`);
    toast({ title: `Report card downloaded for ${student.first_name} ${student.last_name}` });
  };

  const generateBulkPDF = () => {
    const doc = new jsPDF();
    const schoolName = school?.name ?? 'School';
    const schoolMotto = school?.motto ?? '';
    let isFirst = true;
    filteredStudents.forEach((student: any) => {
      const sm = getStudentMarks(student.id);
      if (sm.length === 0) return;
      if (!isFirst) doc.addPage();
      isFirst = false;

      let y = 15;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName.toUpperCase(), 105, y, { align: 'center' });
      y += 6;
      if (schoolMotto) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`"${schoolMotto}"`, 105, y, { align: 'center' });
        y += 5;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT REPORT CARD', 105, y + 3, { align: 'center' });
      y += 9;
      doc.line(20, y, 190, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${student.first_name} ${student.last_name}`, 20, y);
      doc.text(`Class: ${student.class_name || '—'}`, 130, y);
      y += 7;
      doc.text(`No: ${student.student_number || student.admission_number || '—'}`, 20, y);
      doc.text(`Exam: ${exams.find((e:any)=>e.id===selectedExam)?.title || 'All Exams'}`, 130, y);
      y += 6;
      doc.line(20, y, 190, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Subject', 20, y); doc.text('Score', 100, y); doc.text('Grade', 140, y);
      y += 5;
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      sm.forEach((m: any) => {
        doc.text(m.subject_name || '—', 20, y);
        doc.text(`${m.marks_obtained}/${m.exam_total_marks}`, 100, y);
        doc.text(m.grade || '—', 140, y);
        y += 7;
      });

      if (htRemark) {
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text("HT Remarks: ", 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(htRemark, 55, y, { maxWidth: 135 });
      }
    });

    if (isFirst) return toast({ variant: 'destructive', title: 'No marks found for selected students' });
    doc.save('bulk_report_cards.pdf');
    toast({ title: 'Bulk report cards downloaded' });
  };

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Cards</h1>
            <p className="text-sm text-gray-500">View, verify, and print student report cards</p>
          </div>
          <Button onClick={generateBulkPDF} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Printer className="w-4 h-4" />Print All
          </Button>
        </div>

        <Card className="border-0 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Select Exam</Label>
              <Select value={selectedExam || 'all'} onValueChange={v=>setSelectedExam(v==='all'?'':v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Exams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((e:any)=><SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Filter by Class</Label>
              <Select value={selectedClass || 'all'} onValueChange={v=>setSelectedClass(v==='all'?'':v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">HT Remarks (added to all cards)</Label>
              <Input className="mt-1" value={htRemark} onChange={e=>setHtRemark(e.target.value)} placeholder="e.g. Well done. Keep up the effort." />
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No students found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s: any) => {
                    const sm = getStudentMarks(s.id);
                    const avg = getStudentAvg(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">
                              {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-gray-400">{s.student_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge className="text-xs bg-blue-50 text-blue-700">{s.class_name || '—'}</Badge></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sm.length} subject{sm.length !== 1 ? 's' : ''}</td>
                        <td className="px-4 py-3">
                          {avg ? (
                            <span className={`text-sm font-bold ${parseFloat(avg)>=50?'text-emerald-600':'text-red-500'}`}>{avg}</span>
                          ) : <span className="text-xs text-gray-400">No marks</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setViewingCard({ student: s, marks: sm })}>
                              <Eye className="w-3.5 h-3.5" />View
                            </Button>
                            {sm.length > 0 && (
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600" onClick={() => generatePDF(s)}>
                                <Download className="w-3.5 h-3.5" />PDF
                              </Button>
                            )}
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

      <Dialog open={!!viewingCard} onOpenChange={open=>!open&&setViewingCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card — {viewingCard?.student?.first_name} {viewingCard?.student?.last_name}</DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500">Student No.</p><p className="font-semibold">{viewingCard.student.student_number}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500">Class</p><p className="font-semibold">{viewingCard.student.class_name || '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500">Guardian</p><p className="font-semibold truncate">{viewingCard.student.guardian_name || '—'}</p></div>
              </div>
              {viewingCard.marks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No marks recorded for this selection</p>
              ) : (
                <table className="w-full border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-emerald-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Subject</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Score</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Grade</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {viewingCard.marks.map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-sm text-gray-800">{m.subject_name}</td>
                        <td className="px-3 py-2.5 text-sm text-center font-semibold">{m.marks_obtained}/{m.exam_total_marks}</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge className={`text-xs ${m.grade !== 'F8' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{m.grade}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{m.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {htRemark && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-800">Head Teacher's Remarks:</p>
                  <p className="text-sm text-emerald-700 mt-1">{htRemark}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => generatePDF(viewingCard.student)}>
                  <Download className="w-4 h-4" />Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </HTLayout>
  );
}
