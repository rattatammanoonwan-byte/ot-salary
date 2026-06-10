import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, salarySettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const settingsInputSchema = z.object({
  baseSalary: z.number().positive(),
  otRate: z.number().positive(),
  hoursPerDay: z.number().positive(),
  workingDaysPerMonth: z.number().positive(),
});

router.get("/", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return res.status(404).json({ error: "Settings not found" });
  }

  const s = rows[0];
  return res.json({
    id: s.id,
    userId: s.userId,
    baseSalary: s.baseSalary,
    otRate: s.otRate,
    hoursPerDay: s.hoursPerDay,
    workingDaysPerMonth: s.workingDaysPerMonth,
    updatedAt: s.updatedAt.toISOString(),
  });
});

router.put("/", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = settingsInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { baseSalary, otRate, hoursPerDay, workingDaysPerMonth } = parsed.data;

  const existing = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  let row;
  if (existing.length > 0) {
    const updated = await db
      .update(salarySettingsTable)
      .set({ baseSalary, otRate, hoursPerDay, workingDaysPerMonth, updatedAt: new Date() })
      .where(eq(salarySettingsTable.userId, userId))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(salarySettingsTable)
      .values({ userId, baseSalary, otRate, hoursPerDay, workingDaysPerMonth, updatedAt: new Date() })
      .returning();
    row = inserted[0];
  }

  return res.json({
    id: row.id,
    userId: row.userId,
    baseSalary: row.baseSalary,
    otRate: row.otRate,
    hoursPerDay: row.hoursPerDay,
    workingDaysPerMonth: row.workingDaysPerMonth,
    updatedAt: row.updatedAt.toISOString(),
  });
});

export default router;
