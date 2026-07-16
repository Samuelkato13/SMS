import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../db";
import xlsx from "xlsx";

const UPLOADS_DIR = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file provided" });
      res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/upload", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      if (!filePath) return res.status(400).json({ message: "Path required" });
      const filename = String(filePath).replace(/\//g, '_').replace(/^_uploads_/, '');
      const fullPath = path.join(UPLOADS_DIR, path.basename(filename));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Preview parsed marks from an uploaded Excel/CSV file.
  // Expected multipart form-data: file, plus fields: schoolId, classId, examId, term, academicYear, subjectId (optional)
  app.post('/api/reports/upload-preview', upload.single('file'), async (req, res) => {
    try {
      const { schoolId, classId, examId, subjectId, term, academicYear } = req.body;
      if (!req.file) return res.status(400).json({ message: 'No file provided' });
      if (!schoolId) return res.status(400).json({ message: 'schoolId required' });
      if (!classId) return res.status(400).json({ message: 'classId required' });
      if (!examId) return res.status(400).json({ message: 'examId required' });

      const normalize = (value: any) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
      const admissionKeys = ['admission number','admission_number','student number','student_number','admissionno','admission no','admission','student'];
      const firstNameKeys = ['first name','first_name','firstname','first'];
      const lastNameKeys = ['last name','last_name','lastname','last'];
      const fullNameKeys = ['full name','full_name','fullname','name','student name','student_name'];
      const subjectKeys = ['subject','subject name','subject_name','subjectname'];
      const marksKeys = ['marks','marks obtained','marks_obtained','score','mark'];
      const reservedKeys = new Set([...admissionKeys, ...firstNameKeys, ...lastNameKeys, ...fullNameKeys, ...subjectKeys, ...marksKeys, 'term','academic year','academic_year','year']);

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: null });

      const subjectsRes = await pool.query('SELECT id, name, code FROM subjects WHERE school_id=$1', [schoolId]);
      const subjectNameMap = new Map<string, string>();
      const subjectCodeMap = new Map<string, string>();
      subjectsRes.rows.forEach((s: any) => {
        if (s.name) subjectNameMap.set(normalize(s.name), s.id);
        if (s.code) subjectCodeMap.set(normalize(s.code), s.id);
      });
      const findSubjectId = (value: any) => {
        if (!value) return null;
        const normalized = normalize(value);
        return subjectNameMap.get(normalized) || subjectCodeMap.get(normalized) || null;
      };

      let examTotal: number | null = null;
      if (examId) {
        try {
          const er = await pool.query('SELECT total_marks FROM exams WHERE id=$1 LIMIT 1', [examId]);
          examTotal = er.rows[0]?.total_marks || null;
        } catch (e) { examTotal = null; }
      }

      const findField = (row: any, keys: string[]) => {
        for (const key of Object.keys(row)) {
          if (keys.includes(normalize(key))) return row[key];
        }
        return null;
      };

      const wideSubjectHeaders = rows.length
        ? Object.keys(rows[0]).filter((h: string) => !reservedKeys.has(normalize(h)))
        : [];
      const useWideFormat = wideSubjectHeaders.length > 0;

      const preview: any[] = [];
      let rowIdx = 0;
      for (const r of rows) {
        rowIdx += 1;
        const errors: string[] = [];
        const admission = findField(r, admissionKeys);
        const firstName = findField(r, firstNameKeys);
        const lastName = findField(r, lastNameKeys);
        const fullname = findField(r, fullNameKeys) || (firstName && lastName ? `${firstName} ${lastName}` : null);

        let studentId: string | null = null;
        if (admission) {
          const ps = await pool.query('SELECT id FROM students WHERE admission_number=$1 AND school_id=$2 LIMIT 1', [String(admission), schoolId]);
          if (ps.rows.length) studentId = ps.rows[0].id;
        }
        if (!studentId && fullname) {
          const ps = await pool.query(
            `SELECT id FROM students WHERE (first_name||' '||last_name) ILIKE $1 AND school_id=$2 AND class_id=$3 LIMIT 1`,
            [fullname, schoolId, classId]
          );
          if (ps.rows.length) studentId = ps.rows[0].id;
        }

        if (!admission && !fullname) errors.push('Missing admission_number or student name');
        if (!studentId) errors.push('Student not found');

        const rowSubject = findField(r, subjectKeys);
        const rowMarks = findField(r, marksKeys);

        const pushPreviewEntry = (entry: any) => {
          preview.push({ row: rowIdx, admission, fullname, studentId, classId, examId, term, academicYear, ...entry });
        };

        if (useWideFormat) {
          for (const header of wideSubjectHeaders) {
            const rawValue = r[header];
            const rawMarks = rawValue === null || rawValue === undefined ? '' : rawValue;
            const subjectName = header;
            const subjectIdFromHeader = findSubjectId(subjectName);
            const cellErrors: string[] = [];
            let marks: number | null = null;
            if (rawMarks === '' || rawMarks === null || rawMarks === undefined) {
              cellErrors.push('Missing marks');
            } else {
              const parsed = parseFloat(String(rawMarks).replace(/,/g, ''));
              if (Number.isNaN(parsed)) cellErrors.push('Marks non-numeric');
              else {
                marks = parsed;
                if (marks < 0) cellErrors.push('Marks negative');
                if (examTotal !== null && marks > Number(examTotal)) cellErrors.push(`Marks (${marks}) exceed exam total (${examTotal})`);
              }
            }
            if (!subjectIdFromHeader) cellErrors.push(`Unknown subject '${subjectName}'`);
            pushPreviewEntry({ subjectName, subjectId: subjectIdFromHeader, marks, raw: rawValue, errors: [...errors, ...cellErrors] });
          }
        } else {
          const marksValue = rowMarks === null || rowMarks === undefined ? '' : rowMarks;
          let marks: number | null = null;
          if (marksValue === '' || marksValue === null || marksValue === undefined) {
            errors.push('Missing marks');
          } else {
            const parsed = parseFloat(String(marksValue).replace(/,/g, ''));
            if (Number.isNaN(parsed)) errors.push('Marks non-numeric');
            else {
              marks = parsed;
              if (marks < 0) errors.push('Marks negative');
              if (examTotal !== null && marks > Number(examTotal)) errors.push(`Marks (${marks}) exceed exam total (${examTotal})`);
            }
          }

          let targetSubjectId = subjectId || null;
          let targetSubjectName = rowSubject || null;
          if (!targetSubjectId) {
            targetSubjectId = findSubjectId(targetSubjectName);
            if (!targetSubjectName && targetSubjectId) targetSubjectName = subjectsRes.rows.find((s: any) => s.id === targetSubjectId)?.name;
          }
          if (!targetSubjectId) errors.push('Missing or unknown subject');
          pushPreviewEntry({ subjectName: targetSubjectName, subjectId: targetSubjectId, marks, raw: marksValue, errors });
        }
      }

      try {
        const auditLine = JSON.stringify({ type: 'preview', filename: req.file.filename, schoolId, classId, examId, subjectId, term, academicYear, rows: rows.length, timestamp: new Date().toISOString(), errors: preview.filter(p => (p.errors || []).length > 0).length });
        fs.appendFileSync(path.join(UPLOADS_DIR, 'upload_audit.log'), auditLine + '\n');
      } catch (e) { /* ignore audit errors */ }

      res.json({ preview, filename: req.file.filename });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Commit parsed rows to marks table.
  // Accept JSON body: { rows: [{ admission, studentId, marks }], schoolId, classId, examId, subjectId, term, academicYear, recordedBy }
  app.post('/api/reports/commit', async (req, res) => {
    try {
      const { rows, schoolId, classId, examId, subjectId, term, academicYear, recordedBy, createMissing } = req.body;
      if (!Array.isArray(rows) || !schoolId || !classId || !examId) return res.status(400).json({ message: 'Missing required fields' });

      const normalize = (value: any) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
      const subjectsRes = await pool.query('SELECT id, name, code FROM subjects WHERE school_id=$1', [schoolId]);
      const subjectNameMap = new Map<string, string>();
      const subjectCodeMap = new Map<string, string>();
      subjectsRes.rows.forEach((s: any) => {
        if (s.name) subjectNameMap.set(normalize(s.name), s.id);
        if (s.code) subjectCodeMap.set(normalize(s.code), s.id);
      });
      const findSubjectId = (value: any) => {
        if (!value) return null;
        const normalized = normalize(value);
        return subjectNameMap.get(normalized) || subjectCodeMap.get(normalized) || null;
      };

      let recorderRole = null;
      if (recordedBy) {
        const u = await pool.query('SELECT role FROM users WHERE id=$1 LIMIT 1', [recordedBy]);
        recorderRole = u.rows[0]?.role || null;
      }
      const allowCreate = createMissing && (recorderRole === 'head_teacher' || recorderRole === 'class_teacher');

      const results: any[] = [];
      for (const r of rows) {
        let studentId = r.studentId;
        if (!studentId && r.admission) {
          const ps = await pool.query('SELECT id FROM students WHERE admission_number=$1 AND school_id=$2 LIMIT 1', [String(r.admission), schoolId]);
          if (ps.rows.length) studentId = ps.rows[0].id;
        }

        if (!studentId && r.fullname) {
          const ps = await pool.query(
            `SELECT id FROM students WHERE (first_name||' '||last_name) ILIKE $1 AND school_id=$2 AND class_id=$3 LIMIT 1`,
            [String(r.fullname), schoolId, classId]
          );
          if (ps.rows.length) studentId = ps.rows[0].id;
        }

        if (!studentId && allowCreate) {
          let fn: string | null = null; let ln: string | null = null;
          if (r.fullname) {
            const parts = String(r.fullname).trim().split(/\s+/);
            fn = parts.shift() || 'Unknown'; ln = parts.join(' ') || 'Student';
          } else if (r.raw && (r.raw.first_name || r.raw.firstName)) { fn = r.raw.first_name || r.raw.firstName; ln = r.raw.last_name || r.raw.lastName || 'Student'; }
          const abbrR = await pool.query('SELECT abbreviation FROM schools WHERE id=$1', [schoolId]);
          const schoolAbbr = abbrR.rows[0]?.abbreviation || 'SCH';
          const countRes = await pool.query('SELECT COUNT(*) FROM students WHERE school_id=$1', [schoolId]);
          const count = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
          const yearNow = new Date().getFullYear();
          const paymentCode = `${schoolAbbr}-${yearNow}-${count}`;
          const insertRes = await pool.query(
            `INSERT INTO students (first_name, last_name, class_id, school_id, payment_code, admission_number, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
            [fn || 'Unknown', ln || 'Student', classId, schoolId, paymentCode, r.admission || null]
          );
          studentId = insertRes.rows[0]?.id;
        }

        if (!studentId) continue;

        let targetSubjectId = r.subjectId || r.subject_id || null;
        if (!targetSubjectId) targetSubjectId = findSubjectId(r.subjectName || r.subject || r.subject_name || r.subjectName);
        if (!targetSubjectId && subjectId) targetSubjectId = subjectId;
        if (!targetSubjectId) continue;

        const marksObtained = parseFloat(r.marks ?? r.Marks ?? r.score ?? r.marks_obtained);
        if (isNaN(marksObtained)) continue;

        const examRow = await pool.query('SELECT total_marks FROM exams WHERE id=$1', [examId]);
        const total = examRow.rows[0]?.total_marks || 100;
        const pct = (marksObtained / total) * 100;
        let grade = 'F8';
        if (pct >= 90) grade = 'D1'; else if (pct >= 80) grade = 'D2'; else if (pct >= 70) grade = 'C3';
        else if (pct >= 60) grade = 'C4'; else if (pct >= 50) grade = 'C5'; else if (pct >= 45) grade = 'C6';
        else if (pct >= 35) grade = 'P7';

        const rres = await pool.query(
          `INSERT INTO marks (student_id, exam_id, subject_id, class_id, school_id, marks_obtained, total_marks, grade, term, academic_year, recorded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (student_id, exam_id, subject_id) DO UPDATE SET
             marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade, term=EXCLUDED.term, academic_year=EXCLUDED.academic_year, updated_at=NOW()
           RETURNING *`,
          [studentId, examId, targetSubjectId, classId, schoolId, marksObtained, total, grade, term||'Term 1', academicYear||new Date().getFullYear(), recordedBy||null]
        );
        results.push(rres.rows[0]);
      }

      res.json({ saved: results.length, marks: results });
      try {
        const auditLine = JSON.stringify({ type: 'commit', schoolId, classId, examId, subjectId, recordedBy, created: results.length, timestamp: new Date().toISOString() });
        fs.appendFileSync(path.join(UPLOADS_DIR, 'upload_audit.log'), auditLine + '\n');
      } catch (e) { /* ignore */ }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Downloadable long-format marks template
  app.get('/api/reports/template', async (req, res) => {
  try {
    const { schoolId, classId } = req.query;
    if (!schoolId) return res.status(400).json({ message: 'schoolId required' });

    const subjectsRes = await pool.query('SELECT name FROM subjects WHERE school_id=$1 ORDER BY name', [schoolId]);
    const subjectNames = subjectsRes.rows.map((s: any) => s.name).filter(Boolean);

    let studentsRes = { rows: [] as any[] };
    if (classId) {
      studentsRes = await pool.query(
        `SELECT first_name, last_name FROM students WHERE school_id=$1 AND class_id=$2 AND is_active=true ORDER BY last_name, first_name`,
        [schoolId, classId]
      );
    }

    const header = ['first_name', 'last_name', ...subjectNames];
    const rows = studentsRes.rows.map((s: any) => [s.first_name, s.last_name, ...subjectNames.map(() => '')]);
    const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, ...subjectNames.map((n: string) => ({ wch: Math.max(14, n.length + 2) }))];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'template');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
   res.setHeader('Content-Disposition', 'attachment; filename="marks_template.xlsx"');
   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   res.send(buf);
  } catch (e: any) {
   res.status(500).json({ message: e.message });
 }
 });
}