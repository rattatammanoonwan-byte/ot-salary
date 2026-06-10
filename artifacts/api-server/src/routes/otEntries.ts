import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, otEntriesTable, salarySettingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function calcOtPay(
  hours: number,
  otType: string,
  baseSalary: number,
  hoursPerDay: number,
  workingDaysPerMonth: number,
  otRate: number,
): number {
  const hourlyRate = baseSalary / (workingDaysPerMonth * hoursPerDay);
  let multiplier = otRate;
  if (otType === "holiday") multiplier = otRate * 2;
  else if (otType === "weekend") multiplier = otRate * 1.5;
  return parseFloat((hourlyRate * multiplier * hours).toFixed(2));
}

router.get("/", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { month } = req.query as { month?: string };

  let query = db
    .select()
    .from(otEntriesTable)
    .where(eq(otEntriesTable.userId, userId))
    .$dynamic();

  if (month) {
    query = query.where(
      and(
        eq(otEntriesTable.userId, userId),
        sql`to_char(${otEntriesTable.date}::date, 'YYYY-MM') = ${month}`,
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

router.post("/", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const schema = z.object({
    date: z.string(),
    hours: z.number().positive(),
    otType: z.enum(["weekday", "weekend", "holiday"]),
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
    otPay = calcOtPay(hours, otType, s.baseSalary, s.hoursPerDay, s.workingDaysPerMonth, s.otRate);
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

router.get("/:id", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

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

router.patch("/:id", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    date: z.string().optional(),
    hours: z.number().positive().optional(),
    otType: z.enum(["weekday", "weekend", "holiday"]).optional(),
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

router.delete("/:id", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .delete(otEntriesTable)
    .where(and(eq(otEntriesTable.id, id), eq(otEntriesTable.userId, userId)));

  return res.status(204).send();
});

export default router;
