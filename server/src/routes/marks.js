const express = require('express');
const router = express.Router();
const { query, run } = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// NOTE:
// This project uses MySQL (see `server/src/db.js` and `server/src/database/index.js`).
// This router previously mixed Postgres-style `$1` params and undefined `pool/query` vars,
// which caused 500s and then frontend crashes when it expected an array.

const isNoSuchTableError = (err) => {
  const code = err?.code || err?.errno;
  return code === 'ER_NO_SUCH_TABLE' || code === 1146;
};

// Get all marks (optionally filtered by schoolId, examId, classId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { schoolId, examId, classId } = req.query;

    const where = [];
    const params = [];

    if (examId) {
      where.push('m.exam_id = ?');
      params.push(examId);
    }

    if (classId) {
      where.push('m.class_id = ?');
      params.push(classId);
    }

    // If schoolId is provided, we filter through students.school_id where possible.
    // (This avoids exposing other schools' data and matches the client calling `?schoolId=...`.)
    if (schoolId) {
      where.push('st.school_id = ?');
      params.push(schoolId);
    }

    const sql = `
      SELECT
        m.*,
        st.full_name AS student_name,
        sub.name AS subject_name,
        c.name AS class_name,
        u.name AS teacher_name
      FROM marks m
      LEFT JOIN students st ON m.student_id = st.id
      LEFT JOIN subjects sub ON m.subject_id = sub.id
      LEFT JOIN classes c ON m.class_id = c.id
      LEFT JOIN users u ON m.created_by = u.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.id DESC
    `;

    const marks = await query(sql, params);
    res.json(Array.isArray(marks) ? marks : []);
  } catch (error) {
    // If the schema doesn't have `marks` yet, don't hard-crash the entire UI.
    if (isNoSuchTableError(error)) {
      return res.json([]);
    }
    console.error('Error fetching marks:', error);
    res.status(500).json({ message: 'Error fetching marks' });
  }
});

// Get marks by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      `
        SELECT
          m.*,
          st.full_name AS student_name,
          sub.name AS subject_name,
          c.name AS class_name,
          u.name AS teacher_name
        FROM marks m
        LEFT JOIN students st ON m.student_id = st.id
        LEFT JOIN subjects sub ON m.subject_id = sub.id
        LEFT JOIN classes c ON m.class_id = c.id
        LEFT JOIN users u ON m.created_by = u.id
        WHERE m.id = ?
        LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Marks not found' });
    res.json(rows[0]);
  } catch (error) {
    if (isNoSuchTableError(error)) return res.status(404).json({ message: 'Marks not found' });
    console.error('Error fetching marks:', error);
    res.status(500).json({ message: 'Error fetching marks' });
  }
});

// Create a mark
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { exam_id, student_id, subject_id, class_id, mark } = req.body || {};
    if (!exam_id || !student_id || !subject_id || !class_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const created_by = req.user?.id ?? null;
    const result = await run(
      `INSERT INTO marks (exam_id, student_id, subject_id, class_id, mark, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exam_id, student_id, subject_id, class_id, mark ?? null, created_by]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Error creating mark:', error);
    res.status(500).json({ message: 'Error creating mark' });
  }
});

module.exports = router; 