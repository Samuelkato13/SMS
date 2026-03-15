import type { Express } from "express";
import pool from "../db";

export function registerSchoolRoutes(app: Express) {
  app.get("/api/schools", async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT *, (SELECT COUNT(*) FROM students WHERE school_id = schools.id) as student_count
         FROM schools WHERE is_active = true ORDER BY name`
      );
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/schools/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM schools WHERE id = $1", [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ message: "School not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/schools", async (req, res) => {
    try {
      const { name, abbreviation, email, phone, address, logoUrl, subscriptionPlan } = req.body;
      const result = await pool.query(
        `INSERT INTO schools (name, abbreviation, email, phone, address, logo_url, subscription_plan)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [name, abbreviation, email, phone, address, logoUrl, subscriptionPlan || "starter"]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/schools/:id", async (req, res) => {
    try {
      const { name, abbreviation, email, phone, address, logoUrl, motto } = req.body;
      const result = await pool.query(
        `UPDATE schools SET
           name=COALESCE($1,name), abbreviation=COALESCE($2,abbreviation),
           email=COALESCE($3,email), phone=COALESCE($4,phone),
           address=COALESCE($5,address), logo_url=COALESCE($6,logo_url),
           motto=COALESCE($7,motto), updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [name, abbreviation, email, phone, address, logoUrl, motto, req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "School not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
