import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, salarySlipsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(salarySlipsTable)
      .where(eq(salarySlipsTable.userId, req.userId!))
      .orderBy(desc(salarySlipsTable.payDate));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "โหลดข้อมูลไม่สำเร็จ" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { month, payDate, salary, pdfUrl } = req.body;
    if (!month || !payDate || !salary)
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    const salaryNum = Number(salary);
    if (isNaN(salaryNum))
      return res.status(400).json({ message: "เงินเดือนต้องเป็นตัวเลข" });
    if (pdfUrl) { try { new URL(pdfUrl); } catch { return res.status(400).json({ message: "URL PDF ไม่ถูกต้อง" }); } }
    const [row] = await db.insert(salarySlipsTable)
      .values({ month, payDate, salary: String(salaryNum), pdfUrl: pdfUrl ?? "", userId: req.userId! })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เพิ่มข้อมูลไม่สำเร็จ" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { month, payDate, salary, pdfUrl } = req.body;
    if (!month || !payDate || !salary)
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    const salaryNum = Number(salary);
    if (isNaN(salaryNum))
      return res.status(400).json({ message: "เงินเดือนต้องเป็นตัวเลข" });
    if (pdfUrl) { try { new URL(pdfUrl); } catch { return res.status(400).json({ message: "URL PDF ไม่ถูกต้อง" }); } }
    const [row] = await db.update(salarySlipsTable)
      .set({ month, payDate, salary: String(salaryNum), pdfUrl: pdfUrl ?? "", updatedAt: new Date() })
      .where(and(eq(salarySlipsTable.id, id), eq(salarySlipsTable.userId, req.userId!)))
      .returning();
    if (!row) return res.status(404).json({ message: "ไม่พบสลิปที่ต้องการแก้ไข" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "แก้ไขข้อมูลไม่สำเร็จ" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.delete(salarySlipsTable)
      .where(and(eq(salarySlipsTable.id, id), eq(salarySlipsTable.userId, req.userId!)))
      .returning();
    if (!row) return res.status(404).json({ message: "ไม่พบสลิปที่ต้องการลบ" });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ลบข้อมูลไม่สำเร็จ" });
  }
});

export default router;
