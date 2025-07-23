import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, User } from 'lucide-react';
import { Student } from '@/types';

interface PDFGeneratorProps {
  type: 'student' | 'class' | 'school';
  studentId?: string;
  classId?: string;
}

export const PDFGenerator = ({ type, studentId, classId }: PDFGeneratorProps) => {
  const { profile } = useAuth();
  const { school, schoolName, schoolLogo } = useSchool();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students', classId || profile?.schoolId],
    queryFn: () => {
      if (classId) {
        return firestoreService.getStudentsByClass(classId);
      }
      return firestoreService.getStudentsBySchool(profile!.schoolId);
    },
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => firestoreService.getClassesBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const generateStudentReport = async (student: Student) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header with school branding
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Academic Report', pageWidth / 2, 30, { align: 'center' });
    
    // Student Information
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${student.firstName} ${student.lastName}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Payment Code: ${student.paymentCode}`, 20, yPosition);
    
    yPosition += 8;
    const classItem = classes.find(c => c.id === student.classId);
    doc.text(`Class: ${classItem?.name || 'Unknown'}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Date of Birth: ${new Date(student.dateOfBirth).toLocaleDateString()}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Gender: ${student.gender}`, 20, yPosition);
    
    // Guardian Information
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Guardian Information', 20, yPosition);
    
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Guardian: ${student.guardianName}`, 20, yPosition);
    
    yPosition += 8;
    doc.text(`Phone: ${student.guardianPhone}`, 20, yPosition);
    
    if (student.guardianEmail) {
      yPosition += 8;
      doc.text(`Email: ${student.guardianEmail}`, 20, yPosition);
    }
    
    // Address
    yPosition += 8;
    doc.text(`Address: ${student.address}`, 20, yPosition);
    
    // Academic Performance (Mock data for demonstration)
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Academic Performance', 20, yPosition);
    
    yPosition += 15;
    doc.setFont('helvetica', 'normal');
    
    // Table headers
    doc.text('Subject', 20, yPosition);
    doc.text('Grade', 80, yPosition);
    doc.text('Marks', 120, yPosition);
    doc.text('Remarks', 160, yPosition);
    
    // Draw line under headers
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    
    // Mock subjects and grades
    const mockSubjects = [
      { name: 'Mathematics', grade: 'A', marks: '85/100', remarks: 'Excellent' },
      { name: 'English', grade: 'B+', marks: '78/100', remarks: 'Good' },
      { name: 'Science', grade: 'A-', marks: '82/100', remarks: 'Very Good' },
      { name: 'Social Studies', grade: 'B', marks: '75/100', remarks: 'Good' },
    ];
    
    mockSubjects.forEach((subject) => {
      yPosition += 10;
      doc.text(subject.name, 20, yPosition);
      doc.text(subject.grade, 80, yPosition);
      doc.text(subject.marks, 120, yPosition);
      doc.text(subject.remarks, 160, yPosition);
    });
    
    // Attendance Summary
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 20, yPosition);
    
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.text('Days Present: 85', 20, yPosition);
    
    yPosition += 8;
    doc.text('Days Absent: 5', 20, yPosition);
    
    yPosition += 8;
    doc.text('Attendance Rate: 94.4%', 20, yPosition);
    
    // Footer
    const footerY = doc.internal.pageSize.height - 30;
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, footerY);
    doc.text(`Report for: ${student.firstName} ${student.lastName} (${student.paymentCode})`, 20, footerY + 5);
    
    return doc;
  };

  const handleGenerateReport = async () => {
    if (type === 'student' && !selectedStudent && !studentId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a student',
      });
      return;
    }

    setGenerating(true);
    
    try {
      const targetStudentId = studentId || selectedStudent;
      const student = students.find(s => s.id === targetStudentId);
      
      if (!student) {
        throw new Error('Student not found');
      }

      const doc = await generateStudentReport(student);
      
      // Download the PDF
      doc.save(`${student.firstName}_${student.lastName}_Report.pdf`);
      
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate report',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (students.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No students found',
      });
      return;
    }

    setGenerating(true);
    
    try {
      for (const student of students) {
        const doc = await generateStudentReport(student);
        doc.save(`${student.firstName}_${student.lastName}_Report.pdf`);
        
        // Add a small delay to prevent browser hanging
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast({
        title: 'Success',
        description: `Generated ${students.length} reports successfully`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate reports',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>PDF Report Generator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === 'student' && !studentId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{student.firstName} {student.lastName}</span>
                      <span className="text-gray-500 text-xs">({student.paymentCode})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            onClick={handleGenerateReport}
            disabled={generating || (type === 'student' && !selectedStudent && !studentId)}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Generating...' : 'Generate Report'}</span>
          </Button>

          {type === 'class' && students.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkGenerate}
              disabled={generating}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>{generating ? 'Generating...' : `Generate All (${students.length})`}</span>
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p>Reports include:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
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
