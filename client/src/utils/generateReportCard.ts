import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getGradeInfo } from '@/pages/Marks';

interface ReportCardData {
  student: {
    first_name: string;
    last_name: string;
    student_number: string;
    payment_code: string;
    gender: string;
    class_name: string;
    school_name: string;
    school_address: string;
    school_phone: string;
    school_email: string;
  };
  marks: Array<{
    subject_name: string;
    subject_code: string;
    marks_obtained: string | number;
    total_marks: string | number;
    grade: string;
    subject_teacher_remarks: string;
  }>;
  remarks: {
    class_teacher_remarks: string;
    headteacher_remarks: string;
    next_term_begins: string;
  } | null;
  summary: {
    totalSubjects: number;
    totalObtained: number;
    totalMax: number;
    average: number;
    aggregate: number;
    term: string;
    academicYear: string;
  };
}

const GRADE_COLORS: Record<string, [number, number, number]> = {
  D1: [16, 185, 129],
  D2: [34, 197, 94],
  C3: [59, 130, 246],
  C4: [96, 165, 250],
  C5: [234, 179, 8],
  C6: [249, 115, 22],
  P7: [239, 68, 68],
  F8: [185, 28, 28],
};

export function generateReportCardPDF(data: ReportCardData, classRank?: number, classTotal?: number): void {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Header ──────────────────────────────────────────────────────────────────
  // School name header (large)
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.student.school_name.toUpperCase(), pageW / 2, 13, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.student.school_address} | ${data.student.school_phone} | ${data.student.school_email}`, pageW / 2, 21, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`STUDENT ACADEMIC REPORT CARD`, pageW / 2, 27, { align: 'center' });

  y = 36;

  // ── Student Info Bar ─────────────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, pageW - margin * 2, 28, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageW - margin * 2, 28, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.student.first_name} ${data.student.last_name}`, margin + 4, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const leftCol = margin + 4;
  const rightCol = pageW / 2 + 5;
  doc.text(`Student No: ${data.student.student_number || data.student.payment_code}`, leftCol, y + 15);
  doc.text(`Class: ${data.student.class_name}`, leftCol, y + 21);
  doc.text(`Gender: ${data.student.gender?.charAt(0).toUpperCase() + data.student.gender?.slice(1) || '—'}`, rightCol, y + 15);
  doc.text(`Term: ${data.summary.term || '—'}  |  Year: ${data.summary.academicYear || '—'}`, rightCol, y + 21);

  if (classRank && classTotal) {
    doc.text(`Position: ${classRank} / ${classTotal}`, pageW - margin - 4, y + 15, { align: 'right' });
  }

  y += 34;

  // ── Marks Table ─────────────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT PERFORMANCE', margin, y);
  y += 5;

  const tableBody = data.marks.map(m => {
    const obtained = parseFloat(String(m.marks_obtained));
    const total = parseFloat(String(m.total_marks));
    const pct = total > 0 ? Math.round((obtained / total) * 100) : 0;
    return [
      m.subject_name,
      String(obtained),
      String(total),
      `${pct}%`,
      m.grade || '—',
      m.subject_teacher_remarks || '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Subject', 'Marks', 'Out of', '%', 'Grade', 'Teacher Remark']],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 'auto', fontStyle: 'italic', textColor: [71, 85, 105] },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const grade = String(hookData.cell.raw);
        const col = GRADE_COLORS[grade];
        if (col) hookData.cell.styles.textColor = col;
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Summary Box ─────────────────────────────────────────────────────────────
  const sumBoxW = (pageW - margin * 2) / 4 - 2;
  const summaryItems = [
    { label: 'Total Obtained', value: `${data.summary.totalObtained} / ${data.summary.totalMax}` },
    { label: 'Average', value: `${data.summary.average}%` },
    { label: 'Aggregate', value: String(data.summary.aggregate) },
    { label: 'Subjects', value: String(data.summary.totalSubjects) },
  ];

  summaryItems.forEach((item, i) => {
    const x = margin + i * (sumBoxW + 2.5);
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(x, y, sumBoxW, 16, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + sumBoxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(item.value, x + sumBoxW / 2, y + 12, { align: 'center' });
  });

  y += 22;

  // ── Grading Key ─────────────────────────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('GRADING SCALE:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const grades = [
    'D1 (90-100%)', 'D2 (80-89%)', 'C3 (70-79%)', 'C4 (60-69%)',
    'C5 (50-59%)', 'C6 (45-49%)', 'P7 (35-44%)', 'F8 (<35%)',
  ];
  doc.text(grades.join('   '), margin + 28, y);

  y += 8;

  // ── Remarks Section ──────────────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = margin; }

  const remBoxH = 24;
  const remBoxW = (pageW - margin * 2 - 4) / 2;

  // Class Teacher Remarks
  doc.setFillColor(250, 250, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, remBoxW, remBoxH, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text("CLASS TEACHER'S REMARKS", margin + 3, y + 6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(51, 65, 85);
  const classRemarksText = data.remarks?.class_teacher_remarks || '___________________________________';
  const classRemarksLines = doc.splitTextToSize(classRemarksText, remBoxW - 6);
  doc.text(classRemarksLines.slice(0, 2), margin + 3, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature: ___________________', margin + 3, y + 22);

  // Head Teacher Remarks
  const rx = margin + remBoxW + 4;
  doc.setFillColor(250, 250, 255);
  doc.rect(rx, y, remBoxW, remBoxH, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text("HEAD TEACHER'S REMARKS", rx + 3, y + 6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(51, 65, 85);
  const htRemarksText = data.remarks?.headteacher_remarks || '___________________________________';
  const htRemarksLines = doc.splitTextToSize(htRemarksText, remBoxW - 6);
  doc.text(htRemarksLines.slice(0, 2), rx + 3, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Signature: ___________________', rx + 3, y + 22);

  y += remBoxH + 6;

  // Next term date
  if (data.remarks?.next_term_begins) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Next Term Begins: `, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(new Date(data.remarks.next_term_begins).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }), margin + 32, y);
    y += 7;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 8;
  doc.setFillColor(30, 64, 175);
  doc.rect(0, footerY - 2, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by ZaabuPay — zaabupayapp.com | ${new Date().toLocaleDateString()}`, pageW / 2, footerY + 3, { align: 'center' });

  // Save
  const filename = `ReportCard_${data.student.first_name}_${data.student.last_name}_${data.summary.term || ''}_${data.summary.academicYear || ''}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}
