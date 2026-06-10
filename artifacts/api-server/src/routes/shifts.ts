import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, shiftsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { month } = req.query as { month?: string };

  if (!month) return res.status(400).json({ error: "month is required (YYYY-MM)" });

  const rows = await db
    .select()
    .from(shiftsTable)
    .where(
      and(
        eq(shiftsTable.userId, userId),
        sql`substring(${shiftsTable.workDate}, 1, 7) = ${month}`,
      ),
    )
    .orderBy(shiftsTable.workDate);

  return res.json(rows.map((r) => ({
    id: r.id,
    workDate: r.workDate,
    shiftType: r.shiftType,
    otHours: r.otHours,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);

  const schema = z.object({
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "workDate must be YYYY-MM-DD"),
    shiftType: z.enum(["D", "N", "S"]),
    otHours: z.number().min(0).nullable().optional(),
    note: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });

  const { workDate, shiftType, otHours, note } = parsed.data;

  const existing = await db
    .select()
    .from(shiftsTable)
    .where(and(eq(shiftsTable.userId, userId), eq(shiftsTable.workDate, workDate)))
    .limit(1);

  let row;
  if (existing.length > 0) {
    const updated = await db
      .update(shiftsTable)
      .set({ shiftType, otHours: otHours ?? null, note: note ?? null })
      .where(and(eq(shiftsTable.userId, userId), eq(shiftsTable.workDate, workDate)))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(shiftsTable)
      .values({ userId, workDate, shiftType, otHours: otHours ?? null, note: note ?? null })
      .returning();
    row = inserted[0];
  }

  return res.status(existing.length > 0 ? 200 : 201).json({
    id: row.id,
    workDate: row.workDate,
    shiftType: row.shiftType,
    otHours: row.otHours,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/by-date", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ error: "date query param required" });

  await db
    .delete(shiftsTable)
    .where(and(eq(shiftsTable.userId, userId), eq(shiftsTable.workDate, date)));

  return res.status(204).send();
});

export default router;
