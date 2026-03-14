import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, Download, Printer, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

export default function CTReportCards() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');
  const [ctRemark, setCtRemark] = useState('');
  const [viewingCard, setViewingCard] = useState<any>(null);

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

  const { data: schools = [] } = useQuery<any[]>({
    queryKey: ['/api/schools'],
    enabled: !!schoolId,
  });
  const school = schools.find((s:any) => s.id === schoolId);

  const getStudentMarks = (studentId: string) =>
    marks.filter((m: any) => m.student_id === studentId && (!selectedExam || m.exam_id === selectedExam));

  const getAvg = (studentId: string) => {
    const sm = getStudentMarks(studentId);
    if (!sm.length) return null;
    return (sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length).toFixed(1);
  };

  const generatePDF = (student: any, preview = false) => {
    const sm = getStudentMarks(student.id);
    const examObj = exams.find((e:any) => e.id === selectedExam);
    const doc = new jsPDF();

    doc.setFillColor(255, 237, 213); doc.rect(0, 0, 210, 35, 'F');
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(154, 52, 18);
    doc.text(school?.name || 'SCHOOL NAME', 105, 14, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(100, 60, 20);
    doc.text('STUDENT REPORT CARD', 105, 24, { align: 'center' });
    doc.setFontSize(8); doc.text('DRAFT — Class Teacher Copy', 105, 31, { align: 'center' });

    doc.setTextColor(30, 30, 30); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(`Student: ${student.first_name} ${student.last_name}`, 15, 45);
    doc.text(`Adm No: ${student.student_number}`, 15, 53);
    doc.text(`Class: ${myClass?.name || '—'}`, 115, 45);
    if (examObj) doc.text(`Exam: ${examObj.title}`, 115, 53);
    doc.text(`Class Teacher: ${profile?.firstName} ${profile?.lastName}`, 15, 61);
    doc.text(`Date: ${new Date().toLocaleDateString('en-UG')}`, 115, 61);

    doc.setDrawColor(200, 120, 60); doc.line(15, 66, 195, 66);

    let y = 76;
    doc.setFont('helvetica','bold'); doc.setFillColor(255, 237, 213); doc.rect(15, y-5, 180, 8, 'F');
    doc.text('Subject', 18, y); doc.text('Score', 100, y); doc.text('/%', 130, y); doc.text('Grade', 155, y); doc.text('Remarks', 165, y);
    y += 3; doc.line(15, y, 195, y); y += 6;

    doc.setFont('helvetica','normal');
    sm.forEach((m: any) => {
      doc.text(m.subject_name || '—', 18, y, { maxWidth: 75 });
      doc.text(`${m.marks_obtained}/${m.exam_total_marks}`, 100, y);
      doc.text(`${((m.marks_obtained/m.exam_total_marks)*100).toFixed(0)}%`, 130, y);
      doc.setFont('helvetica','bold');
      const gradeColor = m.grade === 'F8' ? [220,38,38] : m.grade?.startsWith('D') ? [22,163,74] : [30,64,175];
      doc.setTextColor(...gradeColor as [number,number,number]); doc.text(m.grade||'—', 155, y);
      doc.setTextColor(30,30,30); doc.setFont('helvetica','normal');
      doc.text(m.subject_teacher_remarks || '', 165, y, { maxWidth: 25 });
      y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
    });

    if (!sm.length) { doc.setTextColor(150,150,150); doc.text('No marks recorded for this selection.', 18, y); y += 10; doc.setTextColor(30,30,30); }

    y += 4; doc.line(15, y, 195, y); y += 8;
    const avg = getAvg(student.id);
    if (avg) {
      doc.setFont('helvetica','bold');
      doc.text(`Total Average: ${avg}`, 18, y);
      doc.text(`Result: ${parseFloat(avg)>=50?'PASS':'FAIL'}`, 100, y);
      y += 10;
    }

    if (ctRemark) {
      doc.setFont('helvetica','bold'); doc.text("Class Teacher's Remarks:", 18, y); y += 7;
      doc.setFont('helvetica','normal'); doc.text(ctRemark, 18, y, { maxWidth: 170 }); y += 12;
    }
    doc.setFont('helvetica','bold');
    doc.text(`Class Teacher: ${profile?.firstName} ${profile?.lastName}`, 18, y);
    doc.line(18, y+5, 85, y+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(7);
    doc.text('Signature & Date', 18, y+9);

    doc.save(`report_card_${student.last_name}_${student.first_name}.pdf`);
    toast({ title: `Report card generated for ${student.first_name} ${student.last_name}` });
  };

  const generateBulk = () => {
    const eligible = filtered.filter((s:any) => getStudentMarks(s.id).length > 0);
    if (!eligible.length) return toast({ variant: 'destructive', title: 'No marks found for selected students' });
    const doc = new jsPDF();
    let isFirst = true;
    eligible.forEach((student: any) => {
      const sm = getStudentMarks(student.id);
      if (!isFirst) doc.addPage(); isFirst = false;
      doc.setFillColor(255,237,213); doc.rect(0,0,210,28,'F');
      doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(154,52,18);
      doc.text(school?.name||'SCHOOL', 105, 12, { align:'center' });
      doc.setFontSize(9); doc.text('STUDENT REPORT CARD — DRAFT', 105, 22, { align:'center' });
      doc.setTextColor(30,30,30); doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(`${student.first_name} ${student.last_name}  |  ${student.student_number}  |  ${myClass?.name}`, 15, 38);
      let y = 50;
      sm.forEach((m: any) => {
        doc.text(`${m.subject_name}: ${m.marks_obtained}/${m.exam_total_marks} — ${m.grade}`, 15, y);
        y += 7;
      });
      if (ctRemark) { y+=3; doc.setFont('helvetica','bold'); doc.text('CT Remarks: ', 15, y); doc.setFont('helvetica','normal'); doc.text(ctRemark, 45, y, { maxWidth: 150 }); }
    });
    doc.save(`bulk_report_cards_${myClass?.name}.pdf`);
    toast({ title: `${eligible.length} report cards downloaded` });
  };

  const filtered = students.filter((s: any) => !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Cards</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · Draft report cards only</p>
          </div>
          <Button onClick={generateBulk} className="bg-orange-600 hover:bg-orange-700 gap-2">
            <Printer className="w-4 h-4" />Print All
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4 flex-shrink-0" />
          Class teachers generate <strong>draft</strong> report cards. Head Teacher reviews and approves before distribution to parents.
        </div>

        <Card className="border-0 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Select Exam</Label>
              <Select value={selectedExam || 'all'} onValueChange={v => setSelectedExam(v==='all'?'':v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Exams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((e:any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Class Teacher Remarks (optional — added to all cards)</Label>
              <Input className="mt-1" value={ctRemark} onChange={e => setCtRemark(e.target.value)} placeholder="e.g. Keep working hard. Attend all remedial classes." />
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Adm No</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subjects</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Average</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s: any) => {
                  const sm = getStudentMarks(s.id);
                  const avg = getAvg(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold">
                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.student_number}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{sm.length}</td>
                      <td className="px-4 py-3 text-center">
                        {avg ? <span className={`text-sm font-bold ${parseFloat(avg)>=50?'text-emerald-600':'text-red-500'}`}>{avg}</span>
                             : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {avg ? (
                          <Badge className={`text-xs ${parseFloat(avg)>=50?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>
                            {parseFloat(avg)>=50?'Pass':'Fail'}
                          </Badge>
                        ) : <Badge className="text-xs bg-gray-100 text-gray-500">No data</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewingCard({ student: s, marks: sm })}>
                            <Eye className="w-3.5 h-3.5" />View
                          </Button>
                          {sm.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-orange-600" onClick={() => generatePDF(s)}>
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewingCard} onOpenChange={open=>!open&&setViewingCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview — {viewingCard?.student?.first_name} {viewingCard?.student?.last_name}</DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400">Adm No</p><p className="font-semibold">{viewingCard.student.student_number}</p></div>
                <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400">Class</p><p className="font-semibold">{myClass?.name}</p></div>
                <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400">Average</p><p className={`font-bold ${parseFloat(getAvg(viewingCard.student.id)??'0')>=50?'text-emerald-600':'text-red-500'}`}>{getAvg(viewingCard.student.id)??'—'}</p></div>
              </div>
              {viewingCard.marks.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No marks for this selection</p>
              ) : (
                <table className="w-full border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Subject</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Score</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {viewingCard.marks.map((m: any) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-sm text-gray-800">{m.subject_name}</td>
                        <td className="px-3 py-2 text-sm text-center font-semibold">{m.marks_obtained}/{m.exam_total_marks}</td>
                        <td className="px-3 py-2 text-center"><Badge className={`text-xs ${m.grade!=='F8'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{m.grade}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {ctRemark && <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs font-semibold text-orange-800">Class Teacher's Remarks:</p><p className="text-sm text-orange-700 mt-1">{ctRemark}</p></div>}
              <div className="flex justify-end">
                <Button className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={() => generatePDF(viewingCard.student)}>
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
