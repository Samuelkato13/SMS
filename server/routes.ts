import type { Express } from "express";
import { createServer, type Server } from "http";
import pool from "./db";

export async function registerRoutes(app: Express): Promise<Server> {

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  app.get("/api/auth/user", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) return res.status(400).json({ message: "Email required" });

      const result = await pool.query(
        `SELECT u.*, s.name as school_name, s.abbreviation as school_abbreviation
         FROM users u
         LEFT JOIN schools s ON u.school_id = s.id
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── SCHOOLS ──────────────────────────────────────────────────────────────
  app.get("/api/schools", async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT *, (SELECT COUNT(*) FROM students WHERE school_id = schools.id) as student_count
         FROM schools WHERE is_active = true ORDER BY name`
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/schools/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM schools WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: "School not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/schools", async (req, res) => {
    try {
      const { name, abbreviation, email, phone, address, logoUrl, subscriptionPlan } = req.body;
      const result = await pool.query(
        `INSERT INTO schools (name, abbreviation, email, phone, address, logo_url, subscription_plan)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, abbreviation, email, phone, address, logoUrl, subscriptionPlan || "starter"]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/schools/:id", async (req, res) => {
    try {
      const { name, abbreviation, email, phone, address, logoUrl } = req.body;
      const result = await pool.query(
        `UPDATE schools SET name=$1, abbreviation=$2, email=$3, phone=$4, address=$5, logo_url=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [name, abbreviation, email, phone, address, logoUrl, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "School not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  app.get("/api/users", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const query = schoolId
        ? `SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.school_id = $1 ORDER BY u.last_name`
        : `SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id ORDER BY u.last_name`;
      const result = await pool.query(query, schoolId ? [schoolId] : []);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { email, role, schoolId, firstName, lastName } = req.body;
      const abbr = await pool.query("SELECT abbreviation FROM schools WHERE id = $1", [schoolId]);
      const schoolAbbr = abbr.rows[0]?.abbreviation || "SYS";
      const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE school_id = $1", [schoolId]);
      const count = parseInt(countRes.rows[0].count) + 1;
      const username = `${schoolAbbr}_${role.replace("_", "")}_${count}`;

      const result = await pool.query(
        `INSERT INTO users (username, email, role, school_id, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [username, email, role, schoolId, firstName, lastName]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { role, firstName, lastName, isActive } = req.body;
      const result = await pool.query(
        `UPDATE users SET role=$1, first_name=$2, last_name=$3, is_active=$4, updated_at=NOW()
         WHERE id=$5 RETURNING *`,
        [role, firstName, lastName, isActive, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── CLASSES ──────────────────────────────────────────────────────────────
  app.get("/api/classes", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const result = await pool.query(
        `SELECT c.*, u.first_name || ' ' || u.last_name as teacher_name,
                (SELECT COUNT(*) FROM students WHERE class_id = c.id AND is_active = true) as student_count
         FROM classes c LEFT JOIN users u ON c.class_teacher_id = u.id
         WHERE c.school_id = $1 ORDER BY c.level, c.name`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const { name, level, section, schoolId, classTeacherId, academicYear, maxStudents } = req.body;
      const result = await pool.query(
        `INSERT INTO classes (name, level, section, school_id, class_teacher_id, academic_year, max_students)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, level, section, schoolId, classTeacherId, academicYear, maxStudents]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  app.get("/api/students", async (req, res) => {
    try {
      const { schoolId, classId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      let query = `SELECT s.*, c.name as class_name, c.level as class_level
                   FROM students s LEFT JOIN classes c ON s.class_id = c.id
                   WHERE s.school_id = $1 AND s.is_active = true`;
      const params: any[] = [schoolId];

      if (classId) {
        query += ` AND s.class_id = $2`;
        params.push(classId);
      }
      query += ` ORDER BY s.last_name, s.first_name`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = $1`,
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Student not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const { firstName, lastName, email, dateOfBirth, gender, classId, schoolId, guardianName, guardianPhone, guardianEmail, address } = req.body;

      // Generate payment code
      const abbr = await pool.query("SELECT abbreviation FROM schools WHERE id = $1", [schoolId]);
      const schoolAbbr = abbr.rows[0]?.abbreviation || "SCH";
      const countRes = await pool.query("SELECT COUNT(*) FROM students WHERE school_id = $1", [schoolId]);
      const count = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
      const year = new Date().getFullYear();
      const paymentCode = `${schoolAbbr}-${year}-${count}`;

      const result = await pool.query(
        `INSERT INTO students (first_name, last_name, email, date_of_birth, gender, class_id, school_id, payment_code, guardian_name, guardian_phone, guardian_email, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [firstName, lastName, email, dateOfBirth, gender, classId, schoolId, paymentCode, guardianName, guardianPhone, guardianEmail, address]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const { firstName, lastName, email, dateOfBirth, gender, classId, guardianName, guardianPhone, guardianEmail, address, isActive } = req.body;
      const result = await pool.query(
        `UPDATE students SET first_name=$1, last_name=$2, email=$3, date_of_birth=$4, gender=$5, class_id=$6,
         guardian_name=$7, guardian_phone=$8, guardian_email=$9, address=$10, is_active=$11, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        [firstName, lastName, email, dateOfBirth, gender, classId, guardianName, guardianPhone, guardianEmail, address, isActive, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Student not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── SUBJECTS ─────────────────────────────────────────────────────────────
  app.get("/api/subjects", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const result = await pool.query(
        `SELECT s.*, u.first_name || ' ' || u.last_name as teacher_name
         FROM subjects s LEFT JOIN users u ON s.teacher_id = u.id
         WHERE s.school_id = $1 ORDER BY s.name`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/subjects", async (req, res) => {
    try {
      const { name, code, description, schoolId, teacherId } = req.body;
      const result = await pool.query(
        `INSERT INTO subjects (name, code, description, school_id, teacher_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, code, description, schoolId, teacherId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  app.get("/api/attendance", async (req, res) => {
    try {
      const { schoolId, classId, date } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      let query = `SELECT a.*, s.first_name, s.last_name, s.payment_code
                   FROM attendance a JOIN students s ON a.student_id = s.id
                   WHERE a.school_id = $1`;
      const params: any[] = [schoolId];
      let idx = 2;

      if (classId) { query += ` AND a.class_id = $${idx++}`; params.push(classId); }
      if (date) { query += ` AND a.attendance_date = $${idx++}`; params.push(date); }
      query += ` ORDER BY a.attendance_date DESC, s.last_name`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const { studentId, classId, schoolId, date, status, remarks, recordedBy } = req.body;
      const result = await pool.query(
        `INSERT INTO attendance (student_id, class_id, school_id, attendance_date, status, remarks, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks
         RETURNING *`,
        [studentId, classId, schoolId, date, status, remarks, recordedBy]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── EXAMS ────────────────────────────────────────────────────────────────
  app.get("/api/exams", async (req, res) => {
    try {
      const { schoolId, classId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      let query = `SELECT e.*, s.name as subject_name, c.name as class_name
                   FROM exams e LEFT JOIN subjects s ON e.subject_id = s.id LEFT JOIN classes c ON e.class_id = c.id
                   WHERE e.school_id = $1`;
      const params: any[] = [schoolId];
      if (classId) { query += ` AND e.class_id = $2`; params.push(classId); }
      query += ` ORDER BY e.exam_date DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/exams", async (req, res) => {
    try {
      const { title, description, subjectId, classId, schoolId, examDate, duration, totalMarks, passingMarks, examType } = req.body;
      const result = await pool.query(
        `INSERT INTO exams (title, description, subject_id, class_id, school_id, exam_date, duration, total_marks, passing_marks, exam_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [title, description, subjectId, classId, schoolId, examDate, duration, totalMarks, passingMarks, examType]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── MARKS ────────────────────────────────────────────────────────────────
  app.get("/api/marks", async (req, res) => {
    try {
      const { schoolId, examId, studentId, classId, subjectId, term, academicYear } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      let query = `SELECT m.*, s.first_name, s.last_name, s.student_number, s.payment_code,
                          sub.name as subject_name, sub.code as subject_code,
                          e.title as exam_title, e.total_marks as exam_total_marks, e.exam_type
                   FROM marks m
                   JOIN students s ON m.student_id = s.id
                   JOIN subjects sub ON m.subject_id = sub.id
                   JOIN exams e ON m.exam_id = e.id
                   WHERE m.school_id = $1`;
      const params: any[] = [schoolId];
      let idx = 2;

      if (examId) { query += ` AND m.exam_id = $${idx++}`; params.push(examId); }
      if (studentId) { query += ` AND m.student_id = $${idx++}`; params.push(studentId); }
      if (classId) { query += ` AND m.class_id = $${idx++}`; params.push(classId); }
      if (subjectId) { query += ` AND m.subject_id = $${idx++}`; params.push(subjectId); }
      if (term) { query += ` AND m.term = $${idx++}`; params.push(term); }
      if (academicYear) { query += ` AND m.academic_year = $${idx++}`; params.push(academicYear); }
      query += ` ORDER BY s.last_name, sub.name`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Bulk save marks (upsert) for a class/subject/exam
  app.post("/api/marks/bulk", async (req, res) => {
    try {
      const { entries, examId, subjectId, classId, schoolId, term, academicYear, recordedBy } = req.body;
      if (!Array.isArray(entries) || !examId || !subjectId || !classId || !schoolId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const results = [];
      for (const entry of entries) {
        const { studentId, marksObtained, subjectTeacherRemarks } = entry;
        if (!studentId || marksObtained === undefined || marksObtained === null || marksObtained === '') continue;

        const score = parseFloat(marksObtained);
        if (isNaN(score)) continue;

        // Get exam total marks for grade calculation
        const examRow = await pool.query('SELECT total_marks FROM exams WHERE id = $1', [examId]);
        const total = examRow.rows[0]?.total_marks || 100;
        const pct = (score / total) * 100;
        let grade = 'F8';
        if (pct >= 90) grade = 'D1';
        else if (pct >= 80) grade = 'D2';
        else if (pct >= 70) grade = 'C3';
        else if (pct >= 60) grade = 'C4';
        else if (pct >= 50) grade = 'C5';
        else if (pct >= 45) grade = 'C6';
        else if (pct >= 35) grade = 'P7';

        const r = await pool.query(
          `INSERT INTO marks (student_id, exam_id, subject_id, class_id, school_id, marks_obtained, total_marks, grade, term, academic_year, subject_teacher_remarks, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (student_id, exam_id, subject_id) DO UPDATE SET
             marks_obtained = EXCLUDED.marks_obtained,
             grade = EXCLUDED.grade,
             term = EXCLUDED.term,
             academic_year = EXCLUDED.academic_year,
             subject_teacher_remarks = EXCLUDED.subject_teacher_remarks,
             recorded_by = EXCLUDED.recorded_by,
             updated_at = NOW()
           RETURNING *`,
          [studentId, examId, subjectId, classId, schoolId, score, total, grade, term || 'Term 1', academicYear || '2025', subjectTeacherRemarks || null, recordedBy]
        );
        results.push(r.rows[0]);
      }
      res.json({ saved: results.length, marks: results });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Lock/unlock marks for an exam
  app.post("/api/marks/lock", async (req, res) => {
    try {
      const { examId, classId, schoolId, subjectId, lock, approvedBy } = req.body;
      if (!examId || !schoolId) return res.status(400).json({ message: "examId and schoolId required" });

      let query = `UPDATE marks SET is_locked = $1, approved_by = $2, updated_at = NOW()
                   WHERE exam_id = $3 AND school_id = $4`;
      const params: any[] = [lock !== false, approvedBy || null, examId, schoolId];
      let idx = 5;
      if (classId) { query += ` AND class_id = $${idx++}`; params.push(classId); }
      if (subjectId) { query += ` AND subject_id = $${idx++}`; params.push(subjectId); }
      query += ' RETURNING id';

      const result = await pool.query(query, params);
      res.json({ locked: result.rowCount, message: `${result.rowCount} marks ${lock !== false ? 'locked' : 'unlocked'}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Single mark save (legacy)
  app.post("/api/marks", async (req, res) => {
    try {
      const { studentId, examId, subjectId, classId, schoolId, marksObtained, totalMarks, grade, remarks, recordedBy, term, academicYear } = req.body;
      const result = await pool.query(
        `INSERT INTO marks (student_id, exam_id, subject_id, class_id, school_id, marks_obtained, total_marks, grade, remarks, recorded_by, term, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (student_id, exam_id, subject_id) DO UPDATE SET
           marks_obtained = EXCLUDED.marks_obtained, grade = EXCLUDED.grade, updated_at = NOW()
         RETURNING *`,
        [studentId, examId, subjectId, classId, schoolId, marksObtained, totalMarks, grade, remarks, recordedBy, term || 'Term 1', academicYear || '2025']
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── REPORT CARDS ─────────────────────────────────────────────────────────
  // Get full report card data for a student (term/year)
  app.get("/api/report-cards/student", async (req, res) => {
    try {
      const { studentId, schoolId, term, academicYear, examId } = req.query;
      if (!studentId || !schoolId) return res.status(400).json({ message: "studentId and schoolId required" });

      // Get student info
      const studentResult = await pool.query(
        `SELECT s.*, c.name as class_name, c.level as class_level, sch.name as school_name,
                sch.abbreviation as school_abbr, sch.address as school_address, sch.phone as school_phone,
                sch.email as school_email, sch.logo_url
         FROM students s
         JOIN classes c ON s.class_id = c.id
         JOIN schools sch ON s.school_id = sch.id
         WHERE s.id = $1 AND s.school_id = $2`,
        [studentId, schoolId]
      );
      if (!studentResult.rows.length) return res.status(404).json({ message: "Student not found" });
      const student = studentResult.rows[0];

      // Get marks
      let marksQuery = `SELECT m.*, sub.name as subject_name, sub.code as subject_code,
                               e.title as exam_title, e.total_marks as exam_total, e.exam_type,
                               u.first_name || ' ' || u.last_name as teacher_name
                        FROM marks m
                        JOIN subjects sub ON m.subject_id = sub.id
                        JOIN exams e ON m.exam_id = e.id
                        LEFT JOIN users u ON m.recorded_by = u.id
                        WHERE m.student_id = $1 AND m.school_id = $2`;
      const marksParams: any[] = [studentId, schoolId];
      let idx = 3;
      if (term) { marksQuery += ` AND m.term = $${idx++}`; marksParams.push(term); }
      if (academicYear) { marksQuery += ` AND m.academic_year = $${idx++}`; marksParams.push(academicYear); }
      if (examId) { marksQuery += ` AND m.exam_id = $${idx++}`; marksParams.push(examId); }
      marksQuery += ` ORDER BY sub.name`;

      const marksResult = await pool.query(marksQuery, marksParams);

      // Get report card remarks
      let remarksQuery = `SELECT * FROM report_card_remarks WHERE student_id = $1`;
      const remarksParams: any[] = [studentId];
      let ridx = 2;
      if (term) { remarksQuery += ` AND term = $${ridx++}`; remarksParams.push(term); }
      if (academicYear) { remarksQuery += ` AND academic_year = $${ridx++}`; remarksParams.push(academicYear); }
      const remarksResult = await pool.query(remarksQuery, remarksParams);

      // Calculate aggregates
      const marksData = marksResult.rows;
      const totalObtained = marksData.reduce((sum: number, m: any) => sum + parseFloat(m.marks_obtained), 0);
      const totalMax = marksData.reduce((sum: number, m: any) => sum + parseFloat(m.total_marks || m.exam_total || 100), 0);
      const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      // Grade point for aggregate (D1=1, D2=2, C3=3, C4=4, C5=5, C6=6, P7=7, F8=8)
      const gradePoints: Record<string, number> = { D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, F8: 8 };
      const aggregate = marksData.reduce((sum: number, m: any) => sum + (gradePoints[m.grade] || 8), 0);

      res.json({
        student,
        marks: marksData,
        remarks: remarksResult.rows[0] || null,
        summary: {
          totalSubjects: marksData.length,
          totalObtained: Math.round(totalObtained * 10) / 10,
          totalMax,
          average: Math.round(average * 10) / 10,
          aggregate,
          term: term || marksData[0]?.term,
          academicYear: academicYear || marksData[0]?.academic_year,
        }
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get all students' report cards for a class (for class overview)
  app.get("/api/report-cards/class", async (req, res) => {
    try {
      const { schoolId, classId, term, academicYear, examId } = req.query;
      if (!schoolId || !classId) return res.status(400).json({ message: "schoolId and classId required" });

      const studentsResult = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE s.class_id = $1 AND s.school_id = $2 AND s.is_active = true
         ORDER BY s.first_name`,
        [classId, schoolId]
      );

      const gradePoints: Record<string, number> = { D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, F8: 8 };

      const cards = await Promise.all(studentsResult.rows.map(async (student: any) => {
        let mQuery = `SELECT m.marks_obtained, m.total_marks, m.grade, sub.name as subject_name
                      FROM marks m JOIN subjects sub ON m.subject_id = sub.id
                      WHERE m.student_id = $1 AND m.school_id = $2`;
        const mParams: any[] = [student.id, schoolId];
        let idx = 3;
        if (term) { mQuery += ` AND m.term = $${idx++}`; mParams.push(term); }
        if (academicYear) { mQuery += ` AND m.academic_year = $${idx++}`; mParams.push(academicYear); }
        if (examId) { mQuery += ` AND m.exam_id = $${idx++}`; mParams.push(examId); }

        const marks = await pool.query(mQuery, mParams);
        const marksData = marks.rows;
        const totalObtained = marksData.reduce((s: number, m: any) => s + parseFloat(m.marks_obtained), 0);
        const totalMax = marksData.reduce((s: number, m: any) => s + parseFloat(m.total_marks || 100), 0);
        const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const aggregate = marksData.reduce((s: number, m: any) => s + (gradePoints[m.grade] || 8), 0);

        return {
          student,
          totalObtained: Math.round(totalObtained * 10) / 10,
          totalMax,
          average: Math.round(average * 10) / 10,
          aggregate,
          subjectCount: marksData.length,
        };
      }));

      // Add rank
      const ranked = [...cards].sort((a, b) => b.average - a.average)
        .map((card, i) => ({ ...card, rank: i + 1 }));

      res.json(ranked);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Save report card remarks (class teacher / head teacher)
  app.post("/api/report-cards/remarks", async (req, res) => {
    try {
      const { studentId, schoolId, classId, term, academicYear, classTeacherRemarks, headteacherRemarks, nextTermBegins, isPublished } = req.body;
      if (!studentId || !schoolId || !term || !academicYear) {
        return res.status(400).json({ message: "studentId, schoolId, term, academicYear required" });
      }

      const result = await pool.query(
        `INSERT INTO report_card_remarks (student_id, school_id, class_id, term, academic_year, class_teacher_remarks, headteacher_remarks, next_term_begins, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (student_id, term, academic_year) DO UPDATE SET
           class_teacher_remarks = EXCLUDED.class_teacher_remarks,
           headteacher_remarks = EXCLUDED.headteacher_remarks,
           next_term_begins = EXCLUDED.next_term_begins,
           is_published = EXCLUDED.is_published,
           published_at = CASE WHEN EXCLUDED.is_published THEN NOW() ELSE report_card_remarks.published_at END,
           updated_at = NOW()
         RETURNING *`,
        [studentId, schoolId, classId, term, academicYear, classTeacherRemarks, headteacherRemarks, nextTermBegins || null, isPublished || false]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── FEE STRUCTURES ───────────────────────────────────────────────────────
  app.get("/api/fees", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const result = await pool.query(
        `SELECT f.*, c.name as class_name FROM fee_structures f
         LEFT JOIN classes c ON f.class_id = c.id
         WHERE f.school_id = $1 ORDER BY f.due_date`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/fees", async (req, res) => {
    try {
      const { name, description, amount, dueDate, classId, schoolId, academicYear, term, isOptional } = req.body;
      const result = await pool.query(
        `INSERT INTO fee_structures (name, description, amount, due_date, class_id, school_id, academic_year, term, is_optional)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, description, amount, dueDate, classId, schoolId, academicYear, term, isOptional]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  app.get("/api/payments", async (req, res) => {
    try {
      const { schoolId, studentId, paymentCode } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      let query = `SELECT p.*, s.first_name, s.last_name, s.payment_code as student_code,
                          f.name as fee_name, u.first_name || ' ' || u.last_name as recorded_by_name
                   FROM payments p
                   JOIN students s ON p.student_id = s.id
                   JOIN fee_structures f ON p.fee_structure_id = f.id
                   JOIN users u ON p.recorded_by = u.id
                   WHERE p.school_id = $1`;
      const params: any[] = [schoolId];
      let idx = 2;

      if (studentId) { query += ` AND p.student_id = $${idx++}`; params.push(studentId); }
      if (paymentCode) { query += ` AND p.payment_code = $${idx++}`; params.push(paymentCode); }
      query += ` ORDER BY p.created_at DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const { studentId, feeStructureId, schoolId, paymentCode, amount, paymentMethod, provider, phoneNumber, transactionRef, recordedBy } = req.body;
      const result = await pool.query(
        `INSERT INTO payments (student_id, fee_structure_id, school_id, payment_code, amount, payment_method, provider, phone_number, transaction_ref, status, paid_at, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', NOW(), $10) RETURNING *`,
        [studentId, feeStructureId, schoolId, paymentCode, amount, paymentMethod, provider, phoneNumber, transactionRef, recordedBy]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── DASHBOARD STATS ──────────────────────────────────────────────────────
  app.get("/api/stats", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      const [studentsRes, classesRes, paymentsRes, pendingRes, todayAttRes] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true", [schoolId]),
        pool.query("SELECT COUNT(*) FROM classes WHERE school_id = $1", [schoolId]),
        pool.query("SELECT COALESCE(SUM(amount),0) FROM payments WHERE school_id = $1 AND status = 'completed'", [schoolId]),
        pool.query("SELECT COUNT(*) FROM payments WHERE school_id = $1 AND status = 'pending'", [schoolId]),
        pool.query("SELECT COUNT(*) FROM attendance WHERE school_id = $1 AND attendance_date = CURRENT_DATE AND status = 'present'", [schoolId]),
      ]);

      res.json({
        totalStudents: parseInt(studentsRes.rows[0].count),
        totalClasses: parseInt(classesRes.rows[0].count),
        totalRevenue: parseFloat(paymentsRes.rows[0].coalesce),
        pendingPayments: parseInt(pendingRes.rows[0].count),
        presentToday: parseInt(todayAttRes.rows[0].count),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── DEMO REQUEST ─────────────────────────────────────────────────────────
  app.post("/api/demo-request", async (req, res) => {
    try {
      const { schoolName, contactName, email, phone, numberOfStudents, message } = req.body;
      // Log the demo request (in production would send email)
      console.log("Demo Request:", { schoolName, contactName, email, phone, numberOfStudents, message });
      res.json({ success: true, message: "Demo request received! We'll contact you within 24 hours." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
