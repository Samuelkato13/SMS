import type jsPDF from 'jspdf';

export type ChartMarkRow = {
  subject: string;
  obtained: number;
  total: number;
  grade: string;
};

const GRADE_RGB: Record<string, [number, number, number]> = {
  D1: [16, 185, 129],
  D2: [34, 197, 94],
  C3: [59, 130, 246],
  C4: [96, 165, 250],
  C5: [234, 179, 8],
  C6: [249, 115, 22],
  P7: [239, 68, 68],
  F8: [185, 28, 28],
};

const DEFAULT_BAR: [number, number, number] = [148, 163, 184];

function pct(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (obtained / total) * 100));
}

function barColorForPct(p: number): [number, number, number] {
  if (p >= 80) return [16, 185, 129];
  if (p >= 70) return [34, 197, 94];
  if (p >= 60) return [59, 130, 246];
  if (p >= 50) return [234, 179, 8];
  if (p >= 35) return [249, 115, 22];
  return [239, 68, 68];
}

/** Count grades (D1…F8) from rows */
export function countGrades(rows: ChartMarkRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const g = (r.grade || 'F8').toUpperCase();
    const key = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'F8'].includes(g) ? g : 'F8';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

/**
 * Second page: visual performance — subject % bars + grade-mix strip + mini column chart.
 */
export function drawReportCardPerformancePage(
  doc: jsPDF,
  opts: { studentLabel: string; termYear?: string; rows: ChartMarkRow[] }
): void {
  const { studentLabel, termYear, rows } = opts;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  doc.addPage();
  let y = margin;

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PERFORMANCE OVERVIEW (VISUAL SUMMARY)', pageW / 2, 11, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Back of report — at-a-glance view of how the learner is performing', pageW / 2, 18, { align: 'center' });

  y = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(studentLabel, margin, y);
  y += 5;
  if (termYear) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(termYear, margin, y);
    y += 7;
  } else {
    y += 4;
  }

  doc.setTextColor(30, 64, 175);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Score by subject (% of maximum)', margin, y);
  y += 6;

  const labelW = 42;
  const barX = margin + labelW;
  const barW = pageW - margin * 2 - labelW - 22;
  const rowH = 6.5;

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No marks to chart yet.', margin, y);
    y += 10;
  } else {
    const sorted = [...rows].sort((a, b) => pct(b.obtained, b.total) - pct(a.obtained, a.total));
    for (const r of sorted) {
      const p = pct(r.obtained, r.total);
      const [cr, cg, cb] = barColorForPct(p);
      const label = doc.splitTextToSize(r.subject || '—', labelW - 2)[0] as string;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(barX, y - 4, barW, rowH - 1, 0.5, 0.5, 'FD');

      const fillW = (barW - 1) * (p / 100);
      if (fillW > 0.5) {
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(barX + 0.5, y - 3.5, fillW, rowH - 2, 0.4, 0.4, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${Math.round(p)}%`, barX + barW + 2, y);

      y += rowH;
      if (y > pageH - 95) break;
    }
    if (sorted.length > 0 && y > pageH - 95) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('(Additional subjects omitted — print full table on front page.)', margin, y);
      y += 5;
    }
  }

  y += 6;
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. Grade mix (this report)', margin, y);
  y += 5;

  const order = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'F8'];
  const counts = countGrades(rows);
  const total = rows.length || 0;
  const stripX = margin;
  const stripW = pageW - margin * 2;
  const stripH = 7;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(stripX, y, stripW, stripH, 1, 1, 'FD');

  if (total === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No grades to show.', stripX + stripW / 2, y + 4.5, { align: 'center' });
    y += stripH + 8;
  } else {
    let x = stripX + 0.5;
    for (const g of order) {
      const c = counts[g] || 0;
      if (c === 0) continue;
      const w = ((c / total) * (stripW - 1));
      const col = GRADE_RGB[g] || DEFAULT_BAR;
      doc.setFillColor(col[0], col[1], col[2]);
      doc.rect(x, y + 0.5, Math.max(w, 1.2), stripH - 1, 'F');
      x += w;
    }
    y += stripH + 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let lx = margin;
    for (const g of order) {
      const c = counts[g] || 0;
      if (c === 0) continue;
      const col = GRADE_RGB[g] || DEFAULT_BAR;
      doc.setFillColor(col[0], col[1], col[2]);
      doc.rect(lx, y, 3, 3, 'F');
      doc.setTextColor(51, 65, 85);
      doc.text(`${g}: ${c}`, lx + 5, y + 2.2);
      lx += 22;
      if (lx > pageW - margin - 30) {
        lx = margin;
        y += 4;
      }
    }
    y += 8;
  }

  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. Grade distribution (count per band)', margin, y);
  y += 6;

  const histX = margin;
  const histW = pageW - margin * 2;
  const histH = 38;
  const baseY = y + histH - 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(histX, baseY, histX + histW, baseY);

  const maxC = Math.max(...order.map((g) => counts[g] || 0), 1);
  const colW = (histW - 4) / order.length;
  order.forEach((g, i) => {
    const c = counts[g] || 0;
    const h = (c / maxC) * (histH - 10);
    const cx = histX + 2 + i * colW;
    const col = GRADE_RGB[g] || DEFAULT_BAR;
    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(cx + 1, baseY - h, colW - 4, Math.max(h, 0.5), 0.3, 0.3, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(g, cx + colW / 2 - 3, baseY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(c), cx + colW / 2 - 2, baseY - h - 2);
    doc.setFont('helvetica', 'normal');
  });

  y += histH + 14;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('How to read this page', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  const tip =
    'Bars in section 1 show each subject as a percentage of the maximum mark — longer bar means stronger performance in that subject. ' +
    'Section 2 shows what share of subjects fell in each grade band. Section 3 counts how many subjects are in each band — use all three together to see balance (e.g. strong in some subjects but weak in others).';
  const tipLines = doc.splitTextToSize(tip, pageW - margin * 2 - 6);
  doc.text(tipLines, margin + 3, y + 11);

  const fy = pageH - 9;
  doc.setFillColor(30, 64, 175);
  doc.rect(0, fy - 2, pageW, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('ZaabuPay — visual performance summary', pageW / 2, fy + 3, { align: 'center' });
}
