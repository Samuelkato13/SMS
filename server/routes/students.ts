import type { Express } from "express";
import pool from "../db";
import ExcelJS from "exceljs";

// Column order used by BOTH the generated template and the import parser.
// Admission number is intentionally excluded — it is always auto-generated
// by the server (see payment_code logic below) and must never be supplied
// by the user, whether adding one student or importing many.
const IMPORT_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "className", label: "Class Name" },
];

export function registerStudentRoutes(app: Express) {
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

  // Must be registered before GET /api/students/:id, otherwise Express
  // would treat "template" as an :id value.
  app.get("/api/students/template", async (req, res) => {
    try {
      const { schoolId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });

      const classesRes = await pool.query(
        "SELECT name FROM classes WHERE school_id=$1 ORDER BY name",
        [schoolId]
      );
      const classNames = classesRes.rows.map((r: any) => r.name);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students");

      sheet.columns = [
        { header: "First Name*", key: "firstName", width: 18 },
        { header: "Last Name*", key: "lastName", width: 18 },
        { header: "Class Name*", key: "className", width: 20 },
        { header: "Stream Name", key: "streamName", width: 16 },
        { header: "Date of Birth (YYYY-MM-DD)", key: "dateOfBirth", width: 24 },
        { header: "Gender (male/female)", key: "gender", width: 20 },
        { header: "Boarding/Day (day/boarding)", key: "section", width: 22 },
        { header: "School Section (nursery/primary/secondary)", key: "schoolSection", width: 42 },
        { header: "Address", key: "address", width: 26 },
        { header: "Guardian Name", key: "guardianName", width: 20 },
        { header: "Guardian Phone", key: "guardianPhone", width: 18 },
        { header: "Guardian Email", key: "guardianEmail", width: 24 },
        { header: "Medical Notes", key: "medicalNotes", width: 28 },
      ];
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };

      // Sample row for guidance — not required, users can delete it.
      sheet.addRow({
        firstName: "Jane",
        lastName: "Doe",
        className: classNames[0] || "e.g. P1",
        streamName: "A",
        dateOfBirth: "2015-04-12",
        gender: "female",
        section: "day",
        schoolSection: "primary",
        address: "Kampala, Uganda",
        guardianName: "John Doe",
        guardianPhone: "+256700000000",
        guardianEmail: "john@example.com",
        medicalNotes: "Asthma",
      });

      const ref = workbook.addWorksheet("Reference (do not edit)");
      ref.addRow(["This school's valid Class Name values:"]);
      classNames.forEach((n: string) => ref.addRow([n]));
      ref.addRow([]);
      ref.addRow(["Valid Gender values:", "male", "female"]);
      ref.addRow(["Valid Boarding/Day values:", "day", "boarding"]);
      ref.addRow([
        "Valid School Section values:",
        "nursery", "primary", "secondary", "nursery_primary", "primary_secondary", "all",
      ]);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=students_template.xlsx");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/students", async (req, res) => {
    try {
      const { schoolId, classId } = req.query;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      let query = `SELECT s.*, c.name as class_name, c.level as class_level, st.name as stream_name
                   FROM students s LEFT JOIN classes c ON s.class_id=c.id
                   LEFT JOIN streams st ON s.stream_id=st.id
                   WHERE s.school_id=$1 AND s.is_active=true`;
      const params: any[] = [schoolId];
      if (classId) { query += ` AND s.class_id=$2`; params.push(classId); }
      query += ` ORDER BY s.last_name, s.first_name`;
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id=c.id WHERE s.id=$1`,
        [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Student not found" });
      res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/students", async (req, res) => {
    try {
        const { firstName, lastName, dateOfBirth, gender, section, schoolSection, address, classId, streamId, schoolId, parentName, parentPhone, parentEmail, admissionNumber, medicalNotes } = req.body;
        if (!schoolId) return res.status(400).json({ message: "schoolId required" });
        if (!firstName) return res.status(400).json({ message: "First Name is required" });
        if (!lastName) return res.status(400).json({ message: "Last Name is required" });
        if (!classId) return res.status(400).json({ message: "Class is required" });

        const abbr = await pool.query("SELECT abbreviation FROM schools WHERE id=$1", [schoolId]);
        const schoolAbbr = abbr.rows[0]?.abbreviation || "SCH";
        const countRes = await pool.query("SELECT COUNT(*) FROM students WHERE school_id=$1", [schoolId]);
        const count = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
        const year = new Date().getFullYear();
        const paymentCode = `${schoolAbbr}-${year}-${count}`;
        const result = await pool.query(
          `INSERT INTO students (first_name, last_name, gender, section, school_section, address, date_of_birth, class_id, school_id, payment_code, parent_name, parent_phone, parent_email, admission_number, medical_notes, stream_id, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true) RETURNING *`,
          [
            firstName,
            lastName || null,
            gender || null,
            section || null,
            schoolSection || null,
            address || null,
            dateOfBirth || null,
            classId,
            schoolId,
            paymentCode,
            parentName || null,
            parentPhone || null,
            parentEmail || null,
            admissionNumber || null,
            medicalNotes || null,
            streamId || null
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err: any) { res.status(500).json({ message: err.message }); }
    });

  // Bulk import from a parsed spreadsheet. Body: { schoolId, rows: [...] }
  // Each row uses the same field names as the template columns. Admission
  // number is never accepted here — the server always assigns it, exactly
  // as it does for single-student creation above.
  app.post("/api/students/import", async (req, res) => {
    try {
      const { schoolId, rows } = req.body;
      if (!schoolId) return res.status(400).json({ message: "schoolId required" });
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows to import" });
      }

      const classesRes = await pool.query(
        "SELECT id, name FROM classes WHERE school_id=$1",
        [schoolId]
      );
      const classByName: Record<string, string> = {};
      classesRes.rows.forEach((c: any) => {
        classByName[String(c.name).trim().toLowerCase()] = c.id;
      });

      const streamsRes = await pool.query(
        "SELECT id, name, class_id FROM streams WHERE class_id IN (SELECT id FROM classes WHERE school_id=$1)",
        [schoolId]
      );
      const streamsByNameAndClass: Record<string, string> = {};
      streamsRes.rows.forEach((s: any) => {
        streamsByNameAndClass[`${s.class_id}-${String(s.name).trim().toLowerCase()}`] = s.id;
      });

      const abbrRes = await pool.query("SELECT abbreviation FROM schools WHERE id=$1", [schoolId]);
      const schoolAbbr = abbrRes.rows[0]?.abbreviation || "SCH";
      const year = new Date().getFullYear();
      const countRes = await pool.query("SELECT COUNT(*) FROM students WHERE school_id=$1", [schoolId]);
      let nextCount = parseInt(countRes.rows[0].count) + 1;

      const results: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 accounts for the header row in the sheet
        const firstName = String(row.firstName ?? "").trim();
        const lastName = String(row.lastName ?? "").trim();
        const className = String(row.className ?? "").trim();
        const streamName = String(row.streamName ?? "").trim() || null;
        const dateOfBirth = String(row.dateOfBirth ?? "").trim() || null;
        const gender = String(row.gender ?? "").trim().toLowerCase() || null;
        const section = String(row.section ?? "").trim().toLowerCase() || null;
        const schoolSection = String(row.schoolSection ?? "").trim().toLowerCase() || null;
        const address = String(row.address ?? "").trim() || null;
        const guardianName = String(row.guardianName ?? "").trim() || null;
        const guardianPhone = String(row.guardianPhone ?? "").trim() || null;
        const guardianEmail = String(row.guardianEmail ?? "").trim() || null;
        const medicalNotes = String(row.medicalNotes ?? "").trim() || null;
        const name = `${firstName} ${lastName}`.trim() || "(unnamed row)";

        const missing = IMPORT_REQUIRED_FIELDS
          .filter(f => !String((row as any)[f.key] ?? "").trim())
          .map(f => f.label);
        if (missing.length) {
          results.push({ row: rowNum, name, success: false, message: `Missing required: ${missing.join(", ")}` });
          continue;
        }
        if (gender && !["male", "female"].includes(gender)) {
          results.push({ row: rowNum, name, success: false, message: `Invalid gender "${row.gender}"` });
          continue;
        }
        if (section && !["day", "boarding"].includes(section)) {
          results.push({ row: rowNum, name, success: false, message: `Invalid boarding/day value "${row.section}"` });
          continue;
        }
        const classId = classByName[className.toLowerCase()];
        if (!classId) {
          results.push({ row: rowNum, name, success: false, message: `Class "${className}" not found for this school` });
          continue;
        }

        try {
          const paymentCode = `${schoolAbbr}-${year}-${String(nextCount).padStart(4, "0")}`;
          const classId = classByName[className.toLowerCase()];
          let streamId = null;
          if (streamName && classId) {
            streamId = streamsByNameAndClass[`${classId}-${streamName.toLowerCase()}`] || null;
          }
          await pool.query(
            `INSERT INTO students (first_name, last_name, gender, section, school_section, address, date_of_birth, class_id, school_id, payment_code, parent_name, parent_phone, parent_email, medical_notes, stream_id, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true)`,
            [firstName, lastName, gender, section, schoolSection, address, dateOfBirth, classId, schoolId, paymentCode, guardianName, guardianPhone, guardianEmail, medicalNotes, streamId]
          );
          nextCount++;
          results.push({ row: rowNum, name, success: true, message: `Imported (Adm No: ${paymentCode})` });
        } catch (err: any) {
          results.push({ row: rowNum, name, success: false, message: err.message });
        }
      }

      res.json({
        total: rows.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
      try {
        const { firstName, lastName, dateOfBirth, gender, section, schoolSection, address, classId, streamId, parentName, parentPhone, parentEmail, admissionNumber, medicalNotes, isActive } = req.body;
        const params: any[] = [
          firstName ?? null,
          lastName ?? null,
          gender ?? null,
          section ?? null,
          schoolSection ?? null,
          address ?? null,
          dateOfBirth ?? null,
          classId ?? null,
          streamId ?? null,
          parentName ?? null,
          parentPhone ?? null,
          parentEmail ?? null,
          admissionNumber ?? null,
          medicalNotes ?? null,
          isActive !== undefined ? isActive : null,
          req.params.id
        ];
        const result = await pool.query(
          `UPDATE students SET
             first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
             gender=COALESCE($3,gender), section=COALESCE($4,section), school_section=COALESCE($5,school_section), address=COALESCE($6,address),
             date_of_birth=COALESCE($7,date_of_birth),
             class_id=COALESCE($8,class_id), stream_id=COALESCE($9,stream_id),
             parent_name=COALESCE($10,parent_name), parent_phone=COALESCE($11,parent_phone),
             parent_email=COALESCE($12,parent_email), admission_number=COALESCE($13,admission_number),
             medical_notes=COALESCE($14,medical_notes),
             is_active=COALESCE($15,is_active), updated_at=NOW()
           WHERE id=$16 RETURNING *`,
          params
        );
        if (!result.rows.length) return res.status(404).json({ message: "Student not found" });
        res.json(result.rows[0]);
      } catch (err: any) { res.status(500).json({ message: err.message }); }
    });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM students WHERE id=$1 RETURNING id`, [req.params.id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Student not found" });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}