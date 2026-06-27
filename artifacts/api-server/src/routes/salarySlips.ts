import { Router } from "express";
import { pool } from "../db";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";

const router = Router();

// ใช้ requireAuth ทุก route
router.use(requireAuth);

// GET - โหลดสลิปของ user ที่ login อยู่
router.get("/", async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        month,
        pay_date AS "payDate",
        salary,
        pdf_url AS "pdfUrl"
      FROM salary_slips
      WHERE user_id = $1
      ORDER BY pay_date DESC
      `,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "โหลดข้อมูลไม่สำเร็จ" });
  }
});

// POST - เพิ่มสลิป
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { month, payDate, salary, pdfUrl } = req.body;

    if (!month || !payDate || !salary) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }

    const salaryNum = Number(salary);
    if (isNaN(salaryNum)) {
      return res.status(400).json({ message: "เงินเดือนต้องเป็นตัวเลข" });
    }

    if (pdfUrl) {
      try { new URL(pdfUrl); } catch {
        return res.status(400).json({ message: "URL PDF ไม่ถูกต้อง" });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO salary_slips (month, pay_date, salary, pdf_url, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        month,
        pay_date AS "payDate",
        salary,
        pdf_url AS "pdfUrl"
      `,
      [month, payDate, salaryNum, pdfUrl, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เพิ่มข้อมูลไม่สำเร็จ" });
  }
});

// PUT - แก้ไขสลิป (เฉพาะของ user ตัวเอง)
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { month, payDate, salary, pdfUrl } = req.body;

    if (!month || !payDate || !salary) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }

    const salaryNum = Number(salary);
    if (isNaN(salaryNum)) {
      return res.status(400).json({ message: "เงินเดือนต้องเป็นตัวเลข" });
    }

    if (pdfUrl) {
      try { new URL(pdfUrl); } catch {
        return res.status(400).json({ message: "URL PDF ไม่ถูกต้อง" });
      }
    }

    const result = await pool.query(
      `
      UPDATE salary_slips
      SET
        month      = $1,
        pay_date   = $2,
        salary     = $3,
        pdf_url    = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING
        id,
        month,
        pay_date AS "payDate",
        salary,
        pdf_url AS "pdfUrl"
      `,
      [month, payDate, salaryNum, pdfUrl, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบสลิปที่ต้องการแก้ไข" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "แก้ไขข้อมูลไม่สำเร็จ" });
  }
});

// DELETE - ลบสลิป (เฉพาะของ user ตัวเอง)
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM salary_slips WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบสลิปที่ต้องการลบ" });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ลบข้อมูลไม่สำเร็จ" });
  }
});

export default router;
