import type { Express } from "express";
import pool from "../db";
import ExcelJS from "exceljs";
import { canUserRecordMarksForClassSubject } from "./staffAssignments";

export function registerMarksRoutes(app: Express) {
  app.get("/api/marks/template", async (req, res) => {
    try {
      const { schoolId, classId, examId, subjectId } = req.query;
      if (!schoolId || !classId || !examId) {
        return res.status(400).json({ message: "schoolId, classId, and examId required" });
      }

      const studentsRes = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.payment_code
         FROM students s WHERE s.class_id=$1 AND s.school_id=$2 AND s.is_active=true
         ORDER BY s.last_name, s.first_name`,
        [classId, schoolId]
      );

      const subjectsRes = await pool.query(
        `SELECT id, name, code FROM subjects WHERE school_id=$1 ${subjectId ? `AND id=$2` : ''}
         ORDER BY name`,
        subjectId ? [schoolId, subjectId] : [schoolId]
      );

      const examRes = await pool.query(
        `SELECT title, total_marks FROM exams WHERE id=$1`,
        [examId]
      );
      const examData = examRes.rows[0];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Marks");

      const subjectList = subjectsRes.rows;
      const columnDefs = [
        { header: "Admission Number", key: "admission", width: 18 },
        { header: "Student Name", key: "studentName", width: 20 },
      ];
      
      subjectList.forEach((s: any) => {
        columnDefs.push({
          header: s.name + (s.code ? ` (${s.code})` : ''),
          key: `subject_${s.id}`,
          width: 15,
        });
      });
      
      columnDefs.push({ header: "Remarks", key: "remarks", width: 20 });

      sheet.columns = columnDefs;

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };

      studentsRes.rows.forEach((student: any) => {
        const row: any = {
          admission: student.admission_number || student.payment_code,
          studentName: `${student.first_name} ${student.last_name}`,
          remarks: '',
        };
        sheet.addRow(row);
      });

      const refSheet = workbook.addWorksheet("Info (do not edit)");
      refSheet.addRow([`Exam: ${examData?.title || 'N/A'}`]);
      refSheet.addRow([`Max Marks: ${examData?.total_marks || 100}`]);
      refSheet.addRow([]);
      refSheet.addRow(["Instructions:"]);
      refSheet.addRow(["1. Enter marks for each student in the respective subject columns"]);
      refSheet.addRow(["2. Leave blank if student did not take the exam"]);
      refSheet.addRow(["3. Do not modify Admission Number or Student Name columns"]);
      refSheet.addRow(["4. Add optional remarks in the Remarks column"]);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=marks_template_${examData?.title || 'marks'}.xlsx`);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/marks", async (req, res) => {
    try {
      const { schoolId, examId, studentId, classId, subjectId, term, academicYear } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      // `students.student_number` does not exist in the current Postgres schema.
      // Use `admission_number` (kept for compatibility by aliasing to student_number in the response).
      let query = `SELECT m.*, s.first_name, s.last_name, s.admission_number AS student_number, s.payment_code,
                         s.section, s.class_id, st.name as stream_name, c.name as class_name,
                          sub.name as subject_name, sub.code as subject_code,
                          e.title as exam_title, e.total_marks as exam_total_marks, e.exam_type
                   FROM marks m JOIN students s ON m.student_id=s.id
                   LEFT JOIN streams st ON s.stream_id=st.id
                   LEFT JOIN classes c ON s.class_id=c.id
                   JOIN subjects sub ON m.subject_id=sub.id JOIN exams e ON m.exam_id=e.id
                   WHERE m.school_id=$1`;
      const params: any[] = [schoolId]; let idx = 2;
      if (examId) { query += ` AND m.exam_id=$${idx++}`; params.push(examId); }
      if (studentId) { query += ` AND m.student_id=$${idx++}`; params.push(studentId); }
      if (classId) { query += ` AND m.class_id=$${idx++}`; params.push(classId); }
      if (subjectId) { query += ` AND m.subject_id=$${idx++}`; params.push(subjectId); }
      if (term) { query += ` AND m.term=$${idx++}`; params.push(term); }
      if (academicYear) { query += ` AND m.academic_year=$${idx++}`; params.push(academicYear); }
      query += ` ORDER BY s.last_name, sub.name`;
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/marks/bulk", async (req, res) => {
    try {
      const { entries, examId, classId, schoolId, term, academicYear, recordedBy,
              editReason, editedBy, editedByName } = req.body;
      if (!Array.isArray(entries) || !examId || !classId || !schoolId)
        return res.status(400).json({ message: "Missing required fields" });

      if (recordedBy) {
        for (const entry of entries) {
    const {
        studentId,
        subjectId,
        marksObtained,
        subjectTeacherRemarks,
    } = entry;

    if (!subjectId) continue;
          const allowed = await canUserRecordMarksForClassSubject(
            String(recordedBy),
            String(subjectId),
            String(classId),
            String(schoolId)
          );
          if (!allowed) {
            return res.status(403).json({
              message: "Not allowed to record marks for one or more selected subjects in this class. Ask your director or head teacher to assign you as class teacher or subject teacher for the relevant subjects.",
            });
          }
        }
      }
      const results = [];
      for (const entry of entries) {
        const { studentId, subjectId, marksObtained, subjectTeacherRemarks } = entry;
        if (!studentId || !subjectId || marksObtained === undefined || marksObtained === null || marksObtained === '') continue;
        const score = parseFloat(marksObtained);
        if (isNaN(score)) continue;
        const examRow = await pool.query('SELECT total_marks FROM exams WHERE id=$1', [examId]);
        const total = examRow.rows[0]?.total_marks || 100;
        const pct = (score / total) * 100;
        let grade = 'F8';
        if (pct >= 90) grade = 'D1'; else if (pct >= 80) grade = 'D2'; else if (pct >= 70) grade = 'C3';
        else if (pct >= 60) grade = 'C4'; else if (pct >= 50) grade = 'C5'; else if (pct >= 45) grade = 'C6';
        else if (pct >= 35) grade = 'P7';
        const r = await pool.query(
          `INSERT INTO marks (student_id, exam_id, subject_id, class_id, school_id, marks_obtained, total_marks,
            grade, term, academic_year, subject_teacher_remarks, recorded_by, edit_reason, edited_by, edited_by_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (student_id, exam_id, subject_id) DO UPDATE SET
             marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade, term=EXCLUDED.term,
             academic_year=EXCLUDED.academic_year, subject_teacher_remarks=EXCLUDED.subject_teacher_remarks,
             recorded_by=EXCLUDED.recorded_by,
             edit_reason=COALESCE(EXCLUDED.edit_reason, marks.edit_reason),
             edited_by=COALESCE(EXCLUDED.edited_by, marks.edited_by),
             edited_by_name=COALESCE(EXCLUDED.edited_by_name, marks.edited_by_name),
             updated_at=NOW()
           RETURNING *`,
          [studentId, examId, subjectId, classId, schoolId, score, total, grade,
           term||'Term 1', academicYear||'2025', subjectTeacherRemarks||null, recordedBy,
           editReason||null, editedBy||null, editedByName||null]
        );
        results.push(r.rows[0]);
      }
      res.json({ saved: results.length, marks: results });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Marks Entry Permissions ────────────────────────────────────────────────
  app.get("/api/marks-permissions", async (req, res) => {
    const { schoolId, classId, subjectId, examId } = req.query;
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });
    try {
      let q = `SELECT mep.*, u.first_name||' '||u.last_name AS granted_by_name_live
               FROM marks_entry_permissions mep
               LEFT JOIN users u ON u.id=mep.granted_by
               WHERE mep.school_id=$1`;
      const params: any[] = [schoolId]; let idx = 2;
      if (classId)   { q += ` AND mep.class_id=$${idx++}`;   params.push(classId); }
      if (subjectId) { q += ` AND mep.subject_id=$${idx++}`; params.push(subjectId); }
      if (examId)    { q += ` AND mep.exam_id=$${idx++}`;    params.push(examId); }
      q += ' ORDER BY mep.created_at DESC';
      const r = await pool.query(q, params);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/marks-permissions", async (req, res) => {
    const { schoolId, classId, subjectId, examId, grantedBy, grantedByName, notes } = req.body;
    if (!schoolId || !classId || !subjectId || !examId)
      return res.status(400).json({ message: "schoolId, classId, subjectId, examId required" });
    try {
      const r = await pool.query(
        `INSERT INTO marks_entry_permissions
           (school_id, class_id, subject_id, exam_id, granted_by, granted_by_name, is_active, notes)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7)
         ON CONFLICT (class_id, subject_id, exam_id, granted_to_role) DO UPDATE SET
           is_active=true, granted_by=EXCLUDED.granted_by,
           granted_by_name=EXCLUDED.granted_by_name, notes=EXCLUDED.notes
         RETURNING *`,
        [schoolId, classId, subjectId, examId, grantedBy||null, grantedByName||null, notes||null]
      );
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put("/api/marks-permissions/:id", async (req, res) => {
    const { isActive } = req.body;
    try {
      const r = await pool.query(
        `UPDATE marks_entry_permissions SET is_active=$1 WHERE id=$2 RETURNING *`,
        [isActive, req.params.id]
      );
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/marks-permissions/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM marks_entry_permissions WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/marks/lock", async (req, res) => {
    try {
      const { examId, classId, schoolId, subjectId, lock, approvedBy } = req.body;
      if (!examId || !schoolId) return res.status(400).json({ message: "examId and schoolId required" });
      let query = `UPDATE marks SET is_locked=$1, approved_by=$2, updated_at=NOW()
                   WHERE exam_id=$3 AND school_id=$4`;
      const params: any[] = [lock!==false, approvedBy||null, examId, schoolId]; let idx = 5;
      if (classId) { query += ` AND class_id=$${idx++}`; params.push(classId); }
      if (subjectId) { query += ` AND subject_id=$${idx++}`; params.push(subjectId); }
      query += ' RETURNING id';
      const result = await pool.query(query, params);
      res.json({ locked: result.rowCount, message: `${result.rowCount} marks ${lock!==false?'locked':'unlocked'}` });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/marks", async (req, res) => {
    try {
      const { studentId, examId, subjectId, classId, schoolId, marksObtained, totalMarks, grade, remarks, recordedBy, term, academicYear } = req.body;
      if (recordedBy) {
        const allowed = await canUserRecordMarksForClassSubject(
          String(recordedBy),
          String(subjectId),
          String(classId),
          String(schoolId)
        );
        if (!allowed) {
          return res.status(403).json({
            message: "Not allowed to record marks for this class and subject.",
          });
        }
      }
      const result = await pool.query(
        `INSERT INTO marks (student_id, exam_id, subject_id, class_id, school_id, marks_obtained, total_marks, grade, remarks, recorded_by, term, academic_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (student_id, exam_id, subject_id) DO UPDATE SET
           marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade, updated_at=NOW()
         RETURNING *`,
        [studentId, examId, subjectId, classId, schoolId, marksObtained, totalMarks, grade, remarks, recordedBy, term||'Term 1', academicYear||'2025']
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Report cards ─────────────────────────────────────────────────────────────
  app.get("/api/report-cards/student", async (req, res) => {
    try {
      const { studentId, schoolId, term, academicYear, examId } = req.query;
      if (!studentId || !schoolId) return res.status(400).json({ message: "studentId and schoolId required" });
      const studentResult = await pool.query(
        `SELECT s.*, c.name as class_name, c.level as class_level, sch.name as school_name,
                sch.abbreviation as school_abbr, sch.address as school_address, sch.phone as school_phone,
                sch.email as school_email, sch.logo_url
         FROM students s JOIN classes c ON s.class_id=c.id JOIN schools sch ON s.school_id=sch.id
         WHERE s.id=$1 AND s.school_id=$2`, [studentId, schoolId]);
      if (!studentResult.rows.length) return res.status(404).json({ message: "Student not found" });
      const student = studentResult.rows[0];
      let mq = `SELECT m.*, sub.name as subject_name, sub.code as subject_code,
                        e.title as exam_title, e.total_marks as exam_total, e.exam_type,
                        u.first_name || ' ' || u.last_name as teacher_name
                FROM marks m JOIN subjects sub ON m.subject_id=sub.id JOIN exams e ON m.exam_id=e.id
                LEFT JOIN users u ON m.recorded_by=u.id
                WHERE m.student_id=$1 AND m.school_id=$2`;
      const mp: any[] = [studentId, schoolId]; let midx = 3;
      if (term) { mq += ` AND m.term=$${midx++}`; mp.push(term); }
      if (academicYear) { mq += ` AND m.academic_year=$${midx++}`; mp.push(academicYear); }
      if (examId) { mq += ` AND m.exam_id=$${midx++}`; mp.push(examId); }
      mq += ` ORDER BY sub.name`;
      const marksResult = await pool.query(mq, mp);
      let rq = `SELECT * FROM report_card_remarks WHERE student_id=$1`; const rp: any[] = [studentId]; let ridx = 2;
      if (term) { rq += ` AND term=$${ridx++}`; rp.push(term); }
      if (academicYear) { rq += ` AND academic_year=$${ridx++}`; rp.push(academicYear); }
      const remarksResult = await pool.query(rq, rp);
      const marksData = marksResult.rows;
      const totalObtained = marksData.reduce((sum: number, m: any) => sum + parseFloat(m.marks_obtained), 0);
      const totalMax = marksData.reduce((sum: number, m: any) => sum + parseFloat(m.total_marks || m.exam_total || 100), 0);
      const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const gradePoints: Record<string, number> = { D1:1, D2:2, C3:3, C4:4, C5:5, C6:6, P7:7, F8:8 };
      const aggregate = marksData.reduce((sum: number, m: any) => sum + (gradePoints[m.grade] || 8), 0);
      res.json({ student, marks: marksData, remarks: remarksResult.rows[0]||null,
        summary: { totalSubjects: marksData.length, totalObtained: Math.round(totalObtained*10)/10,
          totalMax, average: Math.round(average*10)/10, aggregate,
          term: term||marksData[0]?.term, academicYear: academicYear||marksData[0]?.academic_year }});
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/report-cards/class", async (req, res) => {
    try {
      const { schoolId, classId, term, academicYear, examId } = req.query;
      if (!schoolId || !classId) return res.status(400).json({ message: "schoolId and classId required" });
      const studentsResult = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id=c.id
         WHERE s.class_id=$1 AND s.school_id=$2 AND s.is_active=true ORDER BY s.first_name`,
        [classId, schoolId]);
      const gradePoints: Record<string, number> = { D1:1, D2:2, C3:3, C4:4, C5:5, C6:6, P7:7, F8:8 };
      const cards = await Promise.all(studentsResult.rows.map(async (student: any) => {
        let mq = `SELECT m.marks_obtained, m.total_marks, m.grade, sub.name as subject_name
                  FROM marks m JOIN subjects sub ON m.subject_id=sub.id
                  WHERE m.student_id=$1 AND m.school_id=$2`;
        const mp: any[] = [student.id, schoolId]; let idx = 3;
        if (term) { mq += ` AND m.term=$${idx++}`; mp.push(term); }
        if (academicYear) { mq += ` AND m.academic_year=$${idx++}`; mp.push(academicYear); }
        if (examId) { mq += ` AND m.exam_id=$${idx++}`; mp.push(examId); }
        const marks = await pool.query(mq, mp);
        const md = marks.rows;
        const totalObtained = md.reduce((s: number, m: any) => s + parseFloat(m.marks_obtained), 0);
        const totalMax = md.reduce((s: number, m: any) => s + parseFloat(m.total_marks || 100), 0);
        const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const aggregate = md.reduce((s: number, m: any) => s + (gradePoints[m.grade] || 8), 0);
        return { student, totalObtained: Math.round(totalObtained*10)/10, totalMax,
          average: Math.round(average*10)/10, aggregate, subjectCount: md.length };
      }));
      const ranked = [...cards].sort((a, b) => b.average - a.average).map((card, i) => ({ ...card, rank: i+1 }));
      res.json(ranked);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/report-cards/remarks", async (req, res) => {
    try {
      const { studentId, schoolId, classId, term, academicYear, classTeacherRemarks, headteacherRemarks, nextTermBegins, isPublished } = req.body;
      if (!studentId || !schoolId || !term || !academicYear)
        return res.status(400).json({ message: "studentId, schoolId, term, academicYear required" });
      const result = await pool.query(
        `INSERT INTO report_card_remarks (student_id, school_id, class_id, term, academic_year, class_teacher_remarks, headteacher_remarks, next_term_begins, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (student_id, term, academic_year) DO UPDATE SET
           class_teacher_remarks=EXCLUDED.class_teacher_remarks, headteacher_remarks=EXCLUDED.headteacher_remarks,
           next_term_begins=EXCLUDED.next_term_begins, is_published=EXCLUDED.is_published,
           published_at=CASE WHEN EXCLUDED.is_published THEN NOW() ELSE report_card_remarks.published_at END, updated_at=NOW()
         RETURNING *`,
        [studentId, schoolId, classId, term, academicYear, classTeacherRemarks, headteacherRemarks, nextTermBegins||null, isPublished||false]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // School stats
  app.get("/api/stats", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const [studRes, usersRes, classRes, paymentsRes, feesRes, marksRes, attRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM students WHERE school_id=$1 AND is_active=true`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM users WHERE school_id=$1 AND is_active=true AND role!='super_admin'`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM classes WHERE school_id=$1`, [schoolId]),
        pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE school_id=$1 AND status='completed'`, [schoolId]),
        pool.query(`SELECT COALESCE(SUM(amount),0) as expected FROM fee_structures WHERE school_id=$1`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM marks WHERE school_id=$1`, [schoolId]),
        pool.query(`SELECT COUNT(*) as present FROM attendance WHERE school_id=$1 AND status='present' AND attendance_date=CURRENT_DATE`, [schoolId]),
      ]);
      res.json({
        totalStudents: parseInt(studRes.rows[0].count),
        totalStaff: parseInt(usersRes.rows[0].count),
        totalClasses: parseInt(classRes.rows[0].count),
        totalRevenue: parseFloat(paymentsRes.rows[0].total),
        expectedRevenue: parseFloat(feesRes.rows[0].expected),
        totalMarks: parseInt(marksRes.rows[0].count),
        presentToday: parseInt(attRes.rows[0].present),
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Marks Submission Workflow ────────────────────────────────────────────
  app.post("/api/marks/submit", async (req, res) => {
    try {
      const { classId, examId, schoolId, submittedBy } = req.body;
      if (!classId || !examId || !schoolId || !submittedBy) {
        return res.status(400).json({ message: "classId, examId, schoolId, submittedBy required" });
      }

      // Get all marks for this class/exam that are in draft status
      const marksRes = await pool.query(
        `SELECT COUNT(*) as count FROM marks 
         WHERE class_id=$1 AND exam_id=$2 AND school_id=$3 AND submission_status='draft'`,
        [classId, examId, schoolId]
      );

      const totalMarks = parseInt(marksRes.rows[0].count);

      if (totalMarks === 0) {
        return res.status(400).json({ message: "No marks in draft status to submit" });
      }

      // Update all marks to submitted status
      await pool.query(
        `UPDATE marks SET submission_status='submitted', submitted_by=$1, submitted_at=NOW()
         WHERE class_id=$2 AND exam_id=$3 AND school_id=$4 AND submission_status='draft'`,
        [submittedBy, classId, examId, schoolId]
      );

      // Create/update submission record
      const result = await pool.query(
        `INSERT INTO marks_submissions (school_id, class_id, exam_id, submitted_by, submission_status, submitted_at, total_marks_count)
         VALUES ($1,$2,$3,$4,'submitted',NOW(),$5)
         ON CONFLICT (school_id, class_id, exam_id, submitted_by) DO UPDATE SET
           submission_status='submitted', submitted_at=NOW(), total_marks_count=$5
         RETURNING *`,
        [schoolId, classId, examId, submittedBy, totalMarks]
      );

      res.json({ message: "Marks submitted successfully", submission: result.rows[0] });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Head Teacher: Get pending submissions
  app.get("/api/marks/pending-submissions", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      const result = await pool.query(
        `SELECT ms.*, c.name as class_name, e.title as exam_title, 
                u.first_name || ' ' || u.last_name as submitted_by_name
         FROM marks_submissions ms
         JOIN classes c ON ms.class_id=c.id
         JOIN exams e ON ms.exam_id=e.id
         JOIN users u ON ms.submitted_by=u.id
         WHERE ms.school_id=$1 AND ms.submission_status IN ('submitted', 'under_review')
         ORDER BY ms.submitted_at DESC`,
        [schoolId]
      );

      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Head Teacher: Get marks for a specific submission
  app.get("/api/marks/submission-details", async (req, res) => {
    try {
      const { classId, examId, schoolId } = req.query;
      if (!classId || !examId || !schoolId) {
        return res.status(400).json({ message: "classId, examId, schoolId required" });
      }

      const result = await pool.query(
        `SELECT m.*, s.first_name, s.last_name, s.admission_number, sub.name as subject_name
         FROM marks m
         JOIN students s ON m.student_id=s.id
         JOIN subjects sub ON m.subject_id=sub.id
         WHERE m.class_id=$1 AND m.exam_id=$2 AND m.school_id=$3 AND m.submission_status IN ('submitted', 'under_review', 'approved')
         ORDER BY s.last_name, s.first_name, sub.name`,
        [classId, examId, schoolId]
      );

      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Generate auto-comment based on performance
  function generateAutoComment(average: number, aggregate: number): string {
    if (average >= 80) {
      return "Excellent performance. Continue with this dedicated spirit.";
    } else if (average >= 70) {
      return "Good progress. Keep up the excellent effort.";
    } else if (average >= 60) {
      return "Satisfactory performance. Work on areas of weakness.";
    } else if (average >= 50) {
      return "Average performance. More effort needed in key subjects.";
    } else {
      return "Below average performance. Seek additional support in weak areas.";
    }
  }

  // Head Teacher: Approve submission
  app.post("/api/marks/approve-submission", async (req, res) => {
    try {
      const { classId, examId, schoolId, htReviewedBy, htSignature } = req.body;
      if (!classId || !examId || !schoolId || !htReviewedBy) {
        return res.status(400).json({ message: "classId, examId, schoolId, htReviewedBy required" });
      }

      // Get all marks for this submission
      const marksRes = await pool.query(
        `SELECT m.*, s.first_name, s.last_name, sub.name as subject_name
         FROM marks m
         JOIN students s ON m.student_id=s.id
         JOIN subjects sub ON m.subject_id=sub.id
         WHERE m.class_id=$1 AND m.exam_id=$2 AND m.school_id=$3 AND m.submission_status='submitted'`,
        [classId, examId, schoolId]
      );

      const marks = marksRes.rows;

      // Calculate performance metrics for each student
      const studentMetrics: Record<string, any> = {};
      marks.forEach((m: any) => {
        if (!studentMetrics[m.student_id]) {
          studentMetrics[m.student_id] = { totalObtained: 0, totalMax: 0, count: 0 };
        }
        studentMetrics[m.student_id].totalObtained += parseFloat(m.marks_obtained) || 0;
        studentMetrics[m.student_id].totalMax += parseFloat(m.total_marks) || 100;
        studentMetrics[m.student_id].count += 1;
      });

      // Update marks with auto-comments and signature
      for (const studentId in studentMetrics) {
        const metrics = studentMetrics[studentId];
        const average = metrics.totalMax > 0 ? (metrics.totalObtained / metrics.totalMax) * 100 : 0;
        const autoComment = generateAutoComment(average, 0);

        await pool.query(
          `UPDATE marks SET 
             submission_status='approved', 
             ht_comment=$1, 
             ht_signature=$2,
             ht_approved_at=NOW(),
             auto_comment=$1
           WHERE student_id=$3 AND class_id=$4 AND exam_id=$5 AND school_id=$6`,
          [autoComment, htSignature || '', studentId, classId, examId, schoolId]
        );
      }

      // Update submission record
      await pool.query(
        `UPDATE marks_submissions SET 
           submission_status='approved',
           ht_reviewed_at=NOW(),
           ht_reviewed_by=$1,
           approved_marks_count=$2
         WHERE class_id=$3 AND exam_id=$4 AND school_id=$5`,
        [htReviewedBy, marks.length, classId, examId, schoolId]
      );

      res.json({ message: "Marks approved successfully", approvedCount: marks.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
