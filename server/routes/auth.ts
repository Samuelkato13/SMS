import type { Express } from "express";
import pool from "../db";
import bcrypt from "bcryptjs";

export function registerAuthRoutes(app: Express) {
  // GET /api/auth/user — fetch full profile by user ID or email
  app.get("/api/auth/user", async (req, res) => {
    try {
      const { id, email } = req.query;

      let result;
      if (id) {
        result = await pool.query(
          `SELECT u.*, s.name as school_name, s.abbreviation as school_abbreviation
           FROM users u LEFT JOIN schools s ON u.school_id = s.id
           WHERE u.id = $1 AND u.is_active = true`,
          [id]
        );
      } else if (email) {
        result = await pool.query(
          `SELECT u.*, s.name as school_name, s.abbreviation as school_abbreviation
           FROM users u LEFT JOIN schools s ON u.school_id = s.id
           WHERE u.email = $1 AND u.is_active = true
           ORDER BY u.created_at DESC LIMIT 1`,
          [email]
        );
      } else {
        return res.status(400).json({ message: "id or email required" });
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password_hash, ...safeUser } = result.rows[0];
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/auth/login — verify credentials, return user profile
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const result = await pool.query(
        `SELECT u.*, s.name as school_name, s.abbreviation as school_abbreviation
         FROM users u LEFT JOIN schools s ON u.school_id = s.id
         WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
         ORDER BY u.created_at DESC LIMIT 1`,
        [email.trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "No account found with that email address" });
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return res.status(401).json({
          message: "Account setup incomplete. Please contact your administrator."
        });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password. Please try again." });
      }

      const { password_hash, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true });
  });

  // PUT /api/auth/change-password — allow users to change their own password
  app.put("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "userId, currentPassword and newPassword are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const result = await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [userId]);
      if (!result.rows.length) return res.status(404).json({ message: "User not found" });

      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [newHash, userId]);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
