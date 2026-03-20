import type { Express } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";

const auditLog = async (userEmail: string, action: string, details?: string, schoolName?: string, ip?: string) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_email, action, details, school_name, ip_address) VALUES ($1,$2,$3,$4,$5)`,
      [userEmail, action, details??null, schoolName??null, ip??null]
    );
  } catch (_) {}
};

export function registerAdminRoutes(app: Express) {
  // Stats
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const [schoolsRes, usersRes, subRes, expRes, newSchoolsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM schools`),
        pool.query(`SELECT COUNT(*) FROM users WHERE role!='super_admin' AND is_active=true`),
        pool.query(`SELECT COUNT(*), COALESCE(SUM(amount_ugx),0) as revenue FROM subscriptions WHERE status='active'`),
        pool.query(`SELECT COUNT(*) FROM subscriptions WHERE status='active' AND end_date<=CURRENT_DATE+INTERVAL '7 days' AND end_date>=CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM schools WHERE created_at>=date_trunc('month',CURRENT_DATE)`),
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

  // Schools (admin)
  app.get("/api/admin/schools", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.*,
          (SELECT COUNT(*) FROM users u WHERE u.school_id=s.id AND u.is_active=true AND u.role!='super_admin') as user_count,
          sub.plan, sub.status as sub_status, sub.end_date
        FROM schools s
        LEFT JOIN LATERAL (
          SELECT plan, status, end_date FROM subscriptions WHERE school_id=s.id ORDER BY created_at DESC LIMIT 1
        ) sub ON true
        ORDER BY s.created_at DESC`);
      res.json(result.rows.map((r: any) => ({ ...r, plan: r.plan ?? 'trial' })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/schools", async (req, res) => {
    try {
      const { name, abbreviation, subdomain, email, phone, address, status } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email required" });
      const result = await pool.query(
        `INSERT INTO schools (id, name, abbreviation, subdomain, email, phone, address, status, created_at, updated_at)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,now(),now()) RETURNING *`,
        [name, abbreviation??name.slice(0,6).toUpperCase(), subdomain??null, email, phone??'', address??'', status??'trial']);
      await auditLog('superadmin@skyvale.com', 'create_school', `Created school: ${name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/admin/schools/:id", async (req, res) => {
    try {
      const {
        name, abbreviation, subdomain, email, phone, address, status, motto, schoolType, logoUrl,
        bankAccountTitle, bankAccountType, bankAccountNumber, bankName
      } = req.body;
      const result = await pool.query(
        `UPDATE schools SET
           name=$1, abbreviation=$2, subdomain=$3, email=$4, phone=$5, address=$6, status=$7,
           motto=COALESCE($8,motto), school_type=COALESCE($9,school_type), logo_url=COALESCE($10,logo_url),
           bank_account_title=COALESCE($11,bank_account_title),
           bank_account_type=COALESCE($12,bank_account_type),
           bank_account_number=COALESCE($13,bank_account_number),
           bank_name=COALESCE($14,bank_name),
           updated_at=now()
         WHERE id=$15 RETURNING *`,
        [name, abbreviation, subdomain, email, phone, address, status,
         motto, schoolType, logoUrl,
         bankAccountTitle, bankAccountType, bankAccountNumber, bankName,
         req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "School not found" });
      await auditLog('superadmin@skyvale.com', 'update_school', `Updated school: ${name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/admin/schools/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const result = await pool.query(
        `UPDATE schools SET status=$1, updated_at=now() WHERE id=$2 RETURNING name`, [status, req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "School not found" });
      await auditLog('superadmin@skyvale.com', 'change_school_status', `Status→${status}: ${result.rows[0].name}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/admin/schools/:id", async (req, res) => {
    try {
      const nameRes = await pool.query(`SELECT name FROM schools WHERE id=$1`, [req.params.id]);
      await pool.query(`DELETE FROM schools WHERE id=$1`, [req.params.id]);
      await auditLog('superadmin@skyvale.com', 'delete_school', `Deleted school: ${nameRes.rows[0]?.name}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Users (admin)
  app.get("/api/admin/users", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id=s.id ORDER BY u.created_at DESC`);
      res.json(result.rows.map(({ password_hash, ...u }: any) => u));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const { firstName, lastName, email, role, schoolId, password } = req.body;
      if (!['director', 'head_teacher'].includes(role))
        return res.status(400).json({ message: "Can only create Director or Head Teacher accounts here" });
      const existing = await pool.query(`SELECT id FROM users WHERE email=$1`, [email.toLowerCase()]);
      if (existing.rows.length) return res.status(400).json({ message: "Email already in use" });
      const hash = await bcrypt.hash(password, 10);
      const username = email.split('@')[0].replace(/[^a-z0-9]/gi, '_');
      const result = await pool.query(
        `INSERT INTO users (id, username, email, role, school_id, first_name, last_name, is_active, password_hash, created_at, updated_at)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true,$7,now(),now()) RETURNING *`,
        [username, email.toLowerCase(), role, schoolId, firstName, lastName??'', hash]);
      await auditLog('superadmin@skyvale.com', 'create_user', `Created ${role}: ${email}`);
      const { password_hash, ...safeUser } = result.rows[0];
      res.json(safeUser);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE users SET is_active=false, updated_at=now() WHERE id=$1 AND role!='super_admin' RETURNING email`,
        [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "User not found" });
      await auditLog('superadmin@skyvale.com', 'deactivate_user', `Deactivated: ${result.rows[0].email}`);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Subscriptions
  app.get("/api/admin/subscriptions", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT sub.*, s.name as school_name FROM subscriptions sub
        LEFT JOIN schools s ON sub.school_id::text=s.id::text ORDER BY sub.created_at DESC`);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/subscriptions", async (req, res) => {
    try {
      const { schoolId, plan, months } = req.body;
      const PLAN_PRICES: Record<string, number> = { trial: 0, basic: 50000, professional: 80000, enterprise: 120000 };
      const price = PLAN_PRICES[plan] ?? 0;
      const totalAmount = price * (parseInt(months) || 1);
      await pool.query(`UPDATE subscriptions SET status='cancelled' WHERE school_id=$1 AND status='active'`, [schoolId]);
      const result = await pool.query(`
        INSERT INTO subscriptions (school_id, plan, start_date, end_date, status, amount_ugx)
        VALUES ($1,$2,CURRENT_DATE,CURRENT_DATE+($3 || ' months')::INTERVAL,'active',$4) RETURNING *`,
        [schoolId, plan, parseInt(months)||1, totalAmount]);
      const schoolRes = await pool.query(`SELECT name FROM schools WHERE id=$1`, [schoolId]);
      await auditLog('superadmin@skyvale.com', 'assign_subscription', `Assigned ${plan} plan to ${schoolRes.rows[0]?.name}`);
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Audit logs
  app.get("/api/admin/audit-logs", async (_req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/audit-logs", async (req, res) => {
    try {
      const { userEmail, action, details, schoolName } = req.body;
      await auditLog(userEmail, action, details, schoolName, req.ip);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Global settings
  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const result = await pool.query(`SELECT key, value FROM global_settings`);
      const settings: Record<string, any> = {};
      result.rows.forEach((r: any) => {
        try { settings[r.key] = JSON.parse(r.value); } catch (_) { settings[r.key] = r.value; }
      });
      if (!settings.globalSubjects) settings.globalSubjects = [
        { name: 'Mathematics', code: 'MATH' }, { name: 'English Language', code: 'ENG' },
        { name: 'Science', code: 'SCI' }, { name: 'Social Studies', code: 'SST' },
        { name: 'Religious Education', code: 'RE' },
      ];
      res.json(settings);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/admin/settings", async (req, res) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await pool.query(
          `INSERT INTO global_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2`,
          [key, JSON.stringify(value)]);
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/admin/settings/subjects", async (req, res) => {
    try {
      const { name, code } = req.body;
      const settingsRes = await pool.query(`SELECT value FROM global_settings WHERE key='globalSubjects'`);
      let subjects: any[] = settingsRes.rows.length > 0 ? JSON.parse(settingsRes.rows[0].value) : [];
      const idx = subjects.findIndex((s: any) => s.code === code);
      if (idx >= 0) subjects[idx] = { name, code }; else subjects.push({ name, code });
      await pool.query(
        `INSERT INTO global_settings (key, value) VALUES ('globalSubjects',$1) ON CONFLICT (key) DO UPDATE SET value=$1`,
        [JSON.stringify(subjects)]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/admin/settings/subjects/:code", async (req, res) => {
    try {
      const settingsRes = await pool.query(`SELECT value FROM global_settings WHERE key='globalSubjects'`);
      let subjects: any[] = settingsRes.rows.length > 0 ? JSON.parse(settingsRes.rows[0].value) : [];
      subjects = subjects.filter((s: any) => s.code !== req.params.code);
      await pool.query(
        `INSERT INTO global_settings (key, value) VALUES ('globalSubjects',$1) ON CONFLICT (key) DO UPDATE SET value=$1`,
        [JSON.stringify(subjects)]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
