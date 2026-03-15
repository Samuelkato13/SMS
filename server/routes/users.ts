import type { Express } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";

export function registerUserRoutes(app: Express) {
  app.get("/api/users", async (req, res) => {
    try {
      const { schoolId } = req.query;
      const q = schoolId
        ? `SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id=s.id WHERE u.school_id=$1 ORDER BY u.last_name`
        : `SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id=s.id ORDER BY u.last_name`;
      const result = await pool.query(q, schoolId ? [schoolId] : []);
      res.json(result.rows.map(({ password_hash, ...u }: any) => u));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { email, role, schoolId, firstName, lastName, phone, department, password } = req.body;
      if (!email || !role || !schoolId || !firstName) {
        return res.status(400).json({ message: "email, role, schoolId and firstName are required" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }
      const abbr = await pool.query("SELECT abbreviation FROM schools WHERE id=$1", [schoolId]);
      const schoolAbbr = abbr.rows[0]?.abbreviation || "SYS";
      const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE school_id=$1", [schoolId]);
      const count = parseInt(countRes.rows[0].count) + 1;
      const username = `${schoolAbbr}_${role.replace(/_/g, "")}_${count}`;
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;
      const result = await pool.query(
        `INSERT INTO users (username, email, role, school_id, first_name, last_name, phone, department, password_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [username, email, role, schoolId, firstName, lastName, phone ?? null, department ?? null, passwordHash]
      );
      const { password_hash, ...newUser } = result.rows[0];
      res.status(201).json(newUser);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { role, firstName, lastName, isActive, email, department, phone, password } = req.body;
      let passwordHash = undefined;
      if (password) passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE users SET
           role=COALESCE($1,role), first_name=COALESCE($2,first_name), last_name=COALESCE($3,last_name),
           is_active=COALESCE($4,is_active), email=COALESCE($5,email), department=COALESCE($6,department),
           phone=COALESCE($7,phone), password_hash=COALESCE($8,password_hash), updated_at=NOW()
         WHERE id=$9 RETURNING *`,
        [role??null, firstName??null, lastName??null, isActive!==undefined?isActive:null,
         email??null, department??null, phone??null, passwordHash??null, req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "User not found" });
      const { password_hash, ...safeUser } = result.rows[0];
      res.json(safeUser);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await pool.query(`UPDATE users SET is_active=false WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
