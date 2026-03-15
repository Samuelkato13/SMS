import type { Express } from "express";
import { createServer, type Server } from "http";
import pool from "../db";
import bcrypt from "bcryptjs";
import { registerAuthRoutes } from "./auth";
import { registerSchoolRoutes } from "./schools";
import { registerUserRoutes } from "./users";
import { registerStudentRoutes } from "./students";
import { registerClassRoutes } from "./classes";
import { registerSubjectRoutes } from "./subjects";
import { registerAttendanceRoutes } from "./attendance";
import { registerExamRoutes } from "./exams";
import { registerMarksRoutes } from "./marks";
import { registerFeeRoutes } from "./fees";
import { registerAcademicRoutes } from "./academic";
import { registerAdminRoutes } from "./admin";
import { registerSignupRoutes } from "./signup";
import { registerUploadRoutes } from "./upload";

// ── DB bootstrap: ensure all required tables and seed data exist ─────────────
async function bootstrap() {
  try {
    // Core auth columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(50)`);
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100)`);
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto VARCHAR(255)`);

    // Fix role constraint to include super_admin
    try {
      await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      await pool.query(`
        ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('super_admin','admin','director','head_teacher','class_teacher','subject_teacher','bursar'))
      `);
    } catch (_) {}

    // Seed demo passwords and update usernames (demo123 for all demo accounts)
    const demoHash = await bcrypt.hash("demo123", 10);
    const demoUsernamesMap: Record<string, string> = {
      "director@demo.com": "dr-eds",
      "headteacher@demo.com": "ht-eds",
      "classteacher@demo.com": "ct-eds",
      "subjectteacher@demo.com": "st-eds",
      "bursar@demo.com": "bsr-eds",
    };
    for (const [email, username] of Object.entries(demoUsernamesMap)) {
      await pool.query(
        `UPDATE users SET password_hash=$1, username=$2 WHERE LOWER(email)=$3`,
        [demoHash, username, email]
      );
    }

    // Seed super admin (SKYVALE)
    const superHash = await bcrypt.hash("Admin@2025!", 10);
    await pool.query(`
      INSERT INTO users (id, username, email, role, school_id, first_name, last_name, is_active, password_hash)
      SELECT 'f0000000-0000-0000-0000-000000000001','super_admin','superadmin@skyvale.com',
             'super_admin','a0000000-0000-0000-0000-000000000001','SKYVALE','Admin',true,$1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='superadmin@skyvale.com')
    `, [superHash]);

    // SaaS tables
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

    // Payments & financial tables
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_reason TEXT`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50)`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50)`);
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_statements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        statement_date DATE,
        opening_balance NUMERIC(15,2) DEFAULT 0,
        closing_balance NUMERIC(15,2),
        total_credits NUMERIC(15,2) DEFAULT 0,
        total_debits NUMERIC(15,2) DEFAULT 0,
        notes TEXT,
        uploaded_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID,
        payment_id UUID REFERENCES payments(id),
        statement_id UUID REFERENCES bank_statements(id),
        amount NUMERIC(15,2),
        description TEXT,
        status VARCHAR(20) DEFAULT 'reconciled',
        reconciled_by UUID REFERENCES users(id),
        reconciled_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Marks columns
    await pool.query(`ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject_teacher_remarks TEXT`);
    await pool.query(`ALTER TABLE marks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE marks ADD COLUMN IF NOT EXISTS approved_by UUID`);
    await pool.query(`ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS components JSONB`);

    // Report card remarks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_card_remarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        class_id UUID,
        term VARCHAR(30),
        academic_year VARCHAR(10),
        class_teacher_remarks TEXT,
        headteacher_remarks TEXT,
        next_term_begins DATE,
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, term, academic_year)
      )
    `);

    // Events and communications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        type VARCHAR(50) DEFAULT 'event',
        date DATE NOT NULL,
        end_date DATE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_communications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        class_id UUID,
        student_id UUID,
        sent_by UUID REFERENCES users(id),
        message TEXT NOT NULL,
        subject VARCHAR(200),
        type VARCHAR(50) DEFAULT 'individual',
        sent_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // School signup requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS school_signup_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        district VARCHAR(100),
        school_type VARCHAR(50),
        number_of_students INTEGER,
        message TEXT,
        request_type VARCHAR(20) DEFAULT 'demo',
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by VARCHAR(255),
        reviewed_at TIMESTAMPTZ,
        trial_start_date DATE,
        trial_end_date DATE,
        approved_school_id UUID,
        created_school_admin_email VARCHAR(255),
        created_school_admin_password VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Demo school subscription
    await pool.query(`
      INSERT INTO subscriptions (school_id, plan, start_date, end_date, status, amount_ugx)
      SELECT 'a0000000-0000-0000-0000-000000000001','professional',
             CURRENT_DATE-INTERVAL '15 days', CURRENT_DATE+INTERVAL '365 days','active',80000
      WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE school_id='a0000000-0000-0000-0000-000000000001')
    `);

    console.log("[bootstrap] DB ready. Super admin seeded. Demo passwords set.");
  } catch (err: any) {
    console.error("[bootstrap] Error:", err.message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await bootstrap();

  // Register all route modules
  registerUploadRoutes(app);
  registerAuthRoutes(app);
  registerSchoolRoutes(app);
  registerUserRoutes(app);
  registerStudentRoutes(app);
  registerClassRoutes(app);
  registerSubjectRoutes(app);
  registerAttendanceRoutes(app);
  registerExamRoutes(app);
  registerMarksRoutes(app);
  registerFeeRoutes(app);
  registerAcademicRoutes(app);
  registerAdminRoutes(app);
  registerSignupRoutes(app);

  return createServer(app);
}
