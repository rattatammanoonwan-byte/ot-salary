import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, otEntriesTable, salarySettingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

/**
 * OT types:
 *   D / N                      → regular OT: hours × 1.5 × (salary/30/8)
 *   NS / DS / NH / DH          → special holiday:
 *                                  first 8h × 1.0 × rate + remaining × 3.0 × rate
 *   weekday / weekend / holiday → legacy, treated as regular (× 1.5)
 */
const SPECIAL_OT_TYPES = ["NS", "DS", "NH", "DH"];

function calcOtPay(hours: number, otType: string, baseSalary: number): number {
  const rate = baseSalary / 30 / 8;
  if (SPECIAL_OT_TYPES.includes(otType)) {
    const base8  = Math.min(hours, 8) * 1.0 * rate;
    const extra  = Math.max(0, hours - 8) * 3.0 * rate;
    return parseFloat((base8 + extra).toFixed(2));
  }
  return parseFloat((hours * 1.5 * rate).toFixed(2));
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { month } = req.query as { month?: string };

  let query = db
    .select()
    .from(otEntriesTable)
    .where(eq(otEntriesTable.userId, userId))
    .$dynamic();

  if (month) {
    // Pay period: 21st of previous month → 20th of pay month
    const [year, mon] = month.split("-").map(Number);
    let prevYear = year, prevMon = mon - 1;
    if (prevMon === 0) { prevMon = 12; prevYear--; }
    const start = `${prevYear}-${String(prevMon).padStart(2, "0")}-21`;
    const end   = `${year}-${String(mon).padStart(2, "0")}-20`;
    query = query.where(
      and(
        eq(otEntriesTable.userId, userId),
        sql`${otEntriesTable.date}::date >= ${start}::date`,
        sql`${otEntriesTable.date}::date <= ${end}::date`,
      ),
    );
  }

  const rows = await query.orderBy(sql`${otEntriesTable.date} DESC`);

  return res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      hours: r.hours,
      otType: r.otType,
      note: r.note,
      otPay: r.otPay,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);

  const schema = z.object({
    date: z.string(),
    hours: z.number().positive(),
    otType: z.enum(["D", "N", "NS", "DS", "NH", "DH", "weekday", "weekend", "holiday"]),
    note: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { date, hours, otType, note } = parsed.data;

  const settings = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  let otPay = 0;
  if (settings.length > 0) {
    const s = settings[0];
    otPay = calcOtPay(hours, otType, s.baseSalary);
  }

  const inserted = await db
    .insert(otEntriesTable)
    .values({ userId, date, hours, otType, note: note ?? null, otPay })
    .returning();

  const r = inserted[0];
  return res.status(201).json({
    id: r.id,
    userId: r.userId,
    date: r.date,
    hours: r.hours,
    otType: r.otType,
    note: r.note,
    otPay: r.otPay,
    createdAt: r.createdAt.toISOString(),
  });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const rows = await db
    .select()
    .from(otEntriesTable)
    .where(and(eq(otEntriesTable.id, id), eq(otEntriesTable.userId, userId)))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: "Not found" });

  const r = rows[0];
  return res.json({
    id: r.id,
    userId: r.userId,
    date: r.date,
    hours: r.hours,
    otType: r.otType,
    note: r.note,
    otPay: r.otPay,
    createdAt: r.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    date: z.string().optional(),
    hours: z.number().positive().optional(),
    otType: z.enum(["D", "N", "NS", "DS", "NH", "DH", "weekday", "weekend", "holiday"]).optional(),
    note: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const existing = await db
    .select()
    .from(otEntriesTable)
    .where(and(eq(otEntriesTable.id, id), eq(otEntriesTable.userId, userId)))
    .limit(1);

  if (existing.length === 0) return res.status(404).json({ error: "Not found" });

  const current = existing[0];
  const updates = parsed.data;
  const newHours = updates.hours ?? current.hours;
  const newOtType = updates.otType ?? current.otType;

  const settings = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  let otPay = current.otPay;
  if (settings.length > 0) {
    const s = settings[0];
    otPay = calcOtPay(newHours, newOtType, s.baseSalary, s.hoursPerDay, s.workingDaysPerMonth, s.otRate);
  }

  const updated = await db
    .update(otEntriesTable)
    .set({
      ...(updates.date ? { date: updates.date } : {}),
      ...(updates.hours !== undefined ? { hours: updates.hours } : {}),
      ...(updates.otType ? { otType: updates.otType } : {}),
      ...(updates.note !== undefined ? { note: updates.note } : {}),
      otPay,
    })
    .where(and(eq(otEntriesTable.id, id), eq(otEntriesTable.userId, userId)))
    .returning();

  const r = updated[0];
  return res.json({
    id: r.id,
    userId: r.userId,
    date: r.date,
    hours: r.hours,
    otType: r.otType,
    note: r.note,
    otPay: r.otPay,
    createdAt: r.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .delete(otEntriesTable)
    .where(and(eq(otEntriesTable.id, id), eq(otEntriesTable.userId, userId)));

  return res.status(204).send();
});

export default router;
