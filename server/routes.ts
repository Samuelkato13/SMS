import type { Express } from "express";
import { createServer, type Server } from "http";
import pool from "./db";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

// ── File upload setup (Replit filesystem storage) ────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => cb(null, file.originalname),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── DB bootstrap: add password_hash column + seed demo passwords ─────────────
async function bootstrapAuth() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);
    const demoHash = await bcrypt.hash("demo123", 10);
    const demoEmails = [
      "admin@demo.com", "director@demo.com", "headteacher@demo.com",
      "classteacher@demo.com", "subjectteacher@demo.com", "bursar@demo.com",
    ];
    for (const email of demoEmails) {
      await pool.query(
        `UPDATE users SET password_hash = $1 WHERE email = $2 AND (password_hash IS NULL OR password_hash = '')`,
        [demoHash, email]
      );
    }
    console.log("[auth] Password column ready. Demo passwords seeded.");

    // ── Expand role constraint to include super_admin ────────────────────────
    try {
      await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      await pool.query(`
        ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('super_admin','admin','director','head_teacher','class_teacher','subject_teacher','bursar'))
      `);
    } catch (_) {}

    // ── New SaaS tables ──────────────────────────────────────────────────────
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID,
        plan VARCHAR(20) NOT NULL DEFAULT 'trial',
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        amount_ugx INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        school_id VARCHAR(255),
        school_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `);

    // ── Seed super admin ─────────────────────────────────────────────────────
    const superHash = await bcrypt.hash("Admin@2025!", 10);
    await pool.query(`
      INSERT INTO users (id, username, email, role, school_id, first_name, last_name, is_active, password_hash)
      SELECT 'f0000000-0000-0000-0000-000000000001', 'super_admin', 'superadmin@skyvale.com',
             'super_admin', 'a0000000-0000-0000-0000-000000000001', 'SKYVALE', 'Admin', true, $1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@skyvale.com')
    `, [superHash]);

    // ── Seed demo school subscription ────────────────────────────────────────
    await pool.query(`
      INSERT INTO subscriptions (school_id, plan, start_date, end_date, status, amount_ugx)
      SELECT 'a0000000-0000-0000-0000-000000000001', 'professional',
             CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'active', 80000
      WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE school_id = 'a0000000-0000-0000-0000-000000000001')
    `);

    // ── Director-level tables ─────────────────────────────────────────────────
    await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS streams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
        school_id UUID,
        name VARCHAR(30) NOT NULL,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grading_systems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        section_name VARCHAR(50),
        name VARCHAR(100),
        grade_ranges JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(school_id, section_name)
      )
    `);

    console.log("[admin] SaaS tables ready. Super admin seeded.");
  } catch (err: any) {
    console.error("[auth] Bootstrap error:", err.message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  await bootstrapAuth();

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

  // POST /api/auth/login — verifies password against bcrypt hash in PostgreSQL
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await pool.query(
        `SELECT u.*, s.name as school_name, s.abbreviation as school_abbreviation
         FROM users u
         LEFT JOIN schools s ON u.school_id = s.id
         WHERE u.email = $1 AND u.is_active = true`,
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return res.status(401).json({ message: "Account not set up. Contact your administrator." });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Return user data (exclude password hash)
      const { password_hash, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/auth/logout — client clears session; server just acknowledges
  app.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true });
  });

  // POST /api/upload — multipart file upload, stored on Replit filesystem
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file provided" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url, filename: req.file.filename });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/upload — remove a previously uploaded file
  app.delete("/api/upload", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      if (!filePath) return res.status(400).json({ message: "Path required" });
      const filename = String(filePath).replace(/\//g, '_');
      const fullPath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      res.json({ success: true });
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
      res.json(result.rows.map(({ password_hash, ...u }: any) => u));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { email, role, schoolId, firstName, lastName, phone, department, password } = req.body;
      const abbr = await pool.query("SELECT abbreviation FROM schools WHERE id = $1", [schoolId]);
      const schoolAbbr = abbr.rows[0]?.abbreviation || "SYS";
      const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE school_id = $1", [schoolId]);
      const count = parseInt(countRes.rows[0].count) + 1;
      const username = `${schoolAbbr}_${role.replace(/_/g, "")}_${count}`;
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;

      const result = await pool.query(
        `INSERT INTO users (username, email, role, school_id, first_name, last_name, phone, department, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [username, email, role, schoolId, firstName, lastName, phone ?? null, department ?? null, passwordHash]
      );
      const { password_hash, ...newUser } = result.rows[0];
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { role, firstName, lastName, isActive, email, department, phone, password } = req.body;
      let passwordHash = undefined;
      if (password) passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE users SET
           role = COALESCE($1, role),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           is_active = COALESCE($4, is_active),
           email = COALESCE($5, email),
           department = COALESCE($6, department),
           phone = COALESCE($7, phone),
           password_hash = COALESCE($8, password_hash),
           updated_at = NOW()
         WHERE id=$9 RETURNING *`,
        [role ?? null, firstName ?? null, lastName ?? null,
         isActive !== undefined ? isActive : null,
         email ?? null, department ?? null, phone ?? null,
         passwordHash ?? null, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      const { password_hash, ...safeUser } = result.rows[0];
      res.json(safeUser);
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

  // ─── SCHOOL STATS ─────────────────────────────────────────────────────────
  app.get("/api/stats", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const [studRes, usersRes, classRes, paymentsRes, feesRes, marksRes, attRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM users WHERE school_id = $1 AND is_active = true AND role != 'super_admin'`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM classes WHERE school_id = $1`, [schoolId]),
        pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE school_id = $1 AND status = 'completed'`, [schoolId]),
        pool.query(`SELECT COALESCE(SUM(amount), 0) as expected FROM fee_structures WHERE school_id = $1`, [schoolId]),
        pool.query(`SELECT COUNT(*) FROM marks WHERE school_id = $1`, [schoolId]),
        pool.query(`SELECT COUNT(*) as present FROM attendance WHERE school_id = $1 AND status = 'present' AND attendance_date = CURRENT_DATE`, [schoolId]),
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
      const { firstName, lastName, email, dateOfBirth, gender, classId, guardianName, guardianPhone, guardianEmail, address, isActive, medicalInfo } = req.body;
      const result = await pool.query(
        `UPDATE students SET
           first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           date_of_birth = COALESCE($4, date_of_birth),
           gender = COALESCE($5, gender),
           class_id = COALESCE($6, class_id),
           guardian_name = COALESCE($7, guardian_name),
           guardian_phone = COALESCE($8, guardian_phone),
           guardian_email = COALESCE($9, guardian_email),
           address = COALESCE($10, address),
           is_active = COALESCE($11, is_active),
           medical_info = COALESCE($12, medical_info),
           updated_at = NOW()
         WHERE id=$13 RETURNING *`,
        [firstName ?? null, lastName ?? null, email ?? null, dateOfBirth ?? null, gender ?? null,
         classId ?? null, guardianName ?? null, guardianPhone ?? null, guardianEmail ?? null,
         address ?? null, isActive !== undefined ? isActive : null, medicalInfo ?? null, req.params.id]
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
      const { studentId, classId, schoolId, date, attendanceDate, status, remarks, recordedBy } = req.body;
      const dateVal = attendanceDate || date;
      const result = await pool.query(
        `INSERT INTO attendance (student_id, class_id, school_id, attendance_date, status, remarks, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks
         RETURNING *`,
        [studentId, classId, schoolId, dateVal, status, remarks, recordedBy]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || !entries.length) {
        return res.status(400).json({ message: "entries array required" });
      }
      const saved: any[] = [];
      for (const e of entries) {
        const { studentId, classId, schoolId, attendanceDate, status, remarks, recordedBy } = e;
        const r = await pool.query(
          `INSERT INTO attendance (student_id, class_id, school_id, attendance_date, status, remarks, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, attendance_date) DO UPDATE SET status=EXCLUDED.status, remarks=EXCLUDED.remarks
           RETURNING *`,
          [studentId, classId, schoolId, attendanceDate, status, remarks || null, recordedBy || null]
        );
        saved.push(r.rows[0]);
      }
      res.status(201).json({ saved: saved.length, records: saved });
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


  // ─── BURSAR EXTENDED ROUTES ───────────────────────────────────────────────

  // Financial summary stats
  app.get("/api/payments/summary", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const today = new Date().toISOString().split('T')[0];
      const result = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN is_reversed = false AND status='completed' THEN amount ELSE 0 END),0) AS total_collected,
          COALESCE(SUM(CASE WHEN is_reversed = false AND status='completed' AND DATE(paid_at) = $2 THEN amount ELSE 0 END),0) AS today_collected,
          COUNT(CASE WHEN is_reversed = false AND status='completed' THEN 1 END) AS total_payments,
          COUNT(CASE WHEN is_reversed = false AND status='completed' AND DATE(paid_at) = $2 THEN 1 END) AS today_count
        FROM payments WHERE school_id = $1`, [schoolId, today]);
      const feeTotals = await pool.query(`
        SELECT COALESCE(SUM(amount),0) AS total_fees_billed FROM fee_structures WHERE school_id=$1`, [schoolId]);
      const studCount = await pool.query(`SELECT COUNT(*) as cnt FROM students WHERE school_id=$1`, [schoolId]);
      const totalBilled = parseFloat(feeTotals.rows[0].total_fees_billed) * parseInt(studCount.rows[0].cnt);
      const totalCollected = parseFloat(result.rows[0].total_collected);
      const outstanding = Math.max(0, totalBilled - totalCollected);
      const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 100)) : 0;
      res.json({
        totalCollected,
        todayCollected: parseFloat(result.rows[0].today_collected),
        totalPayments: parseInt(result.rows[0].total_payments),
        todayCount: parseInt(result.rows[0].today_count),
        outstanding,
        collectionRate
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Reverse a payment
  app.put("/api/payments/:id/reverse", async (req, res) => {
    try {
      const { id } = req.params;
      const { reversalReason } = req.body;
      if (!reversalReason) return res.status(400).json({ message: "Reversal reason required" });
      const result = await pool.query(
        `UPDATE payments SET is_reversed=true, reversal_reason=$1, status='cancelled', updated_at=NOW()
         WHERE id=$2 RETURNING *`, [reversalReason, id]);
      if (!result.rows.length) return res.status(404).json({ message: "Payment not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update payment receipt number on creation (auto-gen)
  app.post("/api/payments/receipt-number", async (req, res) => {
    try {
      const { schoolId } = req.body;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM payments WHERE school_id=$1`, [schoolId]);
      const num = parseInt(count.rows[0].cnt) + 1;
      const year = new Date().getFullYear();
      res.json({ receiptNumber: `RCP-${year}-${String(num).padStart(5,'0')}` });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Record payment with receipt number
  app.post("/api/payments/record", async (req, res) => {
    try {
      const { studentId, feeStructureId, schoolId, paymentCode, amount, paymentMethod, transactionRef, notes, recordedBy, receiptNumber } = req.body;
      const result = await pool.query(
        `INSERT INTO payments (student_id, fee_structure_id, school_id, payment_code, amount, payment_method, transaction_ref, status, paid_at, recorded_by, receipt_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW(), $8, $9, $10) RETURNING *`,
        [studentId, feeStructureId, schoolId, paymentCode, amount, paymentMethod, transactionRef, recordedBy, receiptNumber, notes]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Edit fee structure
  app.put("/api/fees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, amount, dueDate, classId, academicYear, term, isOptional, components } = req.body;
      const result = await pool.query(
        `UPDATE fee_structures SET name=$1, description=$2, amount=$3, due_date=$4, class_id=$5,
         academic_year=$6, term=$7, is_optional=$8, components=$9, updated_at=NOW()
         WHERE id=$10 RETURNING *`,
        [name, description, amount, dueDate, classId || null, academicYear, term, isOptional, components ? JSON.stringify(components) : null, id]);
      if (!result.rows.length) return res.status(404).json({ message: "Fee not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Delete fee structure
  app.delete("/api/fees/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query(`DELETE FROM fee_structures WHERE id=$1`, [id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Bank statements
  app.get("/api/bank-statements", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const result = await pool.query(
        `SELECT b.*, u.first_name || ' ' || u.last_name as uploaded_by_name
         FROM bank_statements b LEFT JOIN users u ON b.uploaded_by = u.id
         WHERE b.school_id=$1 ORDER BY b.statement_date DESC`, [schoolId]);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/bank-statements", async (req, res) => {
    try {
      const { schoolId, bankName, accountNumber, statementDate, openingBalance, closingBalance, totalCredits, totalDebits, notes, uploadedBy } = req.body;
      const result = await pool.query(
        `INSERT INTO bank_statements (school_id, bank_name, account_number, statement_date, opening_balance, closing_balance, total_credits, total_debits, notes, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [schoolId, bankName, accountNumber, statementDate, openingBalance || 0, closingBalance, totalCredits || 0, totalDebits || 0, notes, uploadedBy]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/bank-statements/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM bank_statements WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Reconciliation
  app.get("/api/reconciliation", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const unrecon = await pool.query(`
        SELECT p.*, s.first_name || ' ' || s.last_name as student_name, f.name as fee_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN fee_structures f ON p.fee_structure_id = f.id
        LEFT JOIN reconciliation_entries r ON r.payment_id = p.id
        WHERE p.school_id=$1 AND p.status='completed' AND p.is_reversed=false AND r.id IS NULL
        ORDER BY p.paid_at DESC`, [schoolId]);
      const recon = await pool.query(`
        SELECT r.*, p.amount as payment_amount, p.receipt_number,
               s.first_name || ' ' || s.last_name as student_name,
               b.bank_name, b.statement_date,
               u.first_name || ' ' || u.last_name as reconciled_by_name
        FROM reconciliation_entries r
        LEFT JOIN payments p ON r.payment_id = p.id
        LEFT JOIN students s ON p.student_id = s.id
        LEFT JOIN bank_statements b ON r.statement_id = b.id
        LEFT JOIN users u ON r.reconciled_by = u.id
        WHERE r.school_id=$1 ORDER BY r.created_at DESC LIMIT 50`, [schoolId]);
      res.json({ unreconciled: unrecon.rows, reconciled: recon.rows });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/reconciliation", async (req, res) => {
    try {
      const { schoolId, paymentId, statementId, amount, description, reconciledBy } = req.body;
      const result = await pool.query(
        `INSERT INTO reconciliation_entries (school_id, payment_id, statement_id, amount, description, status, reconciled_by, reconciled_at)
         VALUES ($1,$2,$3,$4,$5,'reconciled',$6,NOW()) RETURNING *`,
        [schoolId, paymentId, statementId || null, amount, description, reconciledBy]);
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Financial report data
  app.get("/api/payments/report", async (req, res) => {
    try {
      const { schoolId, type, from, to } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      let query = `SELECT p.*, s.first_name || ' ' || s.last_name as student_name,
                          s.admission_number, c.name as class_name, f.name as fee_name,
                          u.first_name || ' ' || u.last_name as recorded_by_name
                   FROM payments p
                   JOIN students s ON p.student_id = s.id
                   LEFT JOIN classes c ON s.class_id = c.id
                   JOIN fee_structures f ON p.fee_structure_id = f.id
                   JOIN users u ON p.recorded_by = u.id
                   WHERE p.school_id=$1 AND p.is_reversed=false AND p.status='completed'`;
      const params: any[] = [schoolId];
      let idx = 2;
      if (from) { query += ` AND DATE(p.paid_at) >= $${idx++}`; params.push(from); }
      if (to)   { query += ` AND DATE(p.paid_at) <= $${idx++}`; params.push(to); }
      query += ` ORDER BY p.paid_at DESC`;
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Defaulters list
  app.get("/api/students/defaulters", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      const result = await pool.query(`
        SELECT s.id, s.first_name || ' ' || s.last_name as student_name,
               s.admission_number, s.payment_code, c.name as class_name,
               COALESCE(SUM(fs.amount),0) as total_billed,
               COALESCE(paid.total_paid,0) as total_paid,
               COALESCE(SUM(fs.amount),0) - COALESCE(paid.total_paid,0) as balance
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        CROSS JOIN fee_structures fs
        LEFT JOIN (
          SELECT student_id, SUM(amount) as total_paid FROM payments
          WHERE school_id=$1 AND status='completed' AND is_reversed=false GROUP BY student_id
        ) paid ON paid.student_id = s.id
        WHERE s.school_id=$1 AND fs.school_id=$1
        GROUP BY s.id, s.first_name, s.last_name, s.admission_number, s.payment_code, c.name, paid.total_paid
        HAVING COALESCE(SUM(fs.amount),0) - COALESCE(paid.total_paid,0) > 0
        ORDER BY balance DESC`, [schoolId]);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── DEMO / SIGNUP REQUESTS ───────────────────────────────────────────────

  app.post("/api/demo-request", async (req, res) => {
    try {
      const { schoolName, contactName, email, phone, numberOfStudents, message, district, schoolType } = req.body;
      if (!schoolName || !contactName || !email)
        return res.status(400).json({ message: "School name, contact name and email are required" });
      await pool.query(
        `INSERT INTO school_signup_requests (school_name, contact_name, email, phone, district, school_type, number_of_students, message, request_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'demo')`,
        [schoolName, contactName, email, phone ?? null, district ?? null, schoolType ?? 'secondary', numberOfStudents ? parseInt(numberOfStudents) : null, message ?? null]
      );
      res.json({ success: true, message: "Demo request received! Our team will contact you within 24 hours." });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // School free trial / Get Started signup
  app.post("/api/signup-request", async (req, res) => {
    try {
      const { schoolName, contactName, email, phone, district, schoolType, numberOfStudents, message, requestType } = req.body;
      if (!schoolName || !contactName || !email)
        return res.status(400).json({ message: "School name, contact name and email are required" });
      // Check for duplicate email
      const exists = await pool.query(`SELECT id FROM school_signup_requests WHERE email=$1 AND status='pending'`, [email]);
      if (exists.rows.length > 0)
        return res.status(409).json({ message: "A request from this email is already pending review." });
      const result = await pool.query(
        `INSERT INTO school_signup_requests (school_name, contact_name, email, phone, district, school_type, number_of_students, message, request_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [schoolName, contactName, email, phone ?? null, district ?? null, schoolType ?? 'secondary',
         numberOfStudents ? parseInt(numberOfStudents) : null, message ?? null, requestType ?? 'trial']
      );
      res.status(201).json({ success: true, id: result.rows[0].id, message: "Your free trial request has been submitted! We'll set up your school within 24 hours." });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // List all signup/demo requests (super admin only)
  app.get("/api/admin/signup-requests", async (req, res) => {
    try {
      const { status } = req.query;
      let q = `SELECT * FROM school_signup_requests`;
      const params: any[] = [];
      if (status) { q += ` WHERE status=$1`; params.push(status); }
      q += ` ORDER BY created_at DESC`;
      const result = await pool.query(q, params);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update request status / add notes
  app.put("/api/admin/signup-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes, reviewedBy } = req.body;
      const result = await pool.query(
        `UPDATE school_signup_requests SET status=$1, admin_notes=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
         WHERE id=$4 RETURNING *`,
        [status, adminNotes ?? null, reviewedBy ?? null, id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Request not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Approve signup request → create school + director user with 1-month trial
  app.post("/api/admin/signup-requests/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewedBy, schoolEmail, schoolPhone, schoolAddress, schoolAbbr } = req.body;
      const req2 = await pool.query(`SELECT * FROM school_signup_requests WHERE id=$1`, [id]);
      if (!req2.rows.length) return res.status(404).json({ message: "Request not found" });
      const sr = req2.rows[0];
      if (sr.status === 'approved') return res.status(400).json({ message: "Already approved" });

      // Generate temp password
      const tempPassword = `EduPay@${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const trialEnd = new Date(); trialEnd.setMonth(trialEnd.getMonth() + 1);
      const abbr = schoolAbbr || sr.school_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,5);

      // Create school
      const schoolResult = await pool.query(
        `INSERT INTO schools (name, abbreviation, email, phone, address, subscription_plan, status, is_active)
         VALUES ($1,$2,$3,$4,$5,'trial','active',true) RETURNING *`,
        [sr.school_name, abbr, schoolEmail || sr.email, schoolPhone || sr.phone || '0700000000', schoolAddress || sr.district || 'Uganda']
      );
      const school = schoolResult.rows[0];

      // Create director user
      const username = sr.email.split('@')[0];
      const directorResult = await pool.query(
        `INSERT INTO users (username, email, role, school_id, first_name, last_name, password_hash, is_active)
         VALUES ($1,$2,'director',$3,$4,$5,$6,true) RETURNING *`,
        [username, sr.email, school.id, sr.contact_name.split(' ')[0], sr.contact_name.split(' ').slice(1).join(' ') || 'Director', passwordHash]
      );

      // Mark request as approved
      await pool.query(
        `UPDATE school_signup_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW(),
         trial_start_date=NOW(), trial_end_date=$2, approved_school_id=$3,
         created_school_admin_email=$4, created_school_admin_password=$5, updated_at=NOW()
         WHERE id=$6`,
        [reviewedBy ?? null, trialEnd.toISOString().split('T')[0], school.id, sr.email, tempPassword, id]
      );

      await auditLog('superadmin@skyvale.com', 'approve_signup', `School: ${sr.school_name}`, sr.school_name);

      res.json({
        success: true,
        school,
        directorEmail: sr.email,
        tempPassword,
        message: `School created! Send these credentials to ${sr.contact_name}: Email: ${sr.email} / Password: ${tempPassword}`
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── SUPER ADMIN API ──────────────────────────────────────────────────────

  // Helper: write an audit log entry
  const auditLog = async (userEmail: string, action: string, details?: string, schoolName?: string, ip?: string) => {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_email, action, details, school_name, ip_address) VALUES ($1, $2, $3, $4, $5)`,
        [userEmail, action, details ?? null, schoolName ?? null, ip ?? null]
      );
    } catch (_) {}
  };

  // GET /api/admin/stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const [schoolsRes, usersRes, subRes, expRes, newSchoolsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM schools`),
        pool.query(`SELECT COUNT(*) FROM users WHERE role != 'super_admin' AND is_active = true`),
        pool.query(`SELECT COUNT(*), COALESCE(SUM(amount_ugx), 0) as revenue FROM subscriptions WHERE status = 'active'`),
        pool.query(`SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '7 days' AND end_date >= CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM schools WHERE created_at >= date_trunc('month', CURRENT_DATE)`),
      ]);
      res.json({
        totalSchools: parseInt(schoolsRes.rows[0].count),
        totalUsers: parseInt(usersRes.rows[0].count),
        activeSubscriptions: parseInt(subRes.rows[0].count),
        monthlyRevenue: parseFloat(subRes.rows[0].revenue),
        expiringThisWeek: parseInt(expRes.rows[0].count),
        newSchoolsThisMonth: parseInt(newSchoolsRes.rows[0].count),
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET /api/admin/schools — all schools with user count and subscription info
  app.get("/api/admin/schools", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.*,
          (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.is_active = true AND u.role != 'super_admin') as user_count,
          sub.plan, sub.status as sub_status, sub.end_date
        FROM schools s
        LEFT JOIN LATERAL (
          SELECT plan, status, end_date FROM subscriptions
          WHERE school_id = s.id ORDER BY created_at DESC LIMIT 1
        ) sub ON true
        ORDER BY s.created_at DESC
      `);
      res.json(result.rows.map(r => ({ ...r, plan: r.plan ?? 'trial' })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // POST /api/admin/schools — create a school
  app.post("/api/admin/schools", async (req, res) => {
    try {
      const { name, abbreviation, subdomain, email, phone, address, status } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email required" });
      const result = await pool.query(
        `INSERT INTO schools (id, name, abbreviation, subdomain, email, phone, address, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING *`,
        [name, abbreviation ?? name.slice(0, 6).toUpperCase(), subdomain ?? null, email, phone ?? '', address ?? '', status ?? 'trial']
      );
      await auditLog('superadmin@skyvale.com', 'create_school', `Created school: ${name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // PUT /api/admin/schools/:id — update school details
  app.put("/api/admin/schools/:id", async (req, res) => {
    try {
      const { name, abbreviation, subdomain, email, phone, address, status } = req.body;
      const result = await pool.query(
        `UPDATE schools SET name=$1, abbreviation=$2, subdomain=$3, email=$4, phone=$5, address=$6, status=$7, updated_at=now()
         WHERE id=$8 RETURNING *`,
        [name, abbreviation, subdomain, email, phone, address, status, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "School not found" });
      await auditLog('superadmin@skyvale.com', 'update_school', `Updated school: ${name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // PUT /api/admin/schools/:id/status — suspend / reactivate
  app.put("/api/admin/schools/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const result = await pool.query(
        `UPDATE schools SET status=$1, updated_at=now() WHERE id=$2 RETURNING name`,
        [status, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "School not found" });
      await auditLog('superadmin@skyvale.com', 'suspend_school', `Changed status to ${status}: ${result.rows[0].name}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // DELETE /api/admin/schools/:id
  app.delete("/api/admin/schools/:id", async (req, res) => {
    try {
      const nameRes = await pool.query(`SELECT name FROM schools WHERE id=$1`, [req.params.id]);
      await pool.query(`DELETE FROM schools WHERE id=$1`, [req.params.id]);
      await auditLog('superadmin@skyvale.com', 'delete_school', `Deleted school: ${nameRes.rows[0]?.name}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET /api/admin/users — all users across all schools
  app.get("/api/admin/users", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.*, s.name as school_name
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows.map(({ password_hash, ...u }) => u));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // POST /api/admin/users — create a director or head teacher
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { firstName, lastName, email, role, schoolId, password } = req.body;
      if (!['director', 'head_teacher'].includes(role))
        return res.status(400).json({ message: "Can only create Director or Head Teacher accounts" });
      const existing = await pool.query(`SELECT id FROM users WHERE email=$1`, [email.toLowerCase()]);
      if (existing.rows.length > 0) return res.status(400).json({ message: "Email already in use" });
      const hash = await bcrypt.hash(password, 10);
      const username = email.split('@')[0].replace(/[^a-z0-9]/gi, '_');
      const result = await pool.query(
        `INSERT INTO users (id, username, email, role, school_id, first_name, last_name, is_active, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, now(), now()) RETURNING *`,
        [username, email.toLowerCase(), role, schoolId, firstName, lastName ?? '', hash]
      );
      await auditLog('superadmin@skyvale.com', 'create_user', `Created ${role}: ${email}`);
      const { password_hash, ...safeUser } = result.rows[0];
      res.json(safeUser);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // DELETE /api/admin/users/:id — deactivate user
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE users SET is_active=false, updated_at=now() WHERE id=$1 AND role != 'super_admin' RETURNING email`,
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
      await auditLog('superadmin@skyvale.com', 'deactivate_user', `Deactivated: ${result.rows[0].email}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET /api/admin/subscriptions — all subscriptions with school name
  app.get("/api/admin/subscriptions", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT sub.*, s.name as school_name
        FROM subscriptions sub
        LEFT JOIN schools s ON sub.school_id::text = s.id::text
        ORDER BY sub.created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // POST /api/admin/subscriptions — assign plan to school
  app.post("/api/admin/subscriptions", async (req, res) => {
    try {
      const { schoolId, plan, months } = req.body;
      const PLAN_PRICES: Record<string, number> = { trial: 0, basic: 50000, professional: 80000, enterprise: 120000 };
      const price = PLAN_PRICES[plan] ?? 0;
      const totalAmount = price * (parseInt(months) || 1);

      // Mark old active subs as cancelled
      await pool.query(`UPDATE subscriptions SET status='cancelled' WHERE school_id=$1 AND status='active'`, [schoolId]);

      const result = await pool.query(`
        INSERT INTO subscriptions (school_id, plan, start_date, end_date, status, amount_ugx)
        VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + ($3 || ' months')::INTERVAL, 'active', $4)
        RETURNING *
      `, [schoolId, plan, parseInt(months) || 1, totalAmount]);

      const schoolRes = await pool.query(`SELECT name FROM schools WHERE id=$1`, [schoolId]);
      await auditLog('superadmin@skyvale.com', 'assign_subscription', `Assigned ${plan} plan (${months}mo) to ${schoolRes.rows[0]?.name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET /api/admin/audit-logs
  app.get("/api/admin/audit-logs", async (_req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // POST /api/admin/audit-logs — external log entry
  app.post("/api/admin/audit-logs", async (req, res) => {
    try {
      const { userEmail, action, details, schoolName } = req.body;
      await auditLog(userEmail, action, details, schoolName, req.ip);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // GET /api/admin/settings
  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const result = await pool.query(`SELECT key, value FROM global_settings`);
      const settings: Record<string, any> = {};
      result.rows.forEach(r => {
        try { settings[r.key] = JSON.parse(r.value); } catch (_) { settings[r.key] = r.value; }
      });
      if (!settings.globalSubjects) settings.globalSubjects = [
        { name: 'Mathematics', code: 'MATH' },
        { name: 'English Language', code: 'ENG' },
        { name: 'Science', code: 'SCI' },
        { name: 'Social Studies', code: 'SST' },
        { name: 'Religious Education', code: 'RE' },
      ];
      res.json(settings);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // PUT /api/admin/settings
  app.put("/api/admin/settings", async (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await pool.query(
          `INSERT INTO global_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = $2`,
          [key, JSON.stringify(value)]
        );
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // POST /api/admin/settings/subjects
  app.post("/api/admin/settings/subjects", async (req, res) => {
    try {
      const { name, code } = req.body;
      const settingsRes = await pool.query(`SELECT value FROM global_settings WHERE key='globalSubjects'`);
      let subjects: any[] = settingsRes.rows.length > 0 ? JSON.parse(settingsRes.rows[0].value) : [];
      const idx = subjects.findIndex(s => s.code === code);
      if (idx >= 0) subjects[idx] = { name, code };
      else subjects.push({ name, code });
      await pool.query(
        `INSERT INTO global_settings (key, value) VALUES ('globalSubjects', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [JSON.stringify(subjects)]
      );
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // DELETE /api/admin/settings/subjects/:code
  app.delete("/api/admin/settings/subjects/:code", async (req, res) => {
    try {
      const settingsRes = await pool.query(`SELECT value FROM global_settings WHERE key='globalSubjects'`);
      let subjects: any[] = settingsRes.rows.length > 0 ? JSON.parse(settingsRes.rows[0].value) : [];
      subjects = subjects.filter(s => s.code !== req.params.code);
      await pool.query(
        `INSERT INTO global_settings (key, value) VALUES ('globalSubjects', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [JSON.stringify(subjects)]
      );
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── DIRECTOR — SCHOOL UPDATE ─────────────────────────────────────────────
  app.put("/api/schools/:id", async (req, res) => {
    try {
      const { name, address, phone, email, motto } = req.body;
      const result = await pool.query(
        `UPDATE schools SET name=COALESCE($1,name), address=COALESCE($2,address), phone=COALESCE($3,phone),
         email=COALESCE($4,email), motto=COALESCE($5,motto) WHERE id=$6 RETURNING *`,
        [name, address, phone, email, motto, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── SECTIONS ────────────────────────────────────────────────────────────
  app.get("/api/sections", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const result = await pool.query(`SELECT * FROM sections WHERE school_id=$1 ORDER BY name`, [schoolId]);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/sections", async (req, res) => {
    try {
      const { name, schoolId } = req.body;
      const existing = await pool.query(`SELECT id FROM sections WHERE school_id=$1 AND name=$2`, [schoolId, name]);
      if (existing.rows.length > 0) return res.status(400).json({ message: 'Section already exists' });
      const result = await pool.query(
        `INSERT INTO sections (school_id, name) VALUES ($1, $2) RETURNING *`,
        [schoolId, name]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/sections/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM sections WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── STREAMS ────────────────────────────────────────────────────────────
  app.get("/api/streams", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const result = await pool.query(
        `SELECT s.*, c.name as class_name FROM streams s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE c.school_id=$1 ORDER BY c.name, s.name`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/streams", async (req, res) => {
    try {
      const { name, classId, schoolId } = req.body;
      const result = await pool.query(
        `INSERT INTO streams (class_id, name) VALUES ($1, $2) RETURNING *`,
        [classId, name]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/streams/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM streams WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── ACADEMIC YEARS ──────────────────────────────────────────────────────
  app.get("/api/academic-years", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const result = await pool.query(
        `SELECT * FROM academic_years WHERE school_id=$1 ORDER BY start_date DESC NULLS LAST, name DESC`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/academic-years", async (req, res) => {
    try {
      const { name, startDate, endDate, isActive, schoolId } = req.body;
      if (isActive) await pool.query(`UPDATE academic_years SET is_active=false WHERE school_id=$1`, [schoolId]);
      const result = await pool.query(
        `INSERT INTO academic_years (school_id, name, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [schoolId, name, startDate || null, endDate || null, !!isActive]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/academic-years/:id/activate", async (req, res) => {
    try {
      const yr = await pool.query(`SELECT school_id FROM academic_years WHERE id=$1`, [req.params.id]);
      if (yr.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      await pool.query(`UPDATE academic_years SET is_active=false WHERE school_id=$1`, [yr.rows[0].school_id]);
      const result = await pool.query(`UPDATE academic_years SET is_active=true WHERE id=$1 RETURNING *`, [req.params.id]);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/academic-years/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM academic_years WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── TERMS ───────────────────────────────────────────────────────────────
  app.get("/api/terms", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const result = await pool.query(
        `SELECT t.*, ay.name as year_name FROM terms t
         LEFT JOIN academic_years ay ON t.academic_year_id = ay.id
         WHERE t.school_id=$1 ORDER BY ay.name DESC, t.name`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/terms", async (req, res) => {
    try {
      const { name, academicYearId, startDate, endDate, schoolId } = req.body;
      const result = await pool.query(
        `INSERT INTO terms (academic_year_id, school_id, name, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [academicYearId, schoolId, name, startDate || null, endDate || null]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/terms/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM terms WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── GRADING SYSTEMS ─────────────────────────────────────────────────────
  app.get("/api/grading-systems", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const result = await pool.query(
        `SELECT * FROM grading_systems WHERE school_id=$1 ORDER BY section_name`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/grading-systems", async (req, res) => {
    try {
      const { schoolId, sectionName, name, gradeRanges } = req.body;
      const result = await pool.query(
        `INSERT INTO grading_systems (school_id, section_name, name, grade_ranges)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (school_id, section_name) DO UPDATE SET name=$3, grade_ranges=$4
         RETURNING *`,
        [schoolId, sectionName, name, JSON.stringify(gradeRanges)]
      );
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── PUT EXAMS (status, details update) ─────────────────────────────────────
  app.put("/api/exams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, term, examType, examDate, duration, totalMarks, passingMarks, description, classId, subjectId, status } = req.body;
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (title !== undefined)       { fields.push(`title = $${idx++}`);         params.push(title); }
      if (term !== undefined)        { fields.push(`term = $${idx++}`);          params.push(term); }
      if (examType !== undefined)    { fields.push(`exam_type = $${idx++}`);     params.push(examType); }
      if (examDate !== undefined)    { fields.push(`exam_date = $${idx++}`);     params.push(examDate); }
      if (duration !== undefined)    { fields.push(`duration = $${idx++}`);      params.push(duration); }
      if (totalMarks !== undefined)  { fields.push(`total_marks = $${idx++}`);   params.push(totalMarks); }
      if (passingMarks !== undefined){ fields.push(`passing_marks = $${idx++}`); params.push(passingMarks); }
      if (description !== undefined) { fields.push(`description = $${idx++}`);   params.push(description); }
      if (classId !== undefined)     { fields.push(`class_id = $${idx++}`);      params.push(classId || null); }
      if (subjectId !== undefined)   { fields.push(`subject_id = $${idx++}`);    params.push(subjectId || null); }
      if (status !== undefined)      { fields.push(`status = $${idx++}`);        params.push(status); }

      if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

      fields.push(`updated_at = now()`);
      params.push(id);
      const result = await pool.query(
        `UPDATE exams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Exam not found' });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── PUT CLASSES (assign class teacher) ──────────────────────────────────────
  app.put("/api/classes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, classTeacherId, capacity } = req.body;
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (name !== undefined)           { fields.push(`name = $${idx++}`);              params.push(name); }
      if (classTeacherId !== undefined)  { fields.push(`class_teacher_id = $${idx++}`); params.push(classTeacherId || null); }
      if (capacity !== undefined)        { fields.push(`capacity = $${idx++}`);          params.push(capacity); }

      if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
      params.push(id);
      const result = await pool.query(
        `UPDATE classes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Class not found' });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── PUT SUBJECTS (assign teacher) ───────────────────────────────────────────
  app.put("/api/subjects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, teacherId } = req.body;
      const fields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (name !== undefined)     { fields.push(`name = $${idx++}`);       params.push(name); }
      if (code !== undefined)     { fields.push(`code = $${idx++}`);       params.push(code); }
      if (teacherId !== undefined){ fields.push(`teacher_id = $${idx++}`); params.push(teacherId || null); }

      if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
      params.push(id);
      const result = await pool.query(
        `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Subject not found' });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── PARENT COMMUNICATIONS ───────────────────────────────────────────────────
  app.get("/api/parent-communications", async (req, res) => {
    try {
      const { schoolId, classId } = req.query;
      if (!schoolId) return res.status(400).json({ message: 'schoolId required' });
      let query = `SELECT pc.*, s.first_name, s.last_name, u.first_name || ' ' || u.last_name as sent_by_name
                   FROM parent_communications pc
                   LEFT JOIN students s ON pc.student_id = s.id
                   LEFT JOIN users u ON pc.sent_by = u.id
                   WHERE pc.school_id = $1`;
      const params: any[] = [schoolId];
      if (classId) { query += ` AND pc.class_id = $2`; params.push(classId); }
      query += ` ORDER BY pc.sent_at DESC`;
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/parent-communications", async (req, res) => {
    try {
      const { schoolId, classId, studentId, sentBy, message, subject, type } = req.body;
      if (!schoolId || !message) return res.status(400).json({ message: 'schoolId and message required' });
      const result = await pool.query(
        `INSERT INTO parent_communications (school_id, class_id, student_id, sent_by, message, subject, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [schoolId, classId || null, studentId || null, sentBy || null, message, subject || null, type || 'individual']
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── SCHOOL EVENTS (Academic Calendar) ───────────────────────────────────────
  app.get("/api/school-events", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: 'schoolId required' });
      const result = await pool.query(
        `SELECT * FROM school_events WHERE school_id = $1 ORDER BY date ASC`,
        [schoolId]
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/school-events", async (req, res) => {
    try {
      const { title, type, date, endDate, description, schoolId } = req.body;
      if (!title || !date || !schoolId) return res.status(400).json({ message: 'title, date, schoolId required' });
      const result = await pool.query(
        `INSERT INTO school_events (school_id, title, type, date, end_date, description)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [schoolId, title, type || 'event', date, endDate || null, description || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/school-events/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM school_events WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
