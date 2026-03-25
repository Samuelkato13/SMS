import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Printer, Search, GraduationCap, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

function IDCard({ student, school, schoolAbbr }: { student: any; school: any; schoolAbbr: string }) {
  return (
    <div className="bg-white border-2 border-emerald-600 rounded-xl overflow-hidden shadow-sm" style={{ width: '280px', minHeight: '170px' }}>
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-2 flex items-center gap-2">
        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs leading-tight truncate">{school?.name || 'ZaabuPay School'}</p>
          <p className="text-emerald-200 text-[10px]">Student Identity Card</p>
        </div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="w-16 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-200">
          <span className="text-2xl font-bold text-emerald-600">{student.first_name?.charAt(0)}{student.last_name?.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-bold text-gray-900 text-sm leading-tight">{student.first_name} {student.last_name}</p>
          <div className="space-y-0.5">
            <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">ID:</span> {student.student_number}</p>
            <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">Class:</span> {student.class_name || '—'}</p>
            <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">Year:</span> {new Date().getFullYear()}</p>
            {student.section && (
              <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">Section:</span> {student.section === 'boarding' ? 'Boarding' : 'Day'}</p>
            )}
            {student.date_of_birth && (
              <p className="text-[11px] text-gray-500"><span className="font-medium text-gray-700">DOB:</span> {new Date(student.date_of_birth).toLocaleDateString('en-UG', { day:'2-digit', month:'short', year:'numeric' })}</p>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <div className="flex gap-1">
          {[...Array(12)].map((_,i) => <div key={i} className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: `hsl(${i*20}, 70%, ${45+i*2}%)` }} />)}
        </div>
        <Badge className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5">
          {schoolAbbr}-{new Date().getFullYear()}
        </Badge>
      </div>
    </div>
  );
}

export default function PrintIDs() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedClass, setSelectedClass] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: schools = [] } = useQuery<any[]>({
    queryKey: ['/api/schools'],
    enabled: !!schoolId,
  });
  const school = schools.find((s:any)=>s.id===schoolId);
  const schoolAbbr = school?.abbreviation || 'SCH';

  const filtered = students.filter((s: any) => {
    const matchClass = selectedClass === 'all' || s.class_id === selectedClass;
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase());
    return matchClass && matchSearch && s.is_active !== false;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((s:any)=>s.id)));
  const clearAll = () => setSelected(new Set());

  const selectedStudents = filtered.filter((s:any) => selected.has(s.id));
  const printStudents = selectedStudents.length > 0 ? selectedStudents : filtered;

  const handlePrint = () => {
    if (printStudents.length === 0) return toast({ variant: 'destructive', title: 'No students to print' });
    window.print();
    toast({ title: `Printing ${printStudents.length} ID card${printStudents.length !== 1 ? 's' : ''}` });
  };

  const handleDownloadPDF = () => {
    if (printStudents.length === 0) return toast({ variant: 'destructive', title: 'No students selected' });
    const doc = new jsPDF({ format: 'a4' });
    const cardsPerRow = 2;
    const cardW = 85; const cardH = 55;
    const marginX = 15; const marginY = 20;
    const gapX = 10; const gapY = 8;

    printStudents.forEach((s, idx) => {
      const row = Math.floor(idx / cardsPerRow);
      const col = idx % cardsPerRow;
      const page = Math.floor(row / 4);

      if (idx > 0 && col === 0 && row % 4 === 0) doc.addPage();

      const x = marginX + col * (cardW + gapX);
      const y = marginY + (row % 4) * (cardH + gapY);

      doc.setFillColor(5, 150, 105);
      doc.roundedRect(x, y, cardW, 14, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(school?.name || 'SCHOOL', x + cardW/2, y + 5, { align: 'center', maxWidth: cardW - 4 });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('STUDENT IDENTITY CARD', x + cardW/2, y + 10, { align: 'center' });

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, y + 14, cardW, cardH - 14, 0, 2, 'F');

      doc.setFillColor(220, 245, 235);
      doc.rect(x + 3, y + 17, 20, 27, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.first_name?.charAt(0) || ''}${s.last_name?.charAt(0) || ''}`, x + 13, y + 34, { align: 'center' });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.first_name} ${s.last_name}`, x + 26, y + 22, { maxWidth: cardW - 28 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`ID: ${s.student_number}`, x + 26, y + 29);
      doc.text(`Class: ${s.class_name || '—'}`, x + 26, y + 35);
      doc.text(`Year: ${new Date().getFullYear()}`, x + 26, y + 41);

      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardW, cardH, 2, 2);
    });

    doc.save('student_id_cards.pdf');
    toast({ title: `Downloaded ${printStudents.length} ID card${printStudents.length !== 1 ? 's' : ''} as PDF` });
  };

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Print Student IDs</h1>
            <p className="text-sm text-gray-500">Generate and print student identity cards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" />Download PDF
            </Button>
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Printer className="w-4 h-4" />Print IDs
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <Select value={selectedClass} onValueChange={v=>{ setSelectedClass(v); clearAll(); }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
                {selected.size > 0 && <Button variant="outline" size="sm" onClick={clearAll} className="text-xs">Clear ({selected.size})</Button>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">
              {selected.size > 0
                ? `${selected.size} selected — will print selected only`
                : `${filtered.length} students — will print all if none selected`}
            </p>
            <div className="flex flex-wrap gap-4">
              {filtered.map((s: any) => (
                <div
                  key={s.id}
                  className={`cursor-pointer transition-all ${selected.has(s.id) ? 'ring-2 ring-emerald-500 rounded-xl' : 'opacity-80 hover:opacity-100'}`}
                  onClick={() => toggleSelect(s.id)}
                >
                  <IDCard student={s} school={school} schoolAbbr={schoolAbbr} />
                  {selected.has(s.id) && (
                    <div className="flex items-center justify-center mt-1">
                      <span className="text-xs text-emerald-600 font-medium">✓ Selected</span>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="w-full py-12 text-center text-gray-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No students found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          body .print-area { display: flex !important; flex-wrap: wrap; gap: 10px; padding: 20px; }
        }
      `}</style>
    </HTLayout>
  );
}
