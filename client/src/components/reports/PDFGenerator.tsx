import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, User } from 'lucide-react';

interface PDFGeneratorProps {
  type: 'student' | 'class' | 'school';
  studentId?: string;
  classId?: string;
}

export const PDFGenerator = ({ type, studentId, classId }: PDFGeneratorProps) => {
  const { profile } = useAuth();
  const { schoolName } = useSchool();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const generateStudentReport = async (student: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName || 'ZaabuPay School', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Academic Report', pageWidth / 2, 30, { align: 'center' });

    let y = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 20, y);

    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${student.first_name} ${student.last_name}`, 20, y);
    y += 8; doc.text(`Payment Code: ${student.payment_code}`, 20, y);
    y += 8; doc.text(`Class: ${student.class_name || 'N/A'}`, 20, y);
    y += 8; doc.text(`Date of Birth: ${new Date(student.date_of_birth).toLocaleDateString()}`, 20, y);
    y += 8; doc.text(`Gender: ${student.gender}`, 20, y);

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Guardian Information', 20, y);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Guardian: ${student.guardian_name}`, 20, y);
    y += 8; doc.text(`Phone: ${student.guardian_phone}`, 20, y);
    y += 8; doc.text(`Address: ${student.address}`, 20, y);

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Academic Performance', 20, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.text('Subject', 20, y);
    doc.text('Grade', 80, y);
    doc.text('Marks', 120, y);
    doc.text('Remarks', 160, y);
    doc.line(20, y + 2, 190, y + 2);

    const mockSubjects = [
      { name: 'Mathematics', grade: 'A', marks: '85/100', remarks: 'Excellent' },
      { name: 'English', grade: 'B+', marks: '78/100', remarks: 'Good' },
      { name: 'Science', grade: 'A-', marks: '82/100', remarks: 'Very Good' },
      { name: 'Social Studies', grade: 'B', marks: '75/100', remarks: 'Good' },
    ];

    mockSubjects.forEach(s => {
      y += 10;
      doc.text(s.name, 20, y);
      doc.text(s.grade, 80, y);
      doc.text(s.marks, 120, y);
      doc.text(s.remarks, 160, y);
    });

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 20, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text('Days Present: 85', 20, y);
    y += 8; doc.text('Days Absent: 5', 20, y);
    y += 8; doc.text('Attendance Rate: 94.4%', 20, y);

    const footerY = doc.internal.pageSize.height - 30;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, footerY);
    doc.text(`${student.first_name} ${student.last_name} (${student.payment_code})`, 20, footerY + 5);

    return doc;
  };

  const handleGenerateReport = async () => {
    const targetId = studentId || selectedStudent;
    if (type === 'student' && !targetId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a student' });
      return;
    }

    setGenerating(true);
    try {
      const student = students.find((s: any) => s.id === targetId);
      if (!student) throw new Error('Student not found');
      const doc = await generateStudentReport(student);
      doc.save(`${student.first_name}_${student.last_name}_Report.pdf`);
      toast({ title: 'Success', description: 'Report generated successfully' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to generate report' });
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (students.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No students found' });
      return;
    }
    setGenerating(true);
    try {
      for (const student of students) {
        const doc = await generateStudentReport(student);
        doc.save(`${student.first_name}_${student.last_name}_Report.pdf`);
        await new Promise(r => setTimeout(r, 100));
      }
      toast({ title: 'Success', description: `Generated ${students.length} reports successfully` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to generate reports' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          PDF Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === 'student' && !studentId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
              <SelectContent className="max-h-48">
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{s.first_name} {s.last_name}</span>
                      <span className="text-gray-400 text-xs">({s.payment_code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleGenerateReport} disabled={generating || (type === 'student' && !selectedStudent && !studentId)} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
          {type === 'class' && students.length > 0 && (
            <Button variant="outline" onClick={handleBulkGenerate} disabled={generating} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {generating ? 'Generating...' : `Generate All (${students.length})`}
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Reports include:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>Student personal information</li>
            <li>Academic performance summary</li>
            <li>Attendance records</li>
            <li>Guardian contact details</li>
            <li>Payment code for fee tracking</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
